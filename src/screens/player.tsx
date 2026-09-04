import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil, Trophy, Target, Star, Medal, Crown, Zap, Gauge, Award, Users, CalendarDays,
  BellRing, Megaphone, UserCircle2, CheckCheck, Undo2, Timer, Coins, Repeat, Camera, Trash2,
} from "lucide-react";
import {
  useFirebaseData
} from "../lib/useFirebaseData";
import { useAuth } from "../lib/useAuth";
import {
  fmtDate, fmtDateShort, fmtNum, plural, capacity, lateRegOpen, Tournament, User,
  computeSeasonRating,
} from "../lib/db";
import {
  registerSelf, cancelSelf, updateProfile, markAllRead, markRead,
} from "../lib/firebaseDb";
import { Avatar, Badge, Bars, Btn, Empty, Field, Modal, Reveal, SectionTitle, StatTile, StatusBadge, cn, toast, AchIcon, fileToAvatar } from "../lib/ui";

const HUES = [152, 205, 260, 340, 25, 190, 300, 90, 220, 45, 170, 355];

function placeTone(p: number) {
  if (p === 1) return "text-[#ffd76a]";
  if (p === 2) return "text-[#c9d4e5]";
  if (p === 3) return "text-[#d9915b]";
  return "text-mut";
}

/* ============================== ГЛАВНАЯ ============================== */
export default function PlayerHome() {
  const { users, tournaments, seasons } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const nav = useNavigate();
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nickname: "", firstName: "", lastName: "", phone: "", email: "", hue: 152, avatar: "" });
  
  const me = firebaseUser ? users[firebaseUser.uid] : null;
  if (!me) return null;

  const rating = Object.values(users).filter((u) => !u.isArchived).sort((a, b) => b.stats.points - a.stats.points);
  const myPlace = rating.findIndex((u) => u.uid === me.uid) + 1;
  const activeT =
    Object.values(tournaments).find((t) => t.status === "active" && t.registeredPlayers[me.uid]) ??
    Object.values(tournaments).find((t) => t.status === "active" && !t.isFinal);
  const myReg = activeT?.registeredPlayers[me.uid];
  const planned = Object.values(tournaments).filter((t) => t.status === "planned" && t.registeredPlayers[me.uid]);
  const hist = Object.entries(me.tournamentHistory || {}).sort((a, b) => b[1].date - a[1].date).slice(0, 4);

  const openEdit = () => {
    setForm({ 
      nickname: me.nickname, 
      firstName: me.firstName, 
      lastName: me.lastName, 
      phone: me.phone, 
      email: me.email, 
      hue: me.hue, 
      avatar: me.avatar ?? "" 
    });
    setEdit(true);
  };
  
  const saveEdit = async () => {
    if (!form.nickname.trim() || !form.firstName.trim()) { toast("Никнейм и имя обязательны", "err"); return; }
    setLoading(true);
    try {
      await updateProfile(me.uid, { ...form, avatar: form.avatar || undefined });
      setEdit(false);
      toast("Профиль обновлён");
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle kicker="Личный кабинет" title={`Добро пожаловать, ${me.nickname}!`}
        right={<Btn variant="ghost" size="sm" onClick={openEdit}><Pencil className="size-4" /> Редактировать</Btn>} />

      {activeT && myReg && (
        <Reveal>
          <div className="panel felt stitched relative mb-6 flex flex-wrap items-center gap-4 overflow-hidden px-5 py-5">
            <span className="relative inline-block size-2.5 rounded-full bg-[#ffd76a] live-dot text-[#ffd76a]" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] font-extrabold text-white">«{activeT.name}» идёт прямо сейчас</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white/65">
                {myReg.isEliminated ? "Вы выбыли — доступен возврат через пульт" : 
                 myReg.seatCode ? `Ваше место: ${myReg.seatCode} · фишки: ${fmtNum(myReg.chips)}` : 
                 "Вы записаны, ожидаете рассадки"}
              </p>
            </div>
            <a href={`#/screen/main/${activeT.id}`} className="rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-black/50">
              ТВ-экран турнира →
            </a>
          </div>
        </Reveal>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* profile */}
        <Reveal>
          <div className="panel relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 size-36 rounded-full bg-(--acc-soft) blur-3xl" />
            <div className="relative flex flex-col items-center text-center">
              <Avatar user={me} size={92} ring />
              <h2 className="mt-3 font-display text-[19px] font-extrabold">{me.nickname}</h2>
              <p className="text-[13.5px] font-semibold text-mut">{me.firstName} {me.lastName}</p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                <Badge tone="acc">{me.role === "admin" ? "Администратор" : me.role === "operator" ? "Оператор" : "Игрок"}</Badge>
                <Badge tone="mut">в клубе с {fmtDate(me.registrationDate)}</Badge>
              </div>
              <div className="mt-5 grid w-full grid-cols-3 gap-2 border-t border-line pt-5">
                {[
                  { v: myPlace || "—", l: "место в клубе" },
                  { v: fmtNum(me.stats.points), l: "очков" },
                  { v: me.stats.wins, l: plural(me.stats.wins, "победа", "победы", "побед") },
                ].map((x, i) => (
                  <div key={i}>
                    <p className="num text-[20px] font-extrabold text-(--acc)">{x.v}</p>
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-dim">{x.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="space-y-4">
          {/* quick stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Турниров" value={me.stats.totalTournaments} icon={<Trophy className="size-4" />} delay={40} />
            <StatTile label="Топ-3" value={me.stats.top3} icon={<Medal className="size-4" />} delay={90} />
            <StatTile label="Финалки" value={me.stats.finalTables} icon={<Star className="size-4" />} delay={140} />
            <StatTile label="Нокауты" value={me.stats.knockouts} icon={<Target className="size-4" />} delay={190} />
          </div>

          {/* upcoming + recent */}
          <div className="grid gap-4 md:grid-cols-2">
            <Reveal delay={120} className="h-full">
              <div className="panel h-full p-5">
                <p className="lbl !mb-3 flex items-center gap-2"><CalendarDays className="size-4 text-(--acc)" /> Мои предстоящие</p>
                {planned.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-dim">Записей на будущие турниры нет</p>
                ) : planned.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold">{t.name}</p>
                      <p className="text-[12px] text-dim">{fmtDate(t.startDate)} · {t.startTime}</p>
                    </div>
                    <button onClick={() => nav("/app/tournaments")} className="text-[12px] font-extrabold text-(--acc) hover:underline">детали →</button>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={180} className="h-full">
              <div className="panel h-full p-5">
                <p className="lbl !mb-3 flex items-center gap-2"><Trophy className="size-4 text-(--acc)" /> Последние результаты</p>
                {hist.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-dim">Вы ещё не сыграли ни одного турнира</p>
                ) : hist.map(([tid, h]) => (
                  <div key={tid} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                    <span className={cn("num w-10 shrink-0 text-center font-display text-[17px] font-extrabold", placeTone(h.place))}>#{h.place}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{tournaments[tid]?.name ?? "Турнир"}</p>
                      <p className="text-[12px] text-dim">{fmtDateShort(h.date)} · {h.knockouts} {plural(h.knockouts, "нокаут", "нокаута", "нокаутов")}</p>
                    </div>
                    <span className="num text-[14px] font-extrabold text-(--acc)">+{h.points}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* edit modal */}
      <Modal open={edit} onClose={() => setEdit(false)} title="Редактировать профиль" subtitle="Данные видны всем участникам клуба">
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-white/[0.025] p-4">
            <Avatar user={{ ...me, nickname: form.nickname, firstName: form.firstName, lastName: form.lastName, hue: form.hue, avatar: form.avatar || undefined }} size={64} ring />
            <div className="min-w-0 flex-1">
              <p className="lbl !mb-2">Фото профиля</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-(--acc-line)/60 bg-(--acc-soft) px-3.5 text-[12.5px] font-extrabold text-(--acc) transition hover:brightness-125">
                  <Camera className="size-4" /> Загрузить фото
                  <input type="file" accept="image/*" className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; 
                      e.target.value = "";
                      if (!f) return;
                      try { 
                        const url = await fileToAvatar(f); 
                        setForm((p) => ({ ...p, avatar: url })); 
                        toast("Фото загружено — нажмите «Сохранить»"); 
                      } catch { 
                        toast("Не удалось прочитать изображение", "err"); 
                      }
                    }} />
                </label>
                {form.avatar && (
                  <Btn variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, avatar: "" }))}><Trash2 className="size-4" /> Удалить фото</Btn>
                )}
              </div>
              <p className="mt-1.5 text-[11.5px] font-semibold text-dim">JPG или PNG — изображение сжимается автоматически. Без фото используются инициалы.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Никнейм"><input className="inp" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></Field>
            <Field label="Телефон"><input className="inp" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Имя"><input className="inp" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Фамилия"><input className="inp" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          </div>
          <Field label="E-mail"><input className="inp" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Цвет аватара">
            <div className="flex flex-wrap gap-2 pt-1">
              {HUES.map((h) => (
                <button key={h} onClick={() => setForm({ ...form, hue: h })}
                  className={cn("size-8 rounded-full transition-transform hover:scale-110", form.hue === h && "ring-2 ring-white ring-offset-2 ring-offset-bg1 scale-110")}
                  style={{ background: `linear-gradient(140deg, hsl(${h} 55% 46%), hsl(${h + 40} 60% 26%))` }} />
              ))}
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setEdit(false)}>Отмена</Btn>
            <Btn onClick={saveEdit} disabled={loading}>Сохранить</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
/* ============================== ТУРНИРЫ ============================== */
export function PlayerTournaments() {
  const { users, tournaments, seasons } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const me = firebaseUser ? users[firebaseUser.uid] : null;
  if (!me) return null;
  
  const open = Object.values(tournaments)
    .filter((t) => t.status !== "completed")
    .filter((t) => !(t.isFinal && !t.registeredPlayers[firebaseUser!.uid]))
    .sort((a, b) => a.startDate - b.startDate);
  
  const hist = Object.entries(me.tournamentHistory || {}).sort((a, b) => b[1].date - a[1].date);

  const onReg = async (t: Tournament) => {
    setLoading(true);
    try {
      const err = await registerSelf(t.id, firebaseUser!.uid);
      if (err) toast(err, "err"); 
      else toast(`Вы записаны на «${t.name}»`);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };
  
  const onUnreg = async (t: Tournament) => {
    setLoading(true);
    try {
      await cancelSelf(t.id, firebaseUser!.uid); 
      toast(`Запись на «${t.name}» отменена`, "info");
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle kicker="Игровой календарь" title="Турниры" right={<Badge tone="mut">{open.length} {plural(open.length, "открыт", "открыто", "открыто")}</Badge>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {open.map((t, i) => {
          const reg = t.registeredPlayers[firebaseUser!.uid];
          const cap = capacity(t);
          const cnt = Object.keys(t.registeredPlayers).length;
          const regOpen = lateRegOpen(t);
          return (
            <Reveal key={t.id} delay={i * 60} className="h-full">
              <div className="panel group flex h-full flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={t.status} />
                  {!regOpen && t.status === "active" && <Badge tone="bad">Регистрация закрыта</Badge>}
                </div>
                <h3 className="mt-3 font-display text-[16.5px] font-extrabold leading-snug">{t.name}</h3>
                <p className="mt-1 text-[12.5px] text-mut">{seasons[t.seasonId]?.name ?? "Вне сезона"}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[12.5px] font-semibold text-mut">
                  <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-(--acc)" /> {fmtDate(t.startDate)}, {t.startTime}</span>
                  <span className="flex items-center gap-1.5"><Coins className="size-4 text-(--acc)" /> стек {fmtNum(t.startingStack)}</span>
                  <span className="flex items-center gap-1.5"><Timer className="size-4 text-(--acc)" /> поздняя рег. {t.registrationDuration} мин</span>
                  <span className="flex items-center gap-1.5"><Users className="size-4 text-(--acc)" /> {cnt} / {cap} мест</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-(--acc) transition-all duration-700" style={{ width: `${Math.min((cnt / cap) * 100, 100)}%` }} />
                </div>
                {t.description && <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-dim">{t.description}</p>}
                <div className="mt-auto pt-4">
                  {reg ? (
                    <div className="flex gap-2">
                      <Btn variant="soft" size="sm" className="flex-1" disabled>
                        <CheckCheck className="size-4" /> {reg.seatCode ? `Место ${reg.seatCode}` : "Вы записаны"}
                      </Btn>
                      {t.status !== "active" && <Btn variant="dark" size="sm" onClick={() => onUnreg(t)} disabled={loading}><Undo2 className="size-4" /></Btn>}
                    </div>
                  ) : (
                    <Btn className="w-full" size="sm" disabled={!regOpen || cnt >= cap || loading} onClick={() => onReg(t)}>Записаться</Btn>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-[17px] font-bold"><Trophy className="size-5 text-(--acc)" /> История выступлений</h2>
        {hist.length === 0 ? (
          <div className="panel"><Empty title="Пока нет сыгранных турниров" text="Запишитесь на ближайший турнир — после завершения здесь появится результат." /></div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="tbl min-w-[640px]">
              <thead><tr><th>Место</th><th>Турнир</th><th>Дата</th><th>Очки</th><th>Нокауты</th><th>Ребаи</th></tr></thead>
              <tbody>
                {hist.map(([tid, h]) => (
                  <tr key={tid}>
                    <td><span className={cn("num font-display text-[16px] font-extrabold", placeTone(h.place))}>#{h.place}</span></td>
                    <td className="font-bold">{tournaments[tid]?.name ?? "—"}</td>
                    <td className="text-mut">{fmtDate(h.date)}</td>
                    <td className="num font-extrabold text-(--acc)">+{h.points}</td>
                    <td className="num text-mut">{h.knockouts}</td>
                    <td className="num text-mut">{h.rebuy + h.addon + h.reentry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Reveal>
    </div>
  );
}

/* ============================== СТАТИСТИКА ============================== */
export function PlayerStats() {
  const { users, tournaments, seasons } = useFirebaseData();
  const { firebaseUser } = useAuth();
  
  const me = firebaseUser ? users[firebaseUser.uid] : null;
  if (!me) return null;
  
  const stt = me.stats;
  const hist = Object.entries(me.tournamentHistory || {}).sort((a, b) => a[1].date - b[1].date).slice(-10);
  const bars = hist.map(([, h]) => ({ label: fmtDateShort(h.date), value: h.points, hint: `${h.place} место` }));

  return (
    <div>
      <SectionTitle kicker="Карьера в клубе" title="Статистика" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Турниров" value={stt.totalTournaments} icon={<Trophy className="size-4" />} />
        <StatTile label="Побед" value={stt.wins} icon={<Crown className="size-4" />} delay={40} />
        <StatTile label="Топ-3" value={stt.top3} icon={<Medal className="size-4" />} delay={80} />
        <StatTile label="Финальных столов" value={stt.finalTables} icon={<Star className="size-4" />} delay={120} />
        <StatTile label="Нокаутов" value={stt.knockouts} icon={<Target className="size-4" />} delay={160} />
        <StatTile label="Докупов" value={stt.rebuy + stt.addon} icon={<Coins className="size-4" />} delay={200} />
        <StatTile label="Лучший результат" value={`${stt.bestScore} очк.`} icon={<Award className="size-4" />} delay={240} />
        <StatTile label="Среднее место" value={stt.avgPlace || "—"} icon={<Gauge className="size-4" />} delay={280} />
        <StatTile label="Лучшее место" value={stt.bestPlace ? `#${stt.bestPlace}` : "—"} icon={<Zap className="size-4" />} delay={320} />
        <StatTile label="Ребаев и адд-онов" value={`${stt.rebuy} / ${stt.addon}`} sub={`ре-энтри: ${stt.reentry}`} icon={<Repeat className="size-4" />} delay={360} />
      </div>
      <Reveal className="mt-6">
        <div className="panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold">Последние турниры — очки</h3>
            <Badge tone="acc">{hist.length} {plural(hist.length, "турнир", "турнира", "турниров")}</Badge>
          </div>
          {hist.length === 0
            ? <Empty title="Диаграмма появится после первого турнира" icon={<Trophy className="size-7" />} />
            : <Bars data={bars} height={170} />}
        </div>
      </Reveal>
      <p className="mt-3 text-[12px] font-semibold text-dim">
        Всего очков за карьеру: <b className="num text-(--acc)">{fmtNum(stt.points)}</b> · сыграно в сезоне: {fmtNum(Object.values(seasons).find((x) => x.isActive) ? hist.length : hist.length)}
      </p>
    </div>
  );
}
/* ============================== ДОСТИЖЕНИЯ ============================== */
export function PlayerAchievements() {
  const { users, achievements } = useFirebaseData();
  const { firebaseUser } = useAuth();
  
  const me = firebaseUser ? users[firebaseUser.uid] : null;
  if (!me) return null;
  
  const achs = Object.values(achievements).sort((a, b) => a.createdAt - b.createdAt);
  const earned = achs.filter((a) => me.achievements?.[a.id]);
  const locked = achs.filter((a) => !me.achievements?.[a.id]);
  
  const metricLabel: Record<string, string> = {
    totalTournaments: "сыграно турниров", wins: "побед", top3: "попаданий в топ-3", finalTables: "финальных столов",
    knockouts: "выбито игроков", rebuyAddon: "ребаев и адд-онов", reentry: "ре-энтри", bestScore: "лучший результат",
  };
  const metricVal: Record<string, number> = {
    totalTournaments: me.stats.totalTournaments, wins: me.stats.wins, top3: me.stats.top3, finalTables: me.stats.finalTables,
    knockouts: me.stats.knockouts, rebuyAddon: me.stats.rebuy + me.stats.addon, reentry: me.stats.reentry, bestScore: me.stats.bestScore,
  };

  return (
    <div>
      <SectionTitle kicker="Витрина наград" title="Достижения"
        right={<Badge tone="acc">{earned.length} / {achs.length}</Badge>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {earned.map((a, i) => (
          <Reveal key={a.id} delay={i * 50} className="h-full">
            <div className="panel group relative h-full overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1">
              <div className="absolute -right-8 -top-8 size-28 rounded-full bg-(--acc-soft) blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--acc-soft) text-(--acc) ring-1 ring-(--acc-line) shadow-[0_0_28px_-6px_var(--acc)]">
                  <AchIcon name={a.icon} className="size-7" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[14.5px] font-extrabold">{a.name}</h3>
                  <p className="mt-1 text-[12.5px] leading-snug text-mut">{a.description}</p>
                  <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wider text-(--acc)">Получено {fmtDate(me.achievements?.[a.id]?.earnedAt || Date.now())}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
        {locked.map((a, i) => {
          const cur = metricVal[a.conditionType] ?? 0;
          const pct = Math.min((cur / a.threshold) * 100, 100);
          return (
            <Reveal key={a.id} delay={i * 50} className="h-full">
              <div className="panel h-full p-5 opacity-80">
                <div className="flex items-start gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-dashed border-line bg-white/[0.03] text-dim">
                    <AchIcon name={a.icon} className="size-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[14.5px] font-extrabold text-mut">{a.name}</h3>
                    <p className="mt-1 text-[12.5px] leading-snug text-dim">{a.description}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-dim transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] font-bold text-dim">{metricLabel[a.conditionType]}: <span className="num text-mut">{cur}</span> / {a.threshold}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== РЕЙТИНГ ============================== */
export function PlayerRating() {
  const { users, tournaments, seasons, loading } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const [mode, setMode] = useState<"season" | "all">("season");
  
  const seasonsList = seasons ? Object.values(seasons).sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.startDate - a.startDate) : [];
  const activeSeason = seasonsList.find((x) => x.isActive);
  const [sid, setSid] = useState(activeSeason?.id ?? seasonsList[0]?.id ?? "");
  
  if (loading || !users) return null;
  
  const me = firebaseUser ? users[firebaseUser.uid] : null;
  if (!me) return null;

  const rows = useMemo(() => {
    if (!users || Object.keys(users).length === 0) return [];
    if (mode === "all") {
      return Object.values(users).filter((u) => !u.isArchived).sort((a, b) => b.stats.points - a.stats.points)
        .map((u, i) => ({ uid: u.uid, place: i + 1, points: u.stats.points, games: u.stats.totalTournaments, wins: u.stats.wins }));
    }
    const rating = computeSeasonRating(users, tournaments, sid);
    return rating.map((r, i) => ({ uid: r.uid, place: i + 1, points: r.points, games: r.games, wins: r.wins }));
  }, [mode, sid, users, tournaments]);

  return (
    <div>
      <SectionTitle kicker="Таблица лидеров" title="Рейтинг клуба"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {mode === "season" && (
              <select className="inp !min-h-[40px] !w-auto !py-1.5 text-[13px]" value={sid} onChange={(e) => setSid(e.target.value)}>
                {seasonsList.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            )}
            <div className="flex rounded-xl border border-line bg-white/[0.03] p-1">
              {([["season", "Сезон"], ["all", "Все время"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setMode(k)}
                  className={cn("rounded-lg px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-wide transition", mode === k ? "bg-(--acc) text-(--acc-ink)" : "text-mut hover:text-ink")}>{l}</button>
              ))}
            </div>
          </div>
        } />
      <div className="panel overflow-hidden">
        {rows.length === 0 && <Empty title="В этом сезоне ещё нет результатов" />}
        {rows.map((r, i) => {
          const u: User | undefined = users[r.uid];
          if (!u) return null;
          const isMe = r.uid === me.uid;
          return (
            <div key={r.uid} className={cn("flex items-center gap-3.5 border-b border-line px-4 py-3 transition-colors last:border-0 sm:px-5", isMe ? "bg-(--acc-soft)" : "hover:bg-white/[0.03]")}>
              <span className={cn("num w-10 shrink-0 text-center font-display text-[17px] font-extrabold", r.place === 1 ? "text-[#ffd76a]" : r.place === 2 ? "text-[#c9d4e5]" : r.place === 3 ? "text-[#d9915b]" : "text-dim")}>
                {r.place}
              </span>
              <Avatar user={u} size={44} ring={r.place <= 3} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-display text-[14px] font-bold">
                  {u.nickname} {isMe && <Badge tone="acc">вы</Badge>}
                </p>
                <p className="text-[12px] font-semibold text-dim">{r.games} {plural(r.games, "игра", "игры", "игр")} · {r.wins} {plural(r.wins, "победа", "победы", "побед")}</p>
              </div>
              <span className="num text-[19px] font-extrabold text-(--acc)">{fmtNum(r.points)}</span>
              <span className="hidden text-[10.5px] font-bold uppercase tracking-wider text-dim sm:block">очков</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== УВЕДОМЛЕНИЯ ============================== */
export function PlayerNotifs() {
  const { users } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const me = firebaseUser ? users[firebaseUser.uid] : null;
  if (!me) return null;
  
  const list = Object.values(me.notifications || {}).sort((a, b) => b.timestamp - a.timestamp);
  const unread = list.filter((n) => !n.read).length;
  const iconOf = (t: string) =>
    t === "club" ? <Megaphone className="size-4.5" /> : t === "tournament" ? <Trophy className="size-4.5" /> : <UserCircle2 className="size-4.5" />;

  return (
    <div>
      <SectionTitle kicker="Оповещения" title="Уведомления"
        right={unread > 0 ? 
          <Btn variant="soft" size="sm" onClick={async () => { 
            setLoading(true);
            try {
              await markAllRead(me.uid); 
              toast("Все уведомления прочитаны"); 
            } catch (err: any) {
              toast(err.message || "Ошибка", "err");
            } finally {
              setLoading(false);
            }
          }} disabled={loading}><CheckCheck className="size-4" /> Прочитать все ({unread})</Btn> : 
          <Badge tone="mut"><BellRing className="size-3.5" /> всё прочитано</Badge>
        } />
      {list.length === 0 ? (
        <div className="panel"><Empty title="Уведомлений пока нет" text="Здесь появятся оповещения клуба, турнирные события и новости аккаунта." icon={<BellRing className="size-7" />} /></div>
      ) : (
        <div className="space-y-2.5">
          {list.map((n, i) => (
            <Reveal key={n.id} delay={Math.min(i * 40, 300)}>
              <button onClick={async () => { 
                setLoading(true);
                try {
                  await markRead(me.uid, n.id); 
                } catch (err: any) {
                  toast(err.message || "Ошибка", "err");
                } finally {
                  setLoading(false);
                }
              }} disabled={loading}
                className={cn("panel flex w-full items-start gap-4 px-4 py-4 text-left transition-all duration-300 hover:border-(--acc-line)/60", !n.read && "border-(--acc-line)/50")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", !n.read ? "bg-(--acc-soft) text-(--acc)" : "bg-white/[0.05] text-dim")}>{iconOf(n.type)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className={cn("font-display text-[13.5px]", !n.read ? "text-ink" : "text-mut")}>{n.title}</b>
                    {!n.read && <span className="size-2 rounded-full bg-(--acc)" />}
                    <Badge tone={n.type === "club" ? "warn" : n.type === "tournament" ? "acc" : "mut"}>{n.type === "club" ? "клуб" : n.type === "tournament" ? "турнир" : "аккаунт"}</Badge>
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-mut">{n.message}</span>
                  <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-wider text-dim">{fmtDate(n.timestamp)} · {new Date(n.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}