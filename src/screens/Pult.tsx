import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pause, Play, Coffee, SkipBack, SkipForward, Minus, Plus, Skull, Gift, Flag,
  Coins, Users, Zap, Repeat, Sparkles, Trophy, Hourglass, ChevronRight, AlertTriangle,
} from "lucide-react";
import {
  useDb, Tournament, fmtClock, fmtNum, levelInfo, nextLevelOf, chipsInPlay, lateRegOpen,
  togglePause, stepLevel, addMinute, startBreak, eliminate, returnPlayer, giveBonus,
  finishTournament, ReturnMethod, playSound, plural, capacity,
} from "../lib/db";
import { Avatar, Badge, Btn, Empty, Modal, Reveal, Select, cn, toast } from "../lib/ui";

const RETURN_LABELS: Record<ReturnMethod, string> = { rebuy: "Рибай", reentry: "Ре-энтри", addon: "Адд-он", last_chance: "Ласт Шанс" };

export default function Pult({ preselect }: { preselect?: string }) {
  const s = useDb();
  const nav = useNavigate();
  const [tid, setTid] = useState<string | null>(preselect ?? null);
  const [modal, setModal] = useState<"knock" | "bonus" | "finish" | null>(null);
  const [outUid, setOutUid] = useState(""); const [byUid, setByUid] = useState("");
  const [bonusId, setBonusId] = useState(""); const [bonusUid, setBonusUid] = useState("");

  const candidates = useMemo(
    () => Object.values(s.tournaments).filter((t) => t.status !== "completed").sort((a, b) => Number(b.status === "active") - Number(a.status === "active")),
    [s.tournaments]
  );
  const t: Tournament | undefined = s.tournaments[tid ?? ""] ?? candidates.find((x) => x.status === "active") ?? candidates[0];

  if (!t) {
    return (
      <div className="panel">
        <Empty title="Нет турнира для пульта" icon={<Zap className="size-7" />}
          text="Создайте турнир, зарегистрируйте участников, рассадите их по местам и запустите — пульт появится здесь." />
        <div className="flex justify-center pb-10"><Btn onClick={() => nav("/app/tournaments")}><Trophy className="size-4" /> К турнирам</Btn></div>
      </div>
    );
  }

  const info = levelInfo(t);
  const next = nextLevelOf(t);
  const p = t.pult;
  const running = p.timerStarted && !p.timerPaused && t.status === "active";
  const regOpen = lateRegOpen(t);
  const regLeft = t.registrationDuration * 60 - p.elapsedSeconds;
  const playersIn = Object.values(t.registeredPlayers).filter((r) => !r.isEliminated).length;
  const playersTotal = Object.keys(t.registeredPlayers).length;
  const bank = chipsInPlay(t);
  const activePlayers = Object.entries(t.registeredPlayers).filter(([, r]) => !r.isEliminated);
  const eliminated = Object.entries(p.eliminated).sort((a, b) => b[1].eliminatedAt - a[1].eliminatedAt);
  const totalLevels = t.structure.levels.length;
  const low = running && p.timeRemaining <= 15;

  const doKnock = () => {
    if (!outUid) { toast("Выберите выбывающего игрока", "err"); return; }
    const err = eliminate(t.id, outUid, byUid || null);
    if (err) toast(err, "err"); else { toast("Игрок выбыл из турнира"); setModal(null); setOutUid(""); setByUid(""); }
  };
  const doBonus = () => {
    const err = giveBonus(t.id, bonusId, bonusUid);
    if (err) toast(err, "err"); else { toast("Бонус начислен"); setModal(null); }
  };
  const doReturn = (uidv: string, m: ReturnMethod) => {
    const err = returnPlayer(t.id, uidv, m);
    if (err) toast(err, "err"); else toast(`${RETURN_LABELS[m]}: игрок вернулся в игру`);
  };
  const doFinish = () => { finishTournament(t.id); setModal(null); toast("Турнир завершён — итоги подведены, очки начислены"); nav("/app/tournaments"); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-(--acc)">Пульт управления</p>
          <h1 className="font-display text-[clamp(19px,2.6vw,27px)] font-extrabold leading-tight">«{t.name}»</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="inp !min-h-[42px] !w-auto !py-2 text-[13px] font-bold" value={t.id} onChange={(e) => { setTid(e.target.value); playSound("click"); }}>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.status === "active" ? "● " : ""}{c.name}</option>)}
          </select>
          {t.status === "active" && (regOpen
            ? <Badge tone="warn"><Hourglass className="size-3.5" /> Поздняя рег.: {fmtClock(Math.max(regLeft, 0))}</Badge>
            : <Badge tone="mut">Регистрация завершена</Badge>)}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* ============ TIMER ============ */}
        <Reveal>
          <div className="panel felt stitched relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.12),transparent_55%)]" />
            <div className="relative p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/60">
                  {p.currentBreak ? <Coffee className="size-4 text-[#ffd76a]" /> : <Zap className="size-4 text-[#ffd76a]" />}
                  {p.currentBreak ? "Перерыв" : `Уровень ${info.idx} / ${totalLevels}`}
                </span>
                <span className={cn("rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest",
                  running ? "bg-[#ffd76a]/15 text-[#ffd76a]" : "bg-white/10 text-white/50")}>
                  {running ? "Идёт игра" : p.timerPaused ? "Пауза" : "Остановлен"}
                </span>
              </div>

              <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-around">
                <div className="text-center">
                  <p className={cn("num text-[clamp(64px,9vw,110px)] font-extrabold leading-none text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.5)]", low && "text-[#ff8a8a] blink")}>
                    {fmtClock(p.timeRemaining)}
                  </p>
                  <div className="mx-auto mt-4 h-2 w-[240px] max-w-full overflow-hidden rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-[#ffd76a] transition-all duration-1000 ease-linear"
                      style={{ width: `${(p.timeRemaining / ((p.currentBreak ? (t.structure.breaks.find((b) => b.afterLevel === p.currentLevel)?.duration ?? 10) : info.lv.duration) * 60)) * 100}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
                  {[
                    { l: "МБ", v: p.currentBreak ? "—" : fmtNum(info.lv.sb) },
                    { l: "ББ", v: p.currentBreak ? "—" : fmtNum(info.lv.bb) },
                    { l: "Анте", v: p.currentBreak ? "—" : info.lv.ante ? fmtNum(info.lv.ante) : "—" },
                  ].map((x) => (
                    <div key={x.l} className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3 sm:px-5">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">{x.l}</p>
                      <p className="num mt-1 text-[clamp(22px,3vw,34px)] font-extrabold leading-none text-[#ffd76a]">{x.v}</p>
                    </div>
                  ))}
                  {next && !p.currentBreak && (
                    <p className="col-span-3 pt-1 text-[11.5px] font-bold text-white/45">Далее: {next.sb}/{next.bb}{next.ante ? ` · анте ${next.ante}` : ""} · {next.duration} мин</p>
                  )}
                </div>
              </div>

              {/* controls */}
              <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
                <CtrlBtn label={p.timerPaused ? "Старт" : "Пауза"} icon={p.timerPaused ? <Play className="size-4.5" /> : <Pause className="size-4.5" />} onClick={() => { togglePause(t.id); }} gold />
                <CtrlBtn label="Перерыв" icon={<Coffee className="size-4.5" />} onClick={() => startBreak(t.id)} />
                <CtrlBtn label="Пред. ур." icon={<SkipBack className="size-4.5" />} onClick={() => stepLevel(t.id, -1)} />
                <CtrlBtn label="След. ур." icon={<SkipForward className="size-4.5" />} onClick={() => stepLevel(t.id, 1)} />
                <CtrlBtn label="−1 мин" icon={<Minus className="size-4.5" />} onClick={() => addMinute(t.id, -1)} />
                <CtrlBtn label="+1 мин" icon={<Plus className="size-4.5" />} onClick={() => addMinute(t.id, 1)} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Btn variant="ghost" className="!border-white/15 !bg-black/25 !text-white hover:!bg-black/45" onClick={() => setModal("knock")}><Skull className="size-4.5 text-[#ff8a8a]" /> Выбивание</Btn>
                <Btn variant="ghost" className="!border-white/15 !bg-black/25 !text-white hover:!bg-black/45" onClick={() => setModal("bonus")}><Gift className="size-4.5 text-[#ffd76a]" /> Бонус</Btn>
                <Btn variant="danger" onClick={() => setModal("finish")}><Flag className="size-4.5" /> Завершить турнир</Btn>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ============ RIGHT: bank + live stats ============ */}
        <div className="space-y-4">
          <Reveal delay={80}>
            <div className="panel relative overflow-hidden p-5">
              <div className="absolute -right-8 -top-8 size-32 rounded-full bg-(--acc-soft) blur-3xl" />
              <p className="lbl flex items-center gap-2"><Coins className="size-4 text-(--acc)" /> Банк турнира</p>
              <p className="num mt-1 text-[clamp(26px,3.4vw,40px)] font-extrabold leading-none text-(--acc)">{fmtNum(bank)}</p>
              <p className="mt-1.5 text-[12.5px] font-semibold text-mut">фишек в игре · средний стек {playersIn ? fmtNum(Math.round(bank / playersIn)) : 0}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat icon={<Users className="size-4" />} l="Игроки" v={`${playersIn} / ${playersTotal}`} />
                <MiniStat icon={<Skull className="size-4" />} l="Нокауты" v={String(p.knockouts)} />
                <MiniStat icon={<Repeat className="size-4" />} l="Возвраты" v={String(p.returns)} />
                <MiniStat icon={<Sparkles className="size-4" />} l="Бонусы" v={String(p.bonusesGiven)} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-[12.5px] font-bold">
                <span className="text-mut">Уровень блайндов</span>
                <span className="num text-(--acc)">{p.currentBreak ? "перерыв" : `${info.idx} / ${totalLevels}`}</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="panel p-5">
              <p className="lbl flex items-center gap-2"><Zap className="size-4 text-(--acc)" /> Структура блайндов</p>
              <div className="mt-2 max-h-[300px] space-y-1 overflow-y-auto pr-1">
                {t.structure.levels.map((l) => {
                  const cur = !p.currentBreak && l.level === info.idx;
                  const brk = t.structure.breaks.find((b) => b.afterLevel === l.level);
                  return (
                    <div key={l.level}>
                      <div className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-bold transition-all duration-300",
                        cur ? "bg-(--acc-soft) text-(--acc) ring-1 ring-(--acc-line)" : "text-mut")}>
                        <span className="num w-7 text-[11px] text-dim">{l.level}</span>
                        <span className="num flex-1">{fmtNum(l.sb)} / {fmtNum(l.bb)}</span>
                        <span className="num text-[12px] text-dim">{l.ante ? `анте ${fmtNum(l.ante)}` : ""}</span>
                        <span className="num text-[12px]">{l.duration} мин</span>
                      </div>
                      {brk && (
                        <div className={cn("mx-3 my-1 flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-[12px] font-bold",
                          p.currentBreak && p.currentLevel === l.level ? "border-[#ffd76a]/50 text-[#ffd76a]" : "border-line text-dim")}>
                          <Coffee className="size-3.5" /> Перерыв · {brk.duration} мин
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ============ ELIMINATED ============ */}
      <Reveal className="mt-4">
        <div className="panel p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="lbl !mb-0 flex items-center gap-2"><Skull className="size-4 text-bad" /> Выбывшие участники ({eliminated.length})</p>
            {regOpen
              ? <Badge tone="warn">возврат в игру доступен {fmtClock(Math.max(regLeft, 0))}</Badge>
              : <Badge tone="bad">регистрация завершена — возвраты недоступны</Badge>}
          </div>
          {eliminated.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] font-semibold text-dim">Пока никто не выбыл — все {playersIn} игроков в игре</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {eliminated.map(([uidv, e]) => {
                const u = s.users[uidv];
                const reg = t.registeredPlayers[uidv];
                const returned = reg && !reg.isEliminated;
                return (
                  <div key={uidv} className={cn("panel-deep p-4", returned && "opacity-90")}>
                    <div className="flex items-center gap-3">
                      <Avatar user={u} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[13.5px] font-bold">{u?.nickname ?? "—"}
                          {reg?.playerNumber && <span className="num ml-1.5 text-[11.5px] text-dim">#{reg.playerNumber}</span>}
                        </p>
                        <p className="truncate text-[11.5px] font-semibold text-dim">
                          выбит: <span className="text-mut">{e.knockedBy ? s.users[e.knockedBy]?.nickname ?? "—" : "без нокаута"}</span> · {new Date(e.eliminatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {returned
                        ? <Badge tone="ok">в игре · {e.returnMethod ? RETURN_LABELS[e.returnMethod] : ""}</Badge>
                        : <Badge tone="bad">выбыл</Badge>}
                    </div>
                    {!returned && (
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {(Object.keys(RETURN_LABELS) as ReturnMethod[]).map((m) => (
                          <button key={m} disabled={!regOpen} onClick={() => doReturn(uidv, m)}
                            className={cn("rounded-lg border border-line bg-white/[0.04] px-2 py-2 text-[11.5px] font-extrabold text-mut transition hover:border-(--acc-line) hover:text-(--acc)",
                              !regOpen && "opacity-35 pointer-events-none")}>
                            {RETURN_LABELS[m]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      {/* ============ MODALS ============ */}
      <Modal open={modal === "knock"} onClose={() => setModal(null)} title="Выбивание игрока" subtitle="Фишки выбывшего переходят победителю раздач">
        <div className="space-y-4">
          <Select label="Кто выбыл" value={outUid} onChange={setOutUid} placeholder="— выберите игрока —"
            options={activePlayers.map(([uidv]) => ({ v: uidv, l: `${s.users[uidv]?.nickname} · ${fmtNum(t.registeredPlayers[uidv].chips)} фишек` }))} />
          <Select label="Кто выбил (нокаут)" value={byUid} onChange={setByUid} placeholder="— без нокаута —"
            options={activePlayers.filter(([uidv]) => uidv !== outUid).map(([uidv]) => ({ v: uidv, l: s.users[uidv]?.nickname ?? uidv }))} />
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setModal(null)}>Отмена</Btn>
            <Btn variant="danger" onClick={doKnock}><Skull className="size-4" /> Выбить из турнира</Btn></div>
        </div>
      </Modal>
      <Modal open={modal === "bonus"} onClose={() => setModal(null)} title="Начислить бонус" subtitle="Фишки сразу добавляются к стеку игрока">
        <div className="space-y-4">
          <Select label="Бонус" value={bonusId} onChange={setBonusId} placeholder="— выберите бонус —"
            options={t.bonuses.map((b) => ({ v: b.id, l: `${b.name} · ${fmtNum(b.chips)} фишек` }))} />
          <Select label="Участник" value={bonusUid} onChange={setBonusUid} placeholder="— выберите игрока —"
            options={activePlayers.map(([uidv]) => ({ v: uidv, l: s.users[uidv]?.nickname ?? uidv }))} />
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setModal(null)}>Отмена</Btn>
            <Btn onClick={doBonus}><Gift className="size-4" /> Выдать бонус</Btn></div>
        </div>
      </Modal>
      <Modal open={modal === "finish"} onClose={() => setModal(null)} title="Завершить турнир?" w="max-w-xl"
        subtitle="Итоги подводятся автоматически по текущим стекам">
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-warn/30 bg-warn/10 p-4 text-[13px] font-semibold leading-relaxed text-warn">
            <AlertTriangle className="size-5 shrink-0" />
            <span>Оставшиеся {playersIn} {plural(playersIn, "игрок", "игрока", "игроков")} будут распределены по местам согласно стекам, выбывшие — по времени вылета. Очки, статистика, достижения и уведомления начислятся автоматически.</span>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-4 text-[13px] font-semibold text-mut">
            Таблица очков: 1 место — {t.pointsTable["1"] ?? "—"} · 2 — {t.pointsTable["2"] ?? "—"} · 3 — {t.pointsTable["3"] ?? "—"} · участие — {t.pointsTable["participation"] ?? "—"}
            {t.pointsForKnockout && <> · нокаут +5 очков</>}
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Отмена</Btn>
            <Btn variant="danger" onClick={doFinish}><Flag className="size-4" /> Подвести итоги</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CtrlBtn({ label, icon, onClick, gold }: { label: string; icon: React.ReactNode; onClick: () => void; gold?: boolean }) {
  return (
    <button onClick={onClick}
      className={cn("flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-200 active:scale-95",
        gold ? "border-[#ffd76a]/40 bg-[#ffd76a]/15 text-[#ffd76a] hover:bg-[#ffd76a]/25" : "border-white/12 bg-black/25 text-white/85 hover:bg-black/45 hover:border-white/25")}>
      {icon}{label}
    </button>
  );
}
function MiniStat({ icon, l, v }: { icon: React.ReactNode; l: string; v: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3.5 py-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-dim">{icon}{l}</span>
      <p className="num mt-0.5 text-[17px] font-extrabold">{v}</p>
    </div>
  );
}
