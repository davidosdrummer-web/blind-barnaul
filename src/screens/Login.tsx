import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, ShieldCheck, Monitor, Trophy, Eye, EyeOff } from "lucide-react";
import { db, login, useDb, User } from "../lib/db";
import { Avatar, Badge, Btn, Suit, toast, ChipIcon } from "../lib/ui";

function PlayingCard({ s, rank, rot, y, delay }: { s: "spade" | "heart" | "diamond" | "club"; rank: string; rot: number; y: number; delay: number }) {
  return (
    <motion.span initial={{ opacity: 0, y: 40, rotate: 0 }} animate={{ opacity: 1, y, rotate: rot }}
      transition={{ delay, type: "spring", damping: 16, stiffness: 120 }}
      className="relative inline-block h-[132px] w-[94px] rounded-[12px] border border-black/20 bg-gradient-to-br from-white to-[#dfe3ee] shadow-[0_22px_50px_-12px_rgba(0,0,0,0.7)] sm:h-[164px] sm:w-[116px]">
      <span className={`absolute left-2 top-1.5 font-display text-[15px] font-extrabold leading-none ${s === "heart" || s === "diamond" ? "text-cardred" : "text-[#151a26]"}`}>{rank}</span>
      <Suit s={s} className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 sm:h-11 sm:w-11" style={s === "spade" || s === "club" ? { color: "#151a26" } : undefined} />
      <span className={`absolute bottom-1.5 right-2 rotate-180 font-display text-[15px] font-extrabold leading-none ${s === "heart" || s === "diamond" ? "text-cardred" : "text-[#151a26]"}`}>{rank}</span>
    </motion.span>
  );
}

export default function Login() {
  const s = useDb();
  const [picked, setPicked] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const accounts: User[] = [s.users["u-admin"], s.users["u-operator"], s.users["p01"], s.users["p12"]].filter(Boolean);
  const active = s.tournaments["t-active"];
  const members = Object.values(s.users).filter((u) => !u.isArchived).length;

  const doLogin = (uidv: string) => {
    if (!pw.trim()) { toast("Введите пароль (демо: любой)", "err"); return; }
    setBusy(true);
    setTimeout(() => {
      const err = login(uidv);
      setBusy(false);
      if (err) { toast(err, "err"); return; }
      toast(`Добро пожаловать, ${db.get().users[uidv].nickname}!`);
    }, 450);
  };

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* ===== LEFT: brand stage ===== */}
      <div className="felt stitched relative flex flex-1 flex-col justify-between overflow-hidden px-6 py-8 sm:px-10 lg:min-h-screen lg:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_-10%,rgba(255,255,255,0.14),transparent_55%)]" />
        <header className="relative z-10 flex items-center gap-3 anim-in">
          <span className="grid size-11 place-items-center rounded-2xl bg-black/30 ring-1 ring-white/15">
            <Suit s="spade" className="size-6 text-white" />
          </span>
          <div>
            <p className="font-display text-[15px] font-extrabold tracking-wide text-white">ПИКОВАЯ ДАМА</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/55">клуб спортивного покера</p>
          </div>
        </header>

        <div className="relative z-10 my-8 lg:my-0">
          <motion.h1 initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="max-w-[640px] font-display text-[clamp(28px,4.6vw,54px)] font-extrabold leading-[1.06] text-white">
            Стол открыт.<br />
            <span className="text-[#ffd76a]">Ваша игра</span> — в одном пульте.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
            className="mt-4 max-w-[520px] text-[14.5px] font-medium leading-relaxed text-white/70">
            Платформа управления клубом: турниры и регистрация, пульт дилера с таймером блайндов,
            рейтинг сезонов, достижения и ТВ-экраны — в реальном времени.
          </motion.p>

          <div className="mt-8 hidden justify-center lg:flex">
            <div className="flex items-end">
              <PlayingCard s="club" rank="10" rot={-14} y={14} delay={0.35} />
              <PlayingCard s="diamond" rank="J" rot={-6} y={4} delay={0.45} />
              <PlayingCard s="spade" rank="A" rot={2} y={-6} delay={0.55} />
              <PlayingCard s="heart" rank="Q" rot={11} y={6} delay={0.65} />
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 anim-in" style={{ animationDelay: "0.3s" }}>
          {[
            { icon: <Trophy className="size-4" />, v: String(Object.keys(s.tournaments).length), l: "турниров в системе" },
            { icon: <ShieldCheck className="size-4" />, v: String(members), l: "участников клуба" },
            { icon: <Monitor className="size-4" />, v: "4", l: "ТВ-экрана live" },
          ].map((x, i) => (
            <div key={i} className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3.5 backdrop-blur-sm">
              <span className="flex items-center gap-1.5 text-[#ffd76a]">{x.icon}<b className="num text-[19px] text-white">{x.v}</b></span>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">{x.l}</p>
            </div>
          ))}
        </div>
        {active && (
          <div className="relative z-10 mt-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-black/30 px-4 py-3 backdrop-blur-sm">
            <span className="relative inline-block size-2.5 rounded-full bg-[#ffd76a] live-dot text-[#ffd76a]" />
            <p className="text-[13px] font-bold text-white/85">Сейчас за столами: <span className="text-[#ffd76a]">«{active.name}»</span> — уровень {active.pult.currentLevel}, в игре {Object.values(active.registeredPlayers).filter((r) => !r.isEliminated).length} чел.</p>
          </div>
        )}
      </div>

      {/* ===== RIGHT: auth ===== */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[480px] lg:shrink-0 lg:px-12">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.24em] text-(--acc)">Вход в систему</p>
          <h2 className="font-display text-[24px] font-extrabold leading-tight">Личный кабинет</h2>
          <p className="mt-1.5 text-[13.5px] text-mut">Выберите демо-аккаунт с нужной ролью — интерфейс соберётся под неё.</p>

          <div className="mt-6 space-y-2.5">
            {accounts.map((u) => (
              <button key={u.uid} onClick={() => setPicked(u.uid)}
                className={`flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${picked === u.uid ? "border-(--acc-line) bg-(--acc-soft) shadow-[0_10px_30px_-12px_var(--acc)]" : "border-line bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                <Avatar user={u} size={42} ring={picked === u.uid} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-display text-[13.5px] font-bold">{u.nickname}
                    {u.isBlocked && <Badge tone="bad">заблокирован</Badge>}
                  </span>
                  <span className="block truncate text-[12.5px] text-mut">{u.firstName} {u.lastName} · {u.email}</span>
                </span>
                <Badge tone={u.role === "admin" ? "acc" : u.role === "operator" ? "warn" : "mut"}>
                  {u.role === "admin" ? "Админ" : u.role === "operator" ? "Оператор" : "Игрок"}
                </Badge>
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); if (picked) doLogin(picked); }}>
            <div className="relative">
              <input className="inp pr-11" type={show ? "text" : "password"} placeholder="Пароль (демо: любой)"
                value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink transition-colors">
                {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </div>
            <Btn size="lg" className="w-full" disabled={!picked || busy} type="submit">
              <LogIn className="size-4.5" /> {busy ? "Проверяем…" : "Войти за стол"}
            </Btn>
          </form>

          <div className="mt-7 border-t border-line pt-5">
            <p className="lbl !mb-2.5">Публичные ТВ-экраны — без входа</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["#/screen/main/t-active", "Основной"], ["#/screen/final/t-active", "Финальный стол"],
                ["#/screen/results/t-done2", "Итоги"], ["#/screen/ranking", "Рейтинг"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-[12px] font-bold text-mut transition hover:border-(--acc-line) hover:text-(--acc)">
                  <Monitor className="size-3.5" /> {label}
                </a>
              ))}
            </div>
          </div>
        </motion.div>
        <p className="mt-8 flex items-center gap-2 text-[11.5px] font-semibold text-dim">
          <ChipIcon className="size-4" /> Демо-данные хранятся локально · Firebase-структура эмулирована в реальном времени
        </p>
      </div>
    </div>
  );
}
