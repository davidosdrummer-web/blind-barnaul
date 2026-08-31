import { ReactNode, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Maximize, Minimize, Timer, Coins, Users, Skull, Crown } from "lucide-react";
import {
  useDb, Root, fmtClock, fmtNum, levelInfo, nextLevelOf, chipsInPlay, computeSeasonRating,
  fmtDate, plural,
} from "../lib/db";
import { Avatar, Confetti, Marquee, Suit, cn } from "../lib/ui";

function useFullscreen() {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  return {
    fs,
    toggle: () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    },
  };
}

function TvFrame({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const s = useDb();
  const { fs, toggle } = useFullscreen();
  const [nowT, setNowT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNowT(new Date()), 1000); return () => clearInterval(i); }, []);
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-5%,var(--acc-soft),transparent_60%)]" />
      <header className="relative z-10 flex items-center gap-4 px-6 py-5 lg:px-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-(--acc-soft) ring-1 ring-(--acc-line)">
          <Suit s="spade" className="size-6 text-(--acc)" />
        </span>
        <div>
          <p className="font-display text-[17px] font-extrabold tracking-wide lg:text-[20px]">{s.club.name}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-dim">клуб спортивного покера</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {right}
          <span className="num hidden text-[22px] font-bold text-mut sm:block">
            {nowT.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button onClick={toggle} className="grid size-11 place-items-center rounded-xl border border-line bg-white/[0.04] text-mut transition hover:text-(--acc) hover:border-(--acc-line)">
            {fs ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </header>
      <main className="relative z-10 flex-1 px-6 pb-4 lg:px-10">{children}</main>
      <footer className="relative z-10 border-t border-line bg-black/30 py-3.5 backdrop-blur-sm">
        <div className="text-[15px] font-bold tracking-wide text-mut">
          <Marquee text={s.club.slogan} speed={30} />
        </div>
      </footer>
    </div>
  );
}

function useTournament(fallbackId?: string) {
  const s = useDb();
  const { tid } = useParams();
  const t = s.tournaments[tid ?? ""] ?? (fallbackId && s.tournaments[fallbackId]) ?? Object.values(s.tournaments).find((x) => x.status === "active") ?? Object.values(s.tournaments)[0];
  return { s, t };
}

/* ================================ MAIN SCREEN ================================ */
export function TvMain() {
  const { s, t } = useTournament(s0main());
  if (!t) return <TvFrame><p className="grid h-full place-items-center font-display text-2xl text-mut">Нет турниров</p></TvFrame>;
  const info = levelInfo(t);
  const next = nextLevelOf(t);
  const running = t.pult.timerStarted && !t.pult.timerPaused;
  const left = Object.values(t.registeredPlayers).filter((r) => !r.isEliminated).length;
  const dur = (t.pult.currentBreak ? (t.structure.breaks.find((b) => b.afterLevel === t.pult.currentLevel)?.duration ?? 10) : info.lv.duration) * 60;

  return (
    <TvFrame right={<span className="flex items-center gap-2 rounded-full bg-ok/15 px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-widest text-ok"><span className="relative size-2 rounded-full bg-ok live-dot" />Live</span>}>
      <div className="mx-auto flex h-full max-w-[1500px] flex-col justify-center gap-6 py-4">
        <div className="text-center">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.34em] text-(--acc)">Турнир клуба</p>
          <h1 className="mt-2 font-display text-[clamp(28px,4.5vw,60px)] font-extrabold leading-tight">«{t.name}»</h1>
        </div>
        <div className="grid items-center gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* timer */}
          <div className="panel relative overflow-hidden p-8 text-center lg:p-10">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-(--acc-soft)">
              <div className="h-full bg-(--acc) transition-all duration-1000 ease-linear" style={{ width: `${(t.pult.timeRemaining / dur) * 100}%` }} />
            </div>
            <p className="text-[14px] font-extrabold uppercase tracking-[0.3em] text-mut">
              {t.pult.currentBreak ? "Перерыв" : `Уровень ${info.idx} из ${info.total}`}
            </p>
            <p key={info.idx + String(t.pult.currentBreak)} className={cn("num anim-pop mx-auto mt-3 font-display font-extrabold leading-none", running && t.pult.timeRemaining <= 30 ? "text-bad blink" : "text-ink")}
              style={{ fontSize: "clamp(84px, 11vw, 176px)" }}>
              {fmtClock(t.pult.timeRemaining)}
            </p>
            {next && !t.pult.currentBreak && (
              <p className="mt-4 text-[15px] font-bold text-dim">следующий уровень: {fmtNum(next.sb)}/{fmtNum(next.bb)}{next.ante ? ` · анте ${fmtNum(next.ante)}` : ""} · {next.duration} мин</p>
            )}
          </div>
          {/* blinds + live */}
          <div className="space-y-4">
            <div className="panel-deep grid grid-cols-3 gap-3 p-4">
              {[
                { l: "Малый блайнд", v: t.pult.currentBreak ? "—" : fmtNum(info.lv.sb) },
                { l: "Большой блайнд", v: t.pult.currentBreak ? "—" : fmtNum(info.lv.bb) },
                { l: "Анте", v: t.pult.currentBreak ? "—" : info.lv.ante ? fmtNum(info.lv.ante) : "—" },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl border border-(--acc-line)/40 bg-(--acc-soft) px-3 py-5 text-center">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-mut">{x.l}</p>
                  <p className="num mt-2 font-display text-[clamp(30px,3.4vw,54px)] font-extrabold leading-none text-(--acc)">{x.v}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Coins className="size-5" />, l: "Фишек в игре", v: fmtNum(chipsInPlay(t)) },
                { icon: <Users className="size-5" />, l: "В игре", v: `${left} / ${Object.keys(t.registeredPlayers).length}` },
                { icon: <Skull className="size-5" />, l: "Нокаутов", v: String(t.pult.knockouts) },
              ].map((x) => (
                <div key={x.l} className="panel-deep px-3 py-4 text-center">
                  <span className="mx-auto grid size-9 place-items-center rounded-xl bg-(--acc-soft) text-(--acc)">{x.icon}</span>
                  <p className="num mt-2 text-[clamp(17px,1.8vw,26px)] font-extrabold">{x.v}</p>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-dim">{x.l}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-[13px] font-bold text-dim">старт: {fmtDate(t.startDate)} · поздняя регистрация {t.registrationDuration} мин · стек {fmtNum(t.startingStack)}</p>
          </div>
        </div>
      </div>
    </TvFrame>
  );
}
function s0main() { return undefined; }

/* ================================ FINAL TABLE ================================ */
const SEAT_POS = [
  { x: 50, y: 93 }, { x: 24, y: 85 }, { x: 76, y: 85 },
  { x: 6, y: 62 }, { x: 94, y: 62 }, { x: 6, y: 26 }, { x: 94, y: 26 },
  { x: 30, y: 5 }, { x: 70, y: 5 },
];
export function TvFinal() {
  const { s, t } = useTournament();
  if (!t) return <TvFrame><p className="grid h-full place-items-center font-display text-2xl text-mut">Нет турниров</p></TvFrame>;
  const regs = Object.entries(t.registeredPlayers).filter(([, r]) => !r.isEliminated).sort((a, b) => b[1].chips - a[1].chips);
  const totalLeft = regs.length;
  const isFinal = totalLeft <= t.finalTablePlayers;
  const shown = regs.slice(0, 9);
  const chipLeader = shown[0]?.[0];

  return (
    <TvFrame right={<span className="rounded-full bg-[#ffd76a]/15 px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-widest text-[#ffd76a]">Финальный стол</span>}>
      <div className="flex h-full flex-col justify-center py-2">
        <h1 className="text-center font-display text-[clamp(22px,3.2vw,42px)] font-extrabold">«{t.name}»</h1>
        <p className="mt-1 text-center text-[14px] font-bold uppercase tracking-[0.3em] text-dim">
          {isFinal ? `топ-${t.finalTablePlayers} · битва за титул` : `в игре ${totalLeft} — до финального стола осталось ${totalLeft - t.finalTablePlayers} ${plural(totalLeft - t.finalTablePlayers, "игрок", "игрока", "игроков")}`}
        </p>
        <div className="relative mx-auto mt-4 w-full max-w-[1200px]" style={{ aspectRatio: "16/8.4" }}>
          {/* felt */}
          <div className="felt stitched absolute left-[13%] right-[13%] top-[16%] bottom-[16%] rounded-[50%]">
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <Suit s="spade" className="mx-auto size-10 text-white/25" />
                <p className="num mt-2 text-[clamp(15px,1.6vw,24px)] font-extrabold text-white/80">{fmtNum(chipsInPlay(t))} фишек</p>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/40">в банке турнира</p>
              </div>
            </div>
          </div>
          {SEAT_POS.map((pos, i) => {
            const entry = shown[i];
            const u = entry ? s.users[entry[0]] : null;
            const reg = entry ? entry[1] : null;
            return (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-700" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                {u && reg ? (
                  <div key={entry![0]} className="anim-pop">
                    <div className="relative mx-auto w-fit">
                      <Avatar user={u} size={76} ring />
                      {entry![0] === chipLeader && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#ffd76a] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-black shadow-lg">лидер</span>
                      )}
                      <span className="num absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-(--acc-line) bg-bg0/90 px-2.5 py-0.5 text-[12px] font-extrabold text-(--acc)">{fmtNum(reg.chips)}</span>
                    </div>
                    <p className="mt-2.5 max-w-[150px] truncate font-display text-[clamp(12px,1.25vw,17px)] font-bold">{u.nickname}</p>
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-dim">{reg.seatCode ?? ""}</p>
                  </div>
                ) : (
                  <div className="grid size-[76px] place-items-center rounded-full border border-dashed border-line text-dim">
                    <span className="text-[10px] font-extrabold uppercase">место {i + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TvFrame>
  );
}

/* ================================ RESULTS ================================ */
export function TvResults() {
  const { s, t } = useTournament();
  if (!t || !t.results) return <TvFrame><p className="grid h-full place-items-center font-display text-2xl text-mut">Итоги появятся после завершения турнира</p></TvFrame>;
  const winner = s.users[t.results.winner];
  const top = t.results.ranking.slice(0, 10);

  return (
    <TvFrame right={<span className="rounded-full bg-(--acc-soft) px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-widest text-(--acc)">Итоги турнира</span>}>
      <Confetti count={54} />
      <div className="mx-auto grid h-full max-w-[1400px] items-center gap-8 py-4 lg:grid-cols-[1fr_1.1fr]">
        {/* winner */}
        <div className="text-center">
          <Crown className="mx-auto size-14 text-[#ffd76a] drop-shadow-[0_0_28px_rgba(255,215,106,0.55)]" />
          <p className="mt-3 text-[13px] font-extrabold uppercase tracking-[0.34em] text-[#ffd76a]">Победитель турнира</p>
          <h1 className="mt-3 font-display text-[clamp(30px,4.5vw,64px)] font-extrabold leading-tight">{winner?.nickname ?? "—"}</h1>
          <p className="mt-1 text-[16px] font-bold text-mut">{winner?.firstName} {winner?.lastName}</p>
          <div className="mx-auto mt-6 w-fit"><Avatar user={winner} size={130} ring /></div>
          <p className="mt-5 text-[14px] font-bold uppercase tracking-[0.2em] text-dim">«{t.name}» · {fmtDate(t.results.completedAt)}</p>
          <p className="num mt-2 text-[24px] font-extrabold text-(--acc)">+{fmtNum(t.results.pointsAwarded[t.results.winner] ?? 0)} очков в рейтинг</p>
        </div>
        {/* top-10 */}
        <div className="panel max-h-[76vh] overflow-hidden p-5">
          <p className="lbl !mb-3">Топ-10 · очки</p>
          <div className="space-y-1.5">
            {top.map((uidv, i) => {
              const u = s.users[uidv];
              return (
                <div key={uidv} className={cn("anim-slide flex items-center gap-3.5 rounded-xl px-3.5 py-2.5", i === 0 ? "bg-[#ffd76a]/10 ring-1 ring-[#ffd76a]/35" : i < 3 ? "bg-(--acc-soft)" : "bg-white/[0.03]")}
                  style={{ animationDelay: `${i * 110}ms` }}>
                  <span className={cn("num w-10 text-center font-display text-[20px] font-extrabold", i === 0 ? "text-[#ffd76a]" : i === 1 ? "text-[#c9d4e5]" : i === 2 ? "text-[#d9915b]" : "text-dim")}>{i + 1}</span>
                  <Avatar user={u} size={44} ring={i < 3} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[16px] font-bold">{u?.nickname ?? "—"}</span>
                    <span className="text-[12px] font-semibold text-dim">{u?.firstName} {u?.lastName}</span>
                  </span>
                  <span className="num text-[20px] font-extrabold text-(--acc)">+{t.results!.pointsAwarded[uidv] ?? 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TvFrame>
  );
}

/* ================================ RANKING ================================ */
export function TvRanking() {
  const s = useDb();
  const seasons = useMemo(() => Object.values(s.seasons).sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.startDate - a.startDate), [s.seasons]);
  const [mode, setMode] = useState<"all" | number>("all");
  useEffect(() => {
    const i = setInterval(() => {
      setMode((m) => (m === "all" ? 0 : m + 1 >= seasons.length ? "all" : m + 1));
    }, 16000);
    return () => clearInterval(i);
  }, [seasons.length]);

  const rows = useMemo(() => {
    if (mode === "all") {
      return Object.values(s.users).filter((u) => !u.isArchived).sort((a, b) => b.stats.points - a.stats.points).slice(0, 20)
        .map((u, i) => ({ uid: u.uid, place: i + 1, points: u.stats.points, games: u.stats.totalTournaments, wins: u.stats.wins }));
    }
    const sn = seasons[mode]; if (!sn) return [];
    return computeSeasonRating(s, sn.id).slice(0, 20).map((r, i) => ({ uid: r.uid, place: i + 1, points: r.points, games: r.games, wins: r.wins }));
  }, [mode, s, seasons]);
  const title = mode === "all" ? "Рейтинг за все время" : seasons[mode]?.name ?? "";

  return (
    <TvFrame right={<span className="rounded-full bg-(--acc-soft) px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-widest text-(--acc)">ТОП-20 клуба</span>}>
      <div className="mx-auto flex h-full max-w-[1100px] flex-col py-2">
        <div className="mb-4 text-center">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.34em] text-(--acc)">таблица лидеров</p>
          <h1 key={String(mode)} className="anim-pop mt-1 font-display text-[clamp(24px,3.4vw,46px)] font-extrabold">{title}</h1>
        </div>
        <div key={String(mode)} className="panel anim-in flex-1 overflow-hidden px-4 py-3">
          {rows.map((r, i) => {
            const u = s.users[r.uid];
            return (
              <div key={r.uid} className={cn("flex items-center gap-4 border-b border-line/60 px-3 py-[0.85vh] last:border-0", i < 3 && "bg-(--acc-soft) rounded-xl border-0")}>
                <span className={cn("num w-12 text-center font-display text-[clamp(17px,1.8vw,26px)] font-extrabold", i === 0 ? "text-[#ffd76a]" : i === 1 ? "text-[#c9d4e5]" : i === 2 ? "text-[#d9915b]" : "text-dim")}>{r.place}</span>
                <Avatar user={u} size={48} ring={i < 3} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[clamp(14px,1.5vw,20px)] font-bold">{u?.nickname ?? "—"}</span>
                  <span className="text-[clamp(11px,1vw,13.5px)] font-semibold text-dim">{r.games} {plural(r.games, "игра", "игры", "игр")} · {r.wins} {plural(r.wins, "победа", "победы", "побед")}</span>
                </span>
                <span className="num text-[clamp(18px,2vw,28px)] font-extrabold text-(--acc)">{fmtNum(r.points)}</span>
                <span className="hidden text-[11px] font-bold uppercase tracking-wider text-dim sm:block">очков</span>
              </div>
            );
          })}
          {rows.length === 0 && <p className="grid h-full place-items-center text-xl font-bold text-dim">Пока нет данных</p>}
        </div>
      </div>
    </TvFrame>
  );
}

/* helper for timer icon reuse */
export { Timer as TvTimerIcon };
