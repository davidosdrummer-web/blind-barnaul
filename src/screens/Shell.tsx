import { ReactNode } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, Trophy, BarChart3, Medal, ListOrdered, Bell, SlidersHorizontal, Layers,
  Users, CalendarRange, Monitor, Settings, LogOut, Timer,
} from "lucide-react";
import { db, fmtClock, logout, setView, useDb, useMe, can } from "../lib/db";
import { Avatar, Badge, cn, Suit } from "../lib/ui";
import PlayerHome, { PlayerTournaments, PlayerStats, PlayerAchievements, PlayerRating, PlayerNotifs } from "./player";
import Pult from "./Pult";
import TournamentsList, { TournamentForm, TournamentSeats } from "./Tournaments";
import { Members, AdminRating, Templates, Seasons, SeasonPage, ScreensAdmin, SettingsPage } from "./Manage";

const playerNav = [
  { k: "home", label: "Главная", icon: Home },
  { k: "tournaments", label: "Турниры", icon: Trophy },
  { k: "stats", label: "Статистика", icon: BarChart3 },
  { k: "achievements", label: "Достижения", icon: Medal },
  { k: "rating", label: "Рейтинг", icon: ListOrdered },
  { k: "notifications", label: "Уведомления", icon: Bell },
];
const clubNav = [
  { k: "pult", label: "Пульт", icon: SlidersHorizontal },
  { k: "tournaments", label: "Турниры", icon: Trophy },
  { k: "templates", label: "Шаблоны", icon: Layers },
  { k: "members", label: "Участники", icon: Users },
  { k: "rating", label: "Рейтинг", icon: ListOrdered },
  { k: "seasons", label: "Сезоны", icon: CalendarRange },
  { k: "screens", label: "Экраны", icon: Monitor },
  { k: "settings", label: "Настройки", icon: Settings, adminOnly: true },
];

function useSectionRenderer() {
  const { section = "", p1, p2 } = useParams();
  const s = useDb();
  const me = useMe();
  const isAdmin = can(s, "admin");
  const isOp = can(s, "operate");
  const view = s.session.view === "player" || !isOp ? "player" : "club";

  if (view === "player") {
    switch (section) {
      case "tournaments": return <PlayerTournaments />;
      case "stats": return <PlayerStats />;
      case "achievements": return <PlayerAchievements />;
      case "rating": return <PlayerRating />;
      case "notifications": return <PlayerNotifs />;
      default: return <PlayerHome />;
    }
  }
  switch (section) {
    case "pult": return <Pult preselect={p1} />;
    case "tournaments":
      if (p1 === "new") return <TournamentForm editId={null} />;
      if (p1 && p2 === "edit") return <TournamentForm editId={p1} />;
      if (p1 && p2 === "seats") return <TournamentSeats tid={p1} ro={!isOp} />;
      return <TournamentsList />;
    case "templates": return <Templates ro={!isAdmin} />;
    case "members": return <Members ro={!isAdmin} />;
    case "rating": return <AdminRating />;
    case "seasons": return p1 ? <SeasonPage sid={p1} ro={!isAdmin} /> : <Seasons ro={!isAdmin} />;
    case "screens": return <ScreensAdmin ro={!isAdmin} />;
    case "settings": return isAdmin ? <SettingsPage /> : <Members ro />;
    default: return <Pult />;
  }
}

export default function Shell() {
  const s = useDb();
  const me = useMe();
  const nav = useNavigate();
  const { section = "" } = useParams();
  if (!me) return null;
  const isOp = can(s, "operate");
  const isAdmin = can(s, "admin");
  const view = s.session.view === "player" || !isOp ? "player" : "club";
  const navItems = (view === "player" ? playerNav : clubNav.filter((n) => !n.adminOnly || isAdmin));
  const unread = Object.values(me.notifications).filter((n) => !n.read).length;
  const activeT = Object.values(s.tournaments).find((t) => t.status === "active");

  const go = (k: string) => nav(`/app/${k}`);
  const switchView = (v: "club" | "player") => { setView(v); nav(`/app/${v === "player" ? "home" : "pult"}`); };

  return (
    <div className="flex min-h-screen">
      {/* ===== Desktop sidebar ===== */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-line bg-black/25 px-4 py-5 backdrop-blur-xl lg:flex">
        <button onClick={() => nav("/app/" + (view === "player" ? "home" : "pult"))} className="mb-5 flex items-center gap-3 px-2 text-left">
          <span className="grid size-10 place-items-center rounded-xl bg-(--acc-soft) ring-1 ring-(--acc-line)">
            <Suit s="spade" className="size-5 text-(--acc)" />
          </span>
          <span>
            <span className="block font-display text-[13.5px] font-extrabold leading-tight">{s.club.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-dim">{view === "player" ? "личный кабинет" : "кабинет клуба"}</span>
          </span>
        </button>

        {isOp && (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-white/[0.03] p-1">
            {(["club", "player"] as const).map((v) => (
              <button key={v} onClick={() => switchView(v)}
                className={cn("rounded-lg px-2 py-1.5 text-[11.5px] font-extrabold uppercase tracking-wider transition-all duration-300",
                  view === v ? "bg-(--acc) text-(--acc-ink) shadow" : "text-mut hover:text-ink")}>
                {v === "club" ? "Клуб" : "Игрок"}
              </button>
            ))}
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((n) => {
            const active = section === n.k;
            const Icon = n.icon;
            return (
              <NavLink key={n.k} to={`/app/${n.k}`}
                className={cn("group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold transition-all duration-300",
                  active ? "bg-(--acc-soft) text-(--acc)" : "text-mut hover:bg-white/[0.05] hover:text-ink")}>
                {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-(--acc)" />}
                <Icon className="size-[18px] shrink-0" />
                {n.label}
                {n.k === "notifications" && unread > 0 && (
                  <span className="num ml-auto rounded-md bg-(--acc) px-1.5 py-0.5 text-[10.5px] font-extrabold text-(--acc-ink)">{unread}</span>
                )}
                {n.k === "pult" && activeT && <span className="ml-auto size-1.5 rounded-full bg-ok live-dot relative text-ok" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar user={me} size={38} ring />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[12.5px] font-bold">{me.nickname}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-dim">{me.role === "admin" ? "Администратор" : me.role === "operator" ? "Оператор" : "Игрок"}</p>
            </div>
            <button onClick={() => { logout(); nav("/login"); }} title="Выйти"
              className="grid size-9 place-items-center rounded-xl border border-line text-mut transition hover:border-bad/40 hover:text-bad">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Main column ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--bg0)_82%,transparent)] backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <span className="grid size-9 place-items-center rounded-xl bg-(--acc-soft) ring-1 ring-(--acc-line) lg:hidden">
              <Suit s="spade" className="size-4.5 text-(--acc)" />
            </span>
            {activeT ? (
              <button onClick={() => isOp && go("pult")} className={cn("flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3 py-1.5", isOp && "hover:border-(--acc-line) transition-colors")}>
                <Timer className="size-4 shrink-0 text-(--acc)" />
                <span className="truncate text-[12.5px] font-bold">{activeT.name}</span>
                <span className="num shrink-0 rounded-md bg-(--acc-soft) px-2 py-0.5 text-[12px] font-extrabold text-(--acc)">{fmtClock(activeT.pult.timeRemaining)}</span>
                <Badge tone="ok" className="hidden sm:inline-flex">ур. {activeT.pult.currentLevel}</Badge>
              </button>
            ) : (
              <span className="flex items-center gap-2 text-[12.5px] font-bold text-dim"><Timer className="size-4" /> Нет активного турнира</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isOp && (
                <div className="flex rounded-xl border border-line bg-white/[0.03] p-1 lg:hidden">
                  {(["club", "player"] as const).map((v) => (
                    <button key={v} onClick={() => switchView(v)} className={cn("rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase", view === v ? "bg-(--acc) text-(--acc-ink)" : "text-mut")}>
                      {v === "club" ? "Клуб" : "Я"}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => go("notifications")} className="relative grid size-10 place-items-center rounded-xl border border-line bg-white/[0.03] text-mut transition hover:text-ink">
                <Bell className="size-[18px]" />
                {unread > 0 && <span className="num absolute -right-1 -top-1 rounded-full bg-(--acc) px-1.5 text-[10px] font-extrabold text-(--acc-ink)">{unread}</span>}
              </button>
              <button onClick={() => go(view === "player" ? "home" : "members")} className="lg:hidden"><Avatar user={me} size={38} /></button>
              <button onClick={() => { logout(); nav("/login"); }} className="grid size-10 place-items-center rounded-xl border border-line text-mut transition hover:text-bad lg:hidden">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
          {/* club nav on mobile */}
          {view === "club" && (
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 sm:px-6 lg:hidden">
              {navItems.map((n) => {
                const Icon = n.icon;
                return (
                  <button key={n.k} onClick={() => go(n.k)}
                    className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition",
                      section === n.k ? "bg-(--acc-soft) text-(--acc) border border-(--acc-line)/60" : "text-mut border border-transparent")}>
                    <Icon className="size-3.5" /> {n.label}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 lg:pb-8">
          <motion.div key={view + section + (useParams().p1 ?? "")} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
            <UseSection />
          </motion.div>
        </main>
      </div>

      {/* ===== Mobile bottom nav (player) ===== */}
      {view === "player" && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_srgb,var(--bg0)_88%,transparent)] backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-6">
            {playerNav.map((n) => {
              const Icon = n.icon;
              const active = section === n.k;
              return (
                <button key={n.k} onClick={() => go(n.k)} className="relative flex flex-col items-center gap-1 py-2.5">
                  <Icon className={cn("size-5 transition-colors", active ? "text-(--acc)" : "text-dim")} />
                  <span className={cn("text-[9.5px] font-extrabold uppercase tracking-wide", active ? "text-(--acc)" : "text-dim")}>{n.label}</span>
                  {active && <span className="absolute top-0 h-[2.5px] w-8 rounded-b bg-(--acc)" />}
                  {n.k === "notifications" && unread > 0 && <span className="absolute right-[22%] top-1.5 size-2 rounded-full bg-(--acc)" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function UseSection() { return <>{useSectionRenderer()}</>; }
