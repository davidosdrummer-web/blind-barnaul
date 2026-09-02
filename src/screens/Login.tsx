import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth } from "../firebase";
import { set, ref, get } from "firebase/database";
import { db } from "../firebase";
import { Btn, Suit, toast, ChipIcon, Field } from "../lib/ui";
import { uid, User } from "../lib/db";

type Mode = "login" | "register";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [lg, setLg] = useState({ email: "", password: "" });
  const [rg, setRg] = useState({ 
    nickname: "", firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" 
  });
  const [errs, setErrs] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    const e: Record<string, string> = {};
    if (!lg.email.trim()) e.email = "Укажите e-mail";
    if (!lg.password.trim()) e.password = "Введите пароль";
    setErrs(e);
    if (Object.keys(e).length) return;
    
    setBusy(true);
    try {
      // ✅ ПРАВИЛЬНО: signInWithEmailAndPassword для входа
      await signInWithEmailAndPassword(auth, lg.email.trim(), lg.password);
      navigate("/app/home");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found") {
        toast("Пользователь не найден. Проверьте email или зарегистрируйтесь.", "err");
      } else if (err.code === "auth/wrong-password") {
        toast("Неверный пароль.", "err");
      } else if (err.code === "auth/invalid-email") {
        toast("Некорректный email.", "err");
      } else if (err.code === "auth/too-many-requests") {
        toast("Слишком много попыток. Попробуйте позже.", "err");
      } else {
        toast(err.message || "Ошибка входа", "err");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    const e: Record<string, string> = {};
    if (!rg.nickname.trim()) e.nickname = "Обязательное поле";
    if (!rg.firstName.trim()) e.firstName = "Обязательное поле";
    if (!rg.lastName.trim()) e.lastName = "Обязательное поле";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rg.email.trim())) {
      e.email = "Введите корректный email (например: user@mail.ru)";
    }
    if (rg.password.length < 6) {
      e.password = "Минимум 6 символов";
    }
    if (rg.password !== rg.confirm) {
      e.confirm = "Пароли не совпадают";
    }
    
    setErrs(e);
    if (Object.keys(e).length) return;
    
    setBusy(true);
    try {
      // ✅ ПРАВИЛЬНО: createUserWithEmailAndPassword для регистрации
      const cred = await createUserWithEmailAndPassword(
        auth, 
        rg.email.trim(), 
        rg.password
      );
      const newUid = cred.user.uid;
      
      // Проверяем, есть ли уже пользователи в БД
      const usersSnap = await get(ref(db, "users"));
      const users = usersSnap.val() || {};
      const isFirstUser = Object.keys(users).length === 0;
      
      const newUser: User = {
        uid: newUid,
        email: rg.email.trim(),
        phone: rg.phone.trim(),
        role: isFirstUser ? "admin" : "player",
        nickname: rg.nickname.trim(),
        firstName: rg.firstName.trim(),
        lastName: rg.lastName.trim(),
        hue: Math.floor(Math.random() * 360),
        registrationDate: Date.now(),
        isBlocked: false,
        isArchived: false,
        stats: { 
          totalTournaments: 0, wins: 0, top3: 0, finalTables: 0, 
          knockouts: 0, rebuy: 0, addon: 0, reentry: 0, 
          bestScore: 0, avgPlace: 0, bestPlace: 0, points: 0 
        },
        achievements: {},
        tournamentHistory: {},
        notifications: {},
      };
      
      await set(ref(db, `users/${newUid}`), newUser);
      
      if (isFirstUser) {
        const club = {
          name: "Пиковая Дама",
          slogan: "Клуб спортивного покера «Пиковая Дама» ♠ Турниры каждый вечер в 19:00 ♠ Рейк 0% — только спортивный интерес ♠",
          language: "ru" as const,
          activeColor: "green",
          bgColor: "#0b0e15",
          sound: true,
        };
        await set(ref(db, "club"), club);
        
        const notif = {
          id: uid(),
          title: "Добро пожаловать!",
          message: "Вы первый администратор клуба. Настройте клуб и создавайте турниры!",
          type: "account" as const,
          read: false,
          timestamp: Date.now(),
        };
        await set(ref(db, `users/${newUid}/notifications/${notif.id}`), notif);
      }
      
      toast(`Аккаунт создан! Вы ${isFirstUser ? "администратор" : "игрок"}`);
      navigate("/app/home");
      
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === "auth/email-already-in-use") {
        toast("Этот email уже используется. Войдите в аккаунт.", "err");
      } else if (err.code === "auth/invalid-email") {
        toast("Некорректный email.", "err");
      } else if (err.code === "auth/operation-not-allowed") {
        toast("Регистрация Email/Password отключена в Firebase Console.", "err");
      } else if (err.code === "auth/weak-password") {
        toast("Пароль слишком слабый. Минимум 6 символов.", "err");
      } else {
        toast(err.message || "Ошибка регистрации", "err");
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (mode === "login") {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const err = (k: string) => (errs[k] ? 
    <span className="mt-1 block text-[12px] font-semibold text-bad">{errs[k]}</span> : null
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div 
        initial={{ opacity: 0, y: 26 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative w-full max-w-[440px]"
      >
        <div className="mb-6 flex flex-col items-center text-center anim-in">
          <span className="felt stitched grid size-16 place-items-center rounded-[22px] shadow-[0_18px_44px_-10px_rgba(0,0,0,0.75)]">
            <Suit s="spade" className="size-8 text-white" />
          </span>
          <h1 className="mt-4 font-display text-[22px] font-extrabold tracking-wide">ПИКОВАЯ ДАМА</h1>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] text-(--acc)">клуб спортивного покера</p>
        </div>

        <div className="panel overflow-hidden">
          <div className="relative grid grid-cols-2 border-b border-line">
            <span 
              className="absolute inset-y-0 w-1/2 bg-(--acc-soft) transition-transform duration-300"
              style={{ transform: mode === "register" ? "translateX(100%)" : "translateX(0)" }} 
            />
            {([
              ["login", "Вход", <LogIn key="i" className="size-4" />],
              ["register", "Регистрация", <UserPlus key="r" className="size-4" />]
            ] as const).map(([k, label, icon]) => (
              <button 
                key={k} 
                onClick={() => { setMode(k); setErrs({}); }}
                className={`relative z-10 flex items-center justify-center gap-2 py-3.5 text-[13px] font-extrabold uppercase tracking-wider transition-colors ${
                  mode === k ? "text-(--acc)" : "text-mut hover:text-ink"
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          <form className="space-y-3.5 px-5 py-6 sm:px-7" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.div 
                  key="lg" 
                  initial={{ opacity: 0, x: -14 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 14 }} 
                  transition={{ duration: 0.22 }} 
                  className="space-y-3.5"
                >
                  <div>
                    <Field label="E-mail">
                      <input 
                        className="inp" 
                        autoComplete="email" 
                        type="email"
                        value={lg.email} 
                        onChange={(e) => setLg({ ...lg, email: e.target.value })} 
                        placeholder="ivan@mail.ru" 
                      />
                    </Field>
                    {err("email")}
                  </div>
                  <div>
                    <Field label="Пароль">
                      <div className="relative">
                        <input 
                          className="inp pr-11" 
                          type={show ? "text" : "password"} 
                          autoComplete="current-password"
                          value={lg.password} 
                          onChange={(e) => setLg({ ...lg, password: e.target.value })} 
                          placeholder="••••••••" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShow(!show)} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-dim transition hover:text-ink"
                        >
                          {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                        </button>
                      </div>
                    </Field>
                    {err("password")}
                  </div>
                  <Btn size="lg" className="w-full" type="submit" disabled={busy}>
                    <LogIn className="size-4.5" /> {busy ? "Вход…" : "Войти за стол"}
                  </Btn>
                </motion.div>
              ) : (
                <motion.div 
                  key="rg" 
                  initial={{ opacity: 0, x: 14 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -14 }} 
                  transition={{ duration: 0.22 }} 
                  className="space-y-3.5"
                >
                  <div>
                    <Field label="Никнейм">
                      <input 
                        className="inp" 
                        value={rg.nickname} 
                        onChange={(e) => setRg({ ...rg, nickname: e.target.value })} 
                        placeholder="PokerKing" 
                      />
                    </Field>
                    {err("nickname")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Field label="Имя">
                        <input 
                          className="inp" 
                          value={rg.firstName} 
                          onChange={(e) => setRg({ ...rg, firstName: e.target.value })} 
                          placeholder="Иван" 
                        />
                      </Field>
                      {err("firstName")}
                    </div>
                    <div>
                      <Field label="Фамилия">
                        <input 
                          className="inp" 
                          value={rg.lastName} 
                          onChange={(e) => setRg({ ...rg, lastName: e.target.value })} 
                          placeholder="Петров" 
                        />
                      </Field>
                      {err("lastName")}
                    </div>
                  </div>
                  <div>
                    <Field label="E-mail">
                      <input 
                        type="email" 
                        className="inp" 
                        value={rg.email} 
                        onChange={(e) => setRg({ ...rg, email: e.target.value })} 
                        placeholder="ivan@mail.ru" 
                      />
                    </Field>
                    {err("email")}
                  </div>
                  <div>
                    <Field label="Телефон">
                      <input 
                        type="tel" 
                        className="inp" 
                        value={rg.phone} 
                        onChange={(e) => setRg({ ...rg, phone: e.target.value })} 
                        placeholder="+7 900 000-00-00" 
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Field label="Пароль (мин. 6 символов)">
                        <div className="relative">
                          <input 
                            className="inp pr-10" 
                            type={show ? "text" : "password"} 
                            value={rg.password} 
                            onChange={(e) => setRg({ ...rg, password: e.target.value })} 
                            placeholder="Минимум 6 символов" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShow(!show)} 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dim transition hover:text-ink"
                          >
                            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </Field>
                      {err("password")}
                    </div>
                    <div>
                      <Field label="Повторите пароль">
                        <input 
                          type="password" 
                          className="inp" 
                          value={rg.confirm} 
                          onChange={(e) => setRg({ ...rg, confirm: e.target.value })} 
                          placeholder="Ещё раз" 
                        />
                      </Field>
                      {err("confirm")}
                    </div>
                  </div>
                  <Btn size="lg" className="w-full" type="submit" disabled={busy}>
                    <UserPlus className="size-4.5" /> {busy ? "Регистрация…" : "Зарегистрироваться"}
                  </Btn>
                  <p className="flex items-center justify-center gap-2 text-[12px] font-semibold text-mut">
                    <ShieldCheck className="size-4 text-(--acc)" /> 
                    При регистрации присваивается роль «Игрок» (первый пользователь — «Администратор»)
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11.5px] font-semibold text-dim">
          <ChipIcon className="size-4" /> Реактивная платформа · данные в Firebase Realtime
        </p>
      </motion.div>
    </div>
  );
}