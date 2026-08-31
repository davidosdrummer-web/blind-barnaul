import { ReactNode, useEffect, useRef, useState, useSyncExternalStore, CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, AlertTriangle, Info, Trophy, Medal, Star, Target, Zap, Shield, Crown } from "lucide-react";
import { uid, User } from "./db";

export function cn(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }

/* ============================ TOASTS ============================ */
type ToastItem = { id: string; msg: string; kind: "ok" | "err" | "info" };
let toastItems: ToastItem[] = [];
const toastSubs = new Set<() => void>();
function emitToasts() { toastSubs.forEach((f) => f()); }
export function toast(msg: string, kind: ToastItem["kind"] = "ok") {
  const id = uid();
  toastItems = [...toastItems, { id, msg, kind }];
  emitToasts();
  setTimeout(() => { toastItems = toastItems.filter((t) => t.id !== id); emitToasts(); }, 4200);
}
function useToastList() {
  return useSyncExternalStore(
    (fn) => { toastSubs.add(fn); return () => { toastSubs.delete(fn); }; },
    () => toastItems
  );
}
export function Toasts() {
  const items = useToastList();
  return (
    <div className="fixed z-[90] bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-[360px] space-y-2 pointer-events-none">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, x: 60, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60 }}
            className={cn("panel pointer-events-auto flex items-start gap-3 px-4 py-3 text-sm font-semibold shadow-2xl",
              t.kind === "ok" && "border-(--acc-line)", t.kind === "err" && "border-bad/40")}>
            <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
              t.kind === "ok" && "bg-(--acc-soft) text-(--acc)", t.kind === "err" && "bg-bad/15 text-bad", t.kind === "info" && "bg-white/10 text-mut")}>
              {t.kind === "ok" ? <Check className="size-3.5" /> : t.kind === "err" ? <AlertTriangle className="size-3.5" /> : <Info className="size-3.5" />}
            </span>
            <span className="leading-snug">{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ============================ BUTTONS ============================ */
export function Btn({ children, onClick, variant = "acc", size = "md", className, disabled, title, type }: {
  children: ReactNode; onClick?: () => void; variant?: "acc" | "soft" | "ghost" | "danger" | "dark";
  size?: "xs" | "sm" | "md" | "lg"; className?: string; disabled?: boolean; title?: string; type?: "button" | "submit";
}) {
  return (
    <button type={type ?? "button"} title={title} disabled={disabled} onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-300 active:scale-[0.97] whitespace-nowrap",
        size === "xs" && "px-2.5 py-1.5 text-[12px]", size === "sm" && "px-3.5 py-2 text-[13px]",
        size === "md" && "px-4 py-2.5 text-sm", size === "lg" && "px-6 py-3.5 text-[15px]",
        variant === "acc" && "bg-(--acc) text-(--acc-ink) hover:brightness-110 shadow-[0_8px_24px_-8px_var(--acc)]",
        variant === "soft" && "bg-(--acc-soft) text-(--acc) hover:bg-(--acc-line)/40 border border-(--acc-line)/50",
        variant === "ghost" && "bg-white/[0.04] text-ink border border-line hover:bg-white/[0.09] hover:border-white/20",
        variant === "danger" && "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
        variant === "dark" && "bg-black/40 text-mut border border-line hover:text-ink hover:bg-black/60",
        disabled && "opacity-40 pointer-events-none",
        className
      )}>
      {children}
    </button>
  );
}

/* ============================ BADGES / CHIPS ============================ */
export function Badge({ children, tone = "mut", className }: { children: ReactNode; tone?: "acc" | "ok" | "warn" | "bad" | "mut" | "red"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider",
      tone === "acc" && "bg-(--acc-soft) text-(--acc)", tone === "ok" && "bg-ok/15 text-ok",
      tone === "warn" && "bg-warn/15 text-warn", tone === "bad" && "bg-bad/15 text-bad",
      tone === "red" && "bg-cardred/15 text-cardred", tone === "mut" && "bg-white/[0.07] text-mut", className)}>
      {children}
    </span>
  );
}
export function StatusBadge({ status }: { status: "planned" | "active" | "completed" }) {
  if (status === "active")
    return <Badge tone="ok" className="relative"><span className="relative inline-block size-1.5 rounded-full bg-ok live-dot" />LIVE</Badge>;
  if (status === "planned") return <Badge tone="warn">Скоро</Badge>;
  return <Badge tone="mut">Завершён</Badge>;
}

/* ============================ AVATAR ============================ */
export function Avatar({ user, size = 40, ring = false, className }: { user: Partial<User> | null | undefined; size?: number; ring?: boolean; className?: string }) {
  const init = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` : "—";
  const hue = user?.hue ?? 210;
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center rounded-full font-display font-bold text-white select-none", ring && "chip-ring p-[2.5px]", className)}
      style={{ width: size, height: size }}>
      <span className="grid h-full w-full place-items-center rounded-full"
        style={{ background: `linear-gradient(140deg, hsl(${hue} 55% 46%), hsl(${hue + 40} 60% 26%))`, fontSize: size * 0.34 }}>
        {init}
      </span>
    </span>
  );
}

/* ============================ MODAL ============================ */
export function Modal({ open, onClose, title, children, w = "max-w-lg", subtitle }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; w?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" onClick={onClose} />
          <motion.div initial={{ y: 60, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }} transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className={cn("panel relative w-full max-h-[94vh] overflow-y-auto rounded-b-none sm:rounded-b-[18px]", w)}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-bg1/85 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div>
                <h3 className="font-display text-[15px] font-bold leading-tight">{title}</h3>
                {subtitle && <p className="mt-1 text-[13px] text-mut">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.04] text-mut transition hover:text-ink hover:bg-white/10">
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-5 sm:px-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================ FORM ============================ */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-dim">{hint}</span>}
    </label>
  );
}
export function Select({ label, value, onChange, options, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ v: string; l: string }>; placeholder?: string; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </Field>
  );
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm font-semibold text-mut hover:text-ink transition-colors">
      <span className={cn("relative h-[26px] w-[46px] rounded-full transition-colors duration-300 border",
        checked ? "bg-(--acc) border-(--acc)" : "bg-white/[0.07] border-line")}>
        <span className={cn("absolute top-[3px] size-[18px] rounded-full bg-white shadow transition-all duration-300", checked ? "left-[23px]" : "left-[3px]")} />
      </span>
      {label}
    </button>
  );
}

/* ============================ TABS ============================ */
export function Tabs({ tabs, val, onChange, className }: {
  tabs: Array<{ k: string; label: string; icon?: ReactNode; count?: number }>;
  val: string; onChange: (k: string) => void; className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1", className)}>
      {tabs.map((t) => (
        <button key={t.k} onClick={() => onChange(t.k)}
          className={cn("relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all duration-300",
            val === t.k ? "bg-(--acc-soft) text-(--acc) border border-(--acc-line)/60" : "text-mut border border-transparent hover:text-ink hover:bg-white/[0.05]")}>
          {t.icon}
          {t.label}
          {t.count !== undefined && <span className={cn("num rounded-md px-1.5 py-0.5 text-[11px]", val === t.k ? "bg-(--acc)/20" : "bg-white/[0.07]")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ============================ TILES / EMPTY ============================ */
export function StatTile({ label, value, sub, icon, delay = 0 }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="panel group relative h-full overflow-hidden px-4 py-4 transition-transform duration-300 hover:-translate-y-0.5">
        <div className="absolute -right-5 -top-5 size-20 rounded-full bg-(--acc-soft) blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-mut">{label}</span>
          {icon && <span className="text-(--acc) opacity-70">{icon}</span>}
        </div>
        <div className="num mt-2 text-[22px] font-bold leading-none text-ink">{value}</div>
        {sub && <div className="mt-1.5 text-[12px] font-semibold text-dim">{sub}</div>}
      </div>
    </Reveal>
  );
}
export function Empty({ title, text, icon }: { title: string; text?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-2xl border border-dashed border-line bg-white/[0.03] text-dim">{icon ?? <Info className="size-7" />}</span>
      <p className="font-display text-[15px] font-bold">{title}</p>
      {text && <p className="max-w-[380px] text-[13.5px] text-mut">{text}</p>}
    </div>
  );
}

/* ============================ REVEAL ============================ */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("on"); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={cn("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/* ============================ CUSTOM SUIT / POKER ICONS ============================ */
export function Suit({ s, className, style }: { s: "spade" | "heart" | "diamond" | "club"; className?: string; style?: CSSProperties }) {
  const red = s === "heart" || s === "diamond";
  const paths: Record<string, string> = {
    spade: "M12 2C8.2 6.8 3.5 9.6 3.5 13.4a4.3 4.3 0 0 0 7.6 2.7c-.5 2.4-1.7 4-3.6 4.9h9c-1.9-.9-3.1-2.5-3.6-4.9a4.3 4.3 0 0 0 7.6-2.7C20.5 9.6 15.8 6.8 12 2z",
    heart: "M12 21s-7.8-4.9-9.7-9.6C1 8 2.6 4.9 5.7 4.4c2-.3 4 .6 6.3 3 2.3-2.4 4.3-3.3 6.3-3 3.1.5 4.7 3.6 3.4 7-1.9 4.7-9.7 9.6-9.7 9.6z",
    diamond: "M12 2.2 19 12l-7 9.8L5 12z",
    club: "M12 2.6a3.9 3.9 0 0 0-3.8 4.6A3.9 3.9 0 1 0 7 14.9c.5 0 1-.1 1.4-.3-.2 2.6-1.4 4.6-3.4 5.8h14c-2-1.2-3.2-3.2-3.4-5.8.4.2.9.3 1.4.3a3.9 3.9 0 1 0-1.2-7.7A3.9 3.9 0 0 0 12 2.6z",
  };
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path d={paths[s]} fill={red ? "var(--color-cardred)" : "currentColor"} />
    </svg>
  );
}
export function ChipIcon({ className, color = "var(--acc)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.4" strokeDasharray="5.2 3.4" />
      <circle cx="12" cy="12" r="5.6" fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.7" fill={color} />
    </svg>
  );
}
export function CardsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2.5" y="5" width="11" height="15.5" rx="2" transform="rotate(-8 8 13)" />
      <rect x="10.5" y="3.5" width="11" height="15.5" rx="2" transform="rotate(7 16 11)" />
      <path d="M15.4 8.2c-.9 1.1-2 1.8-2 2.8a1.1 1.1 0 0 0 2 .7 1.1 1.1 0 0 0 2-.7c0-1-1.1-1.7-2-2.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function AchIcon({ name, className }: { name: string; className?: string }) {
  const map: Record<string, ReactNode> = {
    trophy: <Trophy className={className} />, medal: <Medal className={className} />, star: <Star className={className} />,
    target: <Target className={className} />, bolt: <Zap className={className} />, shield: <Shield className={className} />,
    crown: <Crown className={className} />, cards: <CardsIcon className={className} />, diamond: <Suit s="diamond" className={className} />,
  };
  return <>{map[name] ?? <Trophy className={className} />}</>;
}

/* ============================ CONFETTI / MARQUEE ============================ */
const CONF_COLORS = ["#2fbf71", "#4d8dff", "#f5c044", "#ff5d8f", "#a06bff", "#e9eef8"];
export function Confetti({ count = 42 }: { count?: number }) {
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100, delay: Math.random() * 4, dur: 3.6 + Math.random() * 3,
      color: CONF_COLORS[i % CONF_COLORS.length], rot: Math.random() * 360, w: 6 + Math.random() * 7,
    }))
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.current.map((p, i) => (
        <span key={i} className="confetti-piece" style={{
          left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`,
          animationDuration: `${p.dur}s`, width: p.w, transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  );
}
export function Marquee({ text, speed = 26 }: { text: string; speed?: number }) {
  return (
    <div className="marquee overflow-hidden whitespace-nowrap">
      <div className="marquee-track" style={{ "--speed": `${speed}s` } as CSSProperties}>
        <span className="pr-16">{text}</span>
        <span className="pr-16" aria-hidden>{text}</span>
      </div>
    </div>
  );
}

/* ============================ MISC ============================ */
export function SectionTitle({ kicker, title, right }: { kicker?: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-(--acc)">{kicker}</p>}
        <h1 className="font-display text-[clamp(20px,3vw,30px)] font-bold leading-tight">{title}</h1>
      </div>
      {right}
    </div>
  );
}
export function Bars({ data, height = 150, unit = "очк." }: { data: Array<{ label: string; value: number; hint?: string }>; height?: number; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-end gap-[6%] px-1" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && (
              <span className="panel-deep absolute -top-9 z-10 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-bold text-ink anim-pop">
                {d.value} {unit}{d.hint ? ` · ${d.hint}` : ""}
              </span>
            )}
            <div className="bar-grow w-full rounded-t-[7px] transition-all duration-300 group-hover:brightness-125"
              style={{
                height: `${Math.max((d.value / max) * 100, 4)}%`, animationDelay: `${i * 70}ms`,
                background: hover === i ? "var(--acc)" : "linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 45%, transparent))",
              }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[6%] px-1">
        {data.map((d, i) => (
          <span key={i} className={cn("flex-1 truncate text-center text-[10.5px] font-bold", hover === i ? "text-(--acc)" : "text-dim")}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
export function useHoverDelay(ms = 350) {
  const [on, setOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return {
    on,
    bind: {
      onMouseEnter: () => { t.current = setTimeout(() => setOn(true), ms); },
      onMouseLeave: () => { if (t.current) clearTimeout(t.current); setOn(false); },
    },
  };
}
