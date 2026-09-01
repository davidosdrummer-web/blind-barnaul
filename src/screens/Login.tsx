import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { login, registerUser } from "../lib/db";
import { Btn, Suit, toast, ChipIcon, Field } from "../lib/ui";

type Mode = "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [lg, setLg] = useState({ login: "", password: "" });
  const [rg, setRg] = useState({ nickname: "", firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (mode === "login") {
      if (!lg.login.trim()) e.login = "Укажите никнейм или e-mail";
      if (!lg.password.trim()) e.password = "Введите пароль";
      setErrs(e);
      if (Object.keys(e).length) return;
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        // демо-режим: вход по нику / e-mail / uid, пароль любой
        import("../lib/db").then(({ db }) => {
          const q = lg.login.trim().toLowerCase();
          const u = Object.values(db.get().users).find(
            (x) => x.nickname.toLowerCase() === q || x.email.toLowerCase() === q || x.uid === q,
          );
          if (!u) { toast("Пользователь не найден. Зарегистрируйтесь.", "err"); return; }
          const err = login(u.uid);
          if (err) toast(err, "err");
          else toast(`Добро пожаловать, ${u.nickname}!`);
        });
      }, 420);
      return;
    }
    // регистрация
    if (!rg.nickname.trim()) e.nickname = "Обязательное поле";
    if (!rg.firstName.trim()) e.firstName = "Обязательное поле";
    if (!rg.lastName.trim()) e.lastName = "Обязательное поле";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rg.email.trim())) e.email = "Некорректный e-mail";
    if (rg.password.length < 4) e.password = "Минимум 4 символа";
    if (rg.password !== rg.confirm) e.confirm = "Пароли не совпадают";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setTimeout(() => {
      const err = registerUser(rg);
      setBusy(false);
      if (err) { setErrs({ nickname: err }); toast(err, "err"); return; }
      toast("Аккаунт создан — вам присвоена роль «Игрок»");
    }, 500);
  };

  const err = (k: string) => (errs[k] ? <span className="mt-1 block text-[12px] font-semibold text-bad">{errs[k]}</span> : null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative w-full max-w-[440px]">
        {/* brand */}
        <div className="mb-6 flex flex-col items-center text-center anim-in">
          <span className="felt stitched grid size-16 place-items-center rounded-[22px] shadow-[0_18px_44px_-10px_rgba(0,0,0,0.75)]">
            <Suit s="spade" className="size-8 text-white" />
          </span>
          <h1 className="mt-4 font-display text-[22px] font-extrabold tracking-wide">ПИКОВАЯ ДАМА</h1>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] text-(--acc)">клуб спортивного покера</p>
        </div>

        <div className="panel overflow-hidden">
          {/* tabs */}
          <div className="relative grid grid-cols-2 border-b border-line">
            <span className="absolute inset-y-0 w-1/2 bg-(--acc-soft) transition-transform duration-300"
              style={{ transform: mode === "register" ? "translateX(100%)" : "translateX(0)" }} />
            {([["login", "Вход", <LogIn key="i" className="size-4" />], ["register", "Регистрация", <UserPlus key="r" className="size-4" />]] as const).map(([k, l, ic]) => (
              <button key={k} onClick={() => { setMode(k); setErrs({}); }}
                className={`relative z-10 flex items-center justify-center gap-2 py-3.5 text-[13px] font-extrabold uppercase tracking-wider transition-colors ${mode === k ? "text-(--acc)" : "text-mut hover:text-ink"}`}>
                {ic}{l}
              </button>
            ))}
          </div>

          <form className="space-y-3.5 px-5 py-6 sm:px-7" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.div key="lg" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.22 }} className="space-y-3.5">
                  <div>
                    <Field label="Никнейм или e-mail">
                      <input className="inp" autoComplete="username" value={lg.login}
                        onChange={(e) => setLg({ ...lg, login: e.target.value })} placeholder="Например: RiverRat" />
                    </Field>
                    {err("login")}
                  </div>
                  <div>
                    <Field label="Пароль">
                      <div className="relative">
                        <input className="inp pr-11" type={show ? "text" : "password"} autoComplete="current-password"
                          value={lg.password} onChange={(e) => setLg({ ...lg, password: e.target.value })} placeholder="••••••••" />
                        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim transition hover:text-ink">
                          {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                        </button>
                      </div>
                    </Field>
                    {err("password")}
                  </div>
                  <Btn size="lg" className="w-full" type="submit" disabled={busy}>
                    <LogIn className="size-4.5" /> {busy ? "Проверяем…" : "Войти за стол"}
                  </Btn>
                  <p className="rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed text-mut">
                    Демо-доступ: <b className="text-ink">DealerMax</b> (админ), <b className="text-ink">ChipQueen</b> (оператор), <b className="text-ink">RiverRat</b> (игрок) — пароль любой.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="rg" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.22 }} className="space-y-3.5">
                  <div>
                    <Field label="Никнейм"><input className="inp" value={rg.nickname} onChange={(e) => setRg({ ...rg, nickname: e.target.value })} placeholder="PokerKing" /></Field>
                    {err("nickname")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Field label="Имя"><input className="inp" value={rg.firstName} onChange={(e) => setRg({ ...rg, firstName: e.target.value })} placeholder="Иван" /></Field>{err("firstName")}</div>
                    <div><Field label="Фамилия"><input className="inp" value={rg.lastName} onChange={(e) => setRg({ ...rg, lastName: e.target.value })} placeholder="Петров" /></Field>{err("lastName")}</div>
                  </div>
                  <div>
                    <Field label="E-mail"><input type="email" className="inp" value={rg.email} onChange={(e) => setRg({ ...rg, email: e.target.value })} placeholder="ivan@mail.ru" /></Field>
                    {err("email")}
                  </div>
                  <div>
                    <Field label="Телефон"><input type="tel" className="inp" value={rg.phone} onChange={(e) => setRg({ ...rg, phone: e.target.value })} placeholder="+7 900 000-00-00" /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Field label="Пароль">
                        <div className="relative">
                          <input className="inp pr-10" type={show ? "text" : "password"} value={rg.password} onChange={(e) => setRg({ ...rg, password: e.target.value })} placeholder="Мин. 4 символа" />
                          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim transition hover:text-ink">
                            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </Field>
                      {err("password")}
                    </div>
                    <div><Field label="Повторите"><input type="password" className="inp" value={rg.confirm} onChange={(e) => setRg({ ...rg, confirm: e.target.value })} placeholder="Ещё раз" /></Field>{err("confirm")}</div>
                  </div>
                  <Btn size="lg" className="w-full" type="submit" disabled={busy}>
                    <UserPlus className="size-4.5" /> {busy ? "Создаём аккаунт…" : "Зарегистрироваться"}
                  </Btn>
                  <p className="flex items-center justify-center gap-2 text-[12px] font-semibold text-mut">
                    <ShieldCheck className="size-4 text-(--acc)" /> При регистрации присваивается роль «Игрок»
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11.5px] font-semibold text-dim">
          <ChipIcon className="size-4" /> Реактивная демо-платформа · данные эмулируют Firebase Realtime
        </p>
      </motion.div>
    </div>
  );
}
