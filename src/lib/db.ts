// src/lib/db.ts – ТОЛЬКО ТИПЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
export type Role = "player" | "operator" | "admin";
export type TStatus = "planned" | "active" | "completed";
export type ReturnMethod = "rebuy" | "reentry" | "addon" | "last_chance";
export type CondType =
  | "totalTournaments" | "wins" | "top3" | "finalTables"
  | "knockouts" | "rebuyAddon" | "reentry" | "bestScore";

export interface UserStats {
  totalTournaments: number; wins: number; top3: number; finalTables: number;
  knockouts: number; rebuy: number; addon: number; reentry: number;
  bestScore: number; avgPlace: number; bestPlace: number; points: number;
}
export interface Notification {
  id: string; title: string; message: string;
  type: "club" | "tournament" | "account"; read: boolean; timestamp: number;
}
export interface User {
  uid: string; email: string; phone: string; role: Role;
  nickname: string; firstName: string; lastName: string; hue: number;
  avatar?: string;
  registrationDate: number; isBlocked: boolean; isArchived: boolean;
  stats: UserStats;
  achievements: Record<string, { earnedAt: number; achievementName: string }>;
  tournamentHistory: Record<string, { place: number; points: number; knockouts: number; rebuy: number; addon: number; reentry: number; date: number }>;
  notifications: Record<string, Notification>;
}
export interface Level { level: number; sb: number; bb: number; ante: number; duration: number }
export interface Break { afterLevel: number; duration: number }
export interface Bonus { id: string; name: string; chips: number }
export interface RegPlayer {
  registeredAt: number; seatCode: string | null; playerNumber: number | null;
  isEliminated: boolean; chips: number;
  knockouts: number; rebuy: number; addon: number; reentry: number;
}
export interface Tournament {
  id: string; status: TStatus; name: string; seasonId: string;
  startDate: number; startTime: string; registrationDuration: number;
  startingStack: number; finalTablePlayers: number; description: string;
  pointsForKnockout: boolean; knockoutPoints: number;
  rebuyChips: number; reentryChips: number; addonChips: number;
  isFinal?: boolean; withdrawn?: number; createdAt: number;
  structure: { levels: Level[]; breaks: Break[] };
  bonuses: Bonus[];
  pointsTable: Record<string, number>;
  tables: { totalTables: number; seatsPerTable: number; seats: Record<string, string> };
  registeredPlayers: Record<string, RegPlayer>;
  pult: {
    currentLevel: number; currentBreak: boolean; timerStarted: boolean; timerPaused: boolean;
    timeRemaining: number; elapsedSeconds: number;
    knockouts: number; returns: number; bonusesGiven: number;
    eliminated: Record<string, { eliminatedAt: number; knockedBy: string | null; returnMethod: ReturnMethod | null }>;
  };
  results?: { ranking: string[]; pointsAwarded: Record<string, number>; completedAt: number; winner: string };
}
export interface TournamentDraft {
  name: string; seasonId: string; startDate: number; startTime: string;
  registrationDuration: number; startingStack: number; finalTablePlayers: number;
  description: string; pointsForKnockout: boolean; knockoutPoints: number;
  rebuyChips: number; reentryChips: number; addonChips: number;
  structure: { levels: Level[]; breaks: Break[] };
  bonuses: Bonus[]; pointsTable: Record<string, number>;
  tables: { totalTables: number; seatsPerTable: number };
}
export interface TemplateData {
  startingStack: number; finalTablePlayers: number; pointsForKnockout: boolean;
  knockoutPoints: number; rebuyChips: number; reentryChips: number; addonChips: number;
  registrationDuration: number; description: string;
  structure: { levels: Level[]; breaks: Break[] };
  bonuses: Bonus[]; pointsTable: Record<string, number>;
  tables: { totalTables: number; seatsPerTable: number };
}
export interface Template { id: string; name: string; data: TemplateData }
export interface Season {
  id: string; name: string; startDate: number; endDate: number; isActive: boolean;
  tournaments: Record<string, true>;
  finalTable: { places: number; manualPlayers: string[]; finalTournamentId: string | null };
}
export interface Achievement {
  id: string; name: string; description: string; icon: string;
  conditionType: CondType; threshold: number; createdAt: number;
}
export interface Club {
  name: string; slogan: string; language: "ru" | "en";
  activeColor: string; bgColor: string; sound: boolean;
}

// ========== КОНСТАНТЫ ==========
export const ACCENTS: Record<string, { name: string; hex: string }> = {
  green: { name: "Сукно", hex: "#2fbf71" },
  blue: { name: "Синий", hex: "#4d8dff" },
  violet: { name: "Фиолет", hex: "#a06bff" },
  orange: { name: "Оранжевый", hex: "#ff8a3d" },
  pink: { name: "Розовый", hex: "#ff5d8f" },
};
export const BGS = [
  { name: "Графит", hex: "#0b0e15" },
  { name: "Тёмное сукно", hex: "#0a100d" },
  { name: "Глубокий пурпур", hex: "#110d18" },
  { name: "Сталь", hex: "#0d1219" },
  { name: "Уголь", hex: "#141210" },
];
export const KO_POINTS = 5;
export const DAY = 86400000;

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
export function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function applyTheme(club: Club) {
  if (typeof document === "undefined") return;
  const acc = ACCENTS[club.activeColor]?.hex ?? ACCENTS.green.hex;
  const root = document.documentElement.style;
  root.setProperty("--acc", acc);
  root.setProperty("--acc-soft", hexToRgba(acc, 0.14));
  root.setProperty("--acc-line", hexToRgba(acc, 0.42));
  root.setProperty("--acc-ink", "#0a1018");
  root.setProperty("--bg0", BGS.find((b) => b.hex === club.bgColor)?.hex ?? club.bgColor);
}

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function fmtNum(n: number) { return n.toLocaleString("ru-RU"); }

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateShort(ts: number) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ========== ПОМОЩНИКИ ДЛЯ РАСЧЁТОВ ==========
export function capacity(t: Tournament) { return t.tables.totalTables * t.tables.seatsPerTable; }

export function chipsInPlay(t: Tournament) {
  return Object.values(t.registeredPlayers).reduce((a, r) => a + (r.isEliminated ? 0 : r.chips), 0);
}

export function bankChips(t: Tournament) { 
  return Math.max(0, chipsInPlay(t) - (t.withdrawn ?? 0)); 
}

export function returnChipsFor(t: Tournament, method: ReturnMethod): number {
  if (method === "rebuy") return t.rebuyChips > 0 ? t.rebuyChips : t.startingStack;
  if (method === "reentry") return t.reentryChips > 0 ? t.reentryChips : t.startingStack;
  if (method === "addon") return t.addonChips > 0 ? t.addonChips : Math.round(t.startingStack / 2);
  return 0; // last_chance — сумма задаётся вручную на пульте
}

export function lateRegOpen(t: Tournament) {
  if (t.status === "planned") return true;
  if (t.status === "completed") return false;
  return t.pult.elapsedSeconds <= t.registrationDuration * 60;
}

export function levelInfo(t: Tournament) {
  const lvs = t.structure.levels;
  const idx = Math.min(Math.max(t.pult.currentLevel, 1), lvs.length);
  return { lv: lvs[idx - 1], idx, total: lvs.length, isBreak: t.pult.currentBreak };
}

export function nextLevelOf(t: Tournament): Level | null {
  const lvs = t.structure.levels;
  return t.pult.currentLevel < lvs.length ? lvs[t.pult.currentLevel] : null;
}

export function sortedSeatCodes(t: Tournament) {
  const out: string[] = [];
  const { totalTables, seatsPerTable } = t.tables;
  for (let tb = 1; tb <= totalTables; tb++) {
    for (let seat = 1; seat <= seatsPerTable; seat++) {
      out.push(`C${tb}-${seat}`);
    }
  }
  return out;
}

export function tableCounts(t: Tournament): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 1; i <= t.tables.totalTables; i++) counts[`C${i}`] = 0;
  sortedSeatCodes(t).forEach((c) => {
    if (t.tables.seats[c]) {
      const tb = c.split("-")[0];
      counts[tb] = (counts[tb] ?? 0) + 1;
    }
  });
  return counts;
}

export function balanceErrorForSeat(t: Tournament, code: string): string | null {
  const counts = tableCounts(t);
  const to = code.split("-")[0];
  const min = Math.min(...Object.values(counts));
  if ((counts[to] ?? 0) > min) {
    const emptiest = Object.entries(counts)
      .filter(([, c]) => c === min)
      .map(([tb]) => `стол ${tb.replace("C", "")}`)
      .join(" / ");
    return `Баланс столов: за стол ${to.replace("C", "")} уже ${counts[to]} ${plural(counts[to], "игрок", "игрока", "игроков")}, минимум — ${min}. Сажайте за ${emptiest}.`;
  }
  return null;
}

export function metricValue(u: User, c: CondType): number {
  switch (c) {
    case "totalTournaments": return u.stats.totalTournaments;
    case "wins": return u.stats.wins;
    case "top3": return u.stats.top3;
    case "finalTables": return u.stats.finalTables;
    case "knockouts": return u.stats.knockouts;
    case "rebuyAddon": return u.stats.rebuy + u.stats.addon;
    case "reentry": return u.stats.reentry;
    case "bestScore": return u.stats.bestScore;
  }
}

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ РЕЙТИНГА ==========
export function computeSeasonRating(users: Record<string, User>, tournaments: Record<string, Tournament>, seasonId: string) {
  const map: Record<string, { uid: string; points: number; games: number; wins: number; top3: number; ft: number; best: number; kos: number; rebs: number }> = {};
  const get = (u: string) => (map[u] ??= { uid: u, points: 0, games: 0, wins: 0, top3: 0, ft: 0, best: 0, kos: 0, rebs: 0 });
  
  Object.values(tournaments).forEach((t) => {
    if (t.seasonId !== seasonId || t.status !== "completed" || !t.results) return;
    t.results.ranking.forEach((u, i) => {
      const r = get(u); const place = i + 1;
      r.points += t.results!.pointsAwarded[u] ?? 0; r.games++;
      if (place === 1) r.wins++;
      if (place <= 3) r.top3++;
      if (place <= t.finalTablePlayers) r.ft++;
      r.best = Math.max(r.best, t.results!.pointsAwarded[u] ?? 0);
      const reg = t.registeredPlayers[u];
      if (reg) { r.kos += reg.knockouts; r.rebs += reg.rebuy + reg.addon + reg.reentry; }
    });
  });
  return Object.values(map).sort((a, b) => b.points - a.points || a.games - b.games);
}