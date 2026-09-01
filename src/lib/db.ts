import { useSyncExternalStore } from "react";

/* ============================== TYPES ============================== */
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
export interface Root {
  club: Club;
  users: Record<string, User>;
  seasons: Record<string, Season>;
  tournaments: Record<string, Tournament>;
  templates: Record<string, Template>;
  achievements: Record<string, Achievement>;
  screens: Record<string, { type: string; tournamentId: string | null }>;
  session: { uid: string | null; view: "club" | "player" };
}

/* ============================== CONSTANTS ============================== */
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

/* ============================== SOUND (Web Audio API) ============================== */
let AC: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (!AC) AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (AC.state === "suspended") void AC.resume();
    return AC;
  } catch { return null; }
}
function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = "sine", vol = 0.16) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + at);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + at); o.stop(c.currentTime + at + dur + 0.05);
}
export type SoundKind = "click" | "level" | "knockout" | "bonus" | "rebuy" | "win" | "error" | "brk" | "register";
export function playSound(kind: SoundKind) {
  if (!db.get().club.sound) return;
  const c = ac(); if (!c) return;
  switch (kind) {
    case "click": tone(c, 660, 0, 0.08, "triangle", 0.08); break;
    case "register": tone(c, 520, 0, 0.12, "sine"); tone(c, 780, 0.1, 0.16, "sine"); break;
    case "level": tone(c, 440, 0, 0.16, "sine"); tone(c, 587, 0.14, 0.2, "sine"); tone(c, 880, 0.28, 0.3, "sine", 0.2); break;
    case "brk": tone(c, 587, 0, 0.25, "sine"); tone(c, 440, 0.22, 0.35, "sine"); break;
    case "knockout": tone(c, 180, 0, 0.3, "sawtooth", 0.22); tone(c, 90, 0.05, 0.4, "sawtooth", 0.18); break;
    case "bonus": [1046, 1318, 1568, 2093].forEach((f, i) => tone(c, f, i * 0.07, 0.14, "triangle", 0.14)); break;
    case "rebuy": tone(c, 392, 0, 0.12, "square", 0.08); tone(c, 523, 0.1, 0.14, "square", 0.08); tone(c, 659, 0.2, 0.2, "square", 0.09); break;
    case "win": [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(c, f, i * 0.11, 0.22, "triangle", 0.16)); break;
    case "error": tone(c, 220, 0, 0.18, "sawtooth", 0.12); tone(c, 160, 0.12, 0.24, "sawtooth", 0.12); break;
  }
}

/* ============================== SEED ============================== */
function mkUser(u: Partial<User> & { uid: string; nickname: string; firstName: string; lastName: string }): User {
  return {
    email: `${u.nickname.toLowerCase()}@pd.club`, phone: "+7 900 000-00-00", role: "player", hue: 210,
    registrationDate: Date.now() - 300 * DAY, isBlocked: false, isArchived: false,
    stats: { totalTournaments: 0, wins: 0, top3: 0, finalTables: 0, knockouts: 0, rebuy: 0, addon: 0, reentry: 0, bestScore: 0, avgPlace: 0, bestPlace: 0, points: 0 },
    achievements: {}, tournamentHistory: {}, notifications: {},
    ...u,
  } as User;
}
const st = (p: Partial<UserStats>): UserStats => ({
  totalTournaments: 0, wins: 0, top3: 0, finalTables: 0, knockouts: 0, rebuy: 0, addon: 0, reentry: 0,
  bestScore: 0, avgPlace: 0, bestPlace: 0, points: 0, ...p,
});

const now = Date.now();
function seedLevels(): Level[] {
  return [
    { level: 1, sb: 25, bb: 50, ante: 0, duration: 12 },
    { level: 2, sb: 50, bb: 100, ante: 0, duration: 12 },
    { level: 3, sb: 75, bb: 150, ante: 25, duration: 12 },
    { level: 4, sb: 100, bb: 200, ante: 50, duration: 12 },
    { level: 5, sb: 150, bb: 300, ante: 75, duration: 15 },
    { level: 6, sb: 200, bb: 400, ante: 100, duration: 15 },
    { level: 7, sb: 300, bb: 600, ante: 150, duration: 15 },
    { level: 8, sb: 400, bb: 800, ante: 200, duration: 15 },
  ];
}
const stdPoints: Record<string, number> = { "1": 150, "2": 110, "3": 85, "4": 65, "5": 50, "6": 40, "7": 32, "8": 26, "9": 20, "10": 15, participation: 10 };

function seatCodes(tables: number, per: number) {
  const out: string[] = [];
  for (let t = 1; t <= tables; t++) for (let s = 1; s <= per; s++) out.push(`C${t}-${s}`);
  return out;
}
function mkReg(pn: number, seat: string | null, chips: number, extra: Partial<RegPlayer> = {}): RegPlayer {
  return { registeredAt: now - 2 * DAY, seatCode: seat, playerNumber: pn, isEliminated: false, chips, knockouts: 0, rebuy: 0, addon: 0, reentry: 0, ...extra };
}

function seed(): Root {
  const users: Record<string, User> = {};
  const list = [
    mkUser({ uid: "u-admin", nickname: "DealerMax", firstName: "Максим", lastName: "Орлов", role: "admin", hue: 152, email: "admin@pd.club", phone: "+7 921 300-10-01", registrationDate: now - 560 * DAY, stats: st({ totalTournaments: 42, wins: 6, top3: 15, finalTables: 22, knockouts: 48, rebuy: 9, addon: 4, reentry: 2, bestScore: 185, avgPlace: 4.2, bestPlace: 1, points: 1240 }) }),
    mkUser({ uid: "u-operator", nickname: "ChipQueen", firstName: "Ольга", lastName: "Соколова", role: "operator", hue: 320, email: "operator@pd.club", phone: "+7 921 300-10-02", registrationDate: now - 500 * DAY, stats: st({ totalTournaments: 28, wins: 2, top3: 7, finalTables: 12, knockouts: 22, rebuy: 4, addon: 1, reentry: 1, bestScore: 140, avgPlace: 5.1, bestPlace: 1, points: 620 }) }),
    mkUser({ uid: "p01", nickname: "RiverRat", firstName: "Артём", lastName: "Волков", hue: 205, stats: st({ totalTournaments: 38, wins: 5, top3: 13, finalTables: 19, knockouts: 41, rebuy: 7, addon: 2, reentry: 1, bestScore: 165, avgPlace: 4.0, bestPlace: 1, points: 1180 }) }),
    mkUser({ uid: "p02", nickname: "NutsHunter", firstName: "Даниил", lastName: "Крылов", hue: 260, stats: st({ totalTournaments: 33, wins: 4, top3: 11, finalTables: 16, knockouts: 35, rebuy: 5, addon: 3, reentry: 0, bestScore: 158, avgPlace: 4.4, bestPlace: 1, points: 1010 }) }),
    mkUser({ uid: "p03", nickname: "AllInAnna", firstName: "Анна", lastName: "Мельник", hue: 340, stats: st({ totalTournaments: 30, wins: 3, top3: 10, finalTables: 14, knockouts: 29, rebuy: 3, addon: 2, reentry: 2, bestScore: 142, avgPlace: 4.6, bestPlace: 1, points: 910 }) }),
    mkUser({ uid: "p04", nickname: "Tank", firstName: "Сергей", lastName: "Танков", hue: 25, stats: st({ totalTournaments: 27, wins: 2, top3: 8, finalTables: 12, knockouts: 24, rebuy: 6, addon: 1, reentry: 0, bestScore: 128, avgPlace: 5.0, bestPlace: 1, points: 780 }) }),
    mkUser({ uid: "p05", nickname: "SuitedKing", firstName: "Виктор", lastName: "Ланской", hue: 190, stats: st({ totalTournaments: 25, wins: 2, top3: 6, finalTables: 10, knockouts: 19, rebuy: 2, addon: 2, reentry: 1, bestScore: 118, avgPlace: 5.3, bestPlace: 1, points: 690 }) }),
    mkUser({ uid: "p06", nickname: "TiltQueen", firstName: "Мария", lastName: "Юдина", hue: 300, stats: st({ totalTournaments: 22, wins: 1, top3: 6, finalTables: 9, knockouts: 17, rebuy: 4, addon: 0, reentry: 1, bestScore: 104, avgPlace: 5.6, bestPlace: 1, points: 655 }) }),
    mkUser({ uid: "p07", nickname: "Grinder77", firstName: "Егор", lastName: "Громов", hue: 90, stats: st({ totalTournaments: 20, wins: 1, top3: 5, finalTables: 8, knockouts: 15, rebuy: 3, addon: 1, reentry: 0, bestScore: 96, avgPlace: 5.9, bestPlace: 1, points: 610 }) }),
    mkUser({ uid: "p08", nickname: "ColdDeck", firstName: "Павел", lastName: "Чудин", hue: 220, stats: st({ totalTournaments: 17, wins: 1, top3: 3, finalTables: 6, knockouts: 11, rebuy: 2, addon: 0, reentry: 0, bestScore: 88, avgPlace: 6.4, bestPlace: 1, points: 470 }) }),
    mkUser({ uid: "p09", nickname: "VegasKsu", firstName: "Ксения", lastName: "Раскина", hue: 45, stats: st({ totalTournaments: 14, wins: 0, top3: 3, finalTables: 5, knockouts: 9, rebuy: 5, addon: 1, reentry: 0, bestScore: 72, avgPlace: 6.8, bestPlace: 2, points: 405 }) }),
    mkUser({ uid: "p10", nickname: "SetMiner", firstName: "Тимур", lastName: "Алиев", hue: 170, stats: st({ totalTournaments: 11, wins: 0, top3: 2, finalTables: 4, knockouts: 7, rebuy: 1, addon: 1, reentry: 0, bestScore: 58, avgPlace: 7.1, bestPlace: 3, points: 315 }) }),
    mkUser({ uid: "p11", nickname: "NinaNutz", firstName: "Нина", lastName: "Зайцева", hue: 355, stats: st({ totalTournaments: 8, wins: 0, top3: 1, finalTables: 2, knockouts: 4, rebuy: 1, addon: 0, reentry: 0, bestScore: 40, avgPlace: 7.6, bestPlace: 3, points: 210 }) }),
    mkUser({ uid: "p12", nickname: "FishEye", firstName: "Илья", lastName: "Кротов", hue: 235, isBlocked: true, stats: st({ totalTournaments: 6, wins: 0, top3: 0, finalTables: 1, knockouts: 2, rebuy: 0, addon: 0, reentry: 0, bestScore: 20, avgPlace: 8.3, bestPlace: 5, points: 95 }) }),
    mkUser({ uid: "p13", nickname: "GlebAllDay", firstName: "Глеб", lastName: "Архипов", hue: 130, isArchived: true, stats: st({ totalTournaments: 4, wins: 0, top3: 0, finalTables: 0, knockouts: 1, rebuy: 0, addon: 0, reentry: 0, bestScore: 10, avgPlace: 9.0, bestPlace: 7, points: 40 }) }),
  ];
  list.forEach((u) => (users[u.uid] = u));

  const notif = (title: string, message: string, type: Notification["type"], ts: number): Notification =>
    ({ id: uid(), title, message, type, read: false, timestamp: ts });
  users["u-admin"].notifications = {
    n1: notif("Экраны обновлены", "Основной экран переключён на «Кубок Пиковой Дамы»", "club", now - 3600e3),
    n2: notif("Новый участник", "Нина Зайцева зарегистрировалась в клубе", "account", now - 26 * 3600e3),
  };
  users["p01"].notifications = {
    n3: notif("Вы записаны на турнир", "«Кубок Пиковой Дамы» — сегодня в 19:00. Стол 1, место 1.", "tournament", now - 5 * 3600e3),
    n4: notif("Клубное объявление", "В субботу в 18:00 — «Субботний MTT». Регистрация открыта!", "club", now - DAY),
    n5: notif("Достижение получено", "«Охотник за баунти» — 15 выбитых игроков", "account", now - 3 * DAY),
  };
  users["u-admin"].achievements = {
    a1: { earnedAt: now - 500 * DAY, achievementName: "Первые шаги" },
    a3: { earnedAt: now - 420 * DAY, achievementName: "Чемпион" },
    a6: { earnedAt: now - 400 * DAY, achievementName: "Финалист" },
    a7: { earnedAt: now - 120 * DAY, achievementName: "Охотник за баунти" },
    a8: { earnedAt: now - 90 * DAY, achievementName: "Марафонец" },
  };
  users["p01"].achievements = {
    a1: { earnedAt: now - 450 * DAY, achievementName: "Первые шаги" },
    a3: { earnedAt: now - 300 * DAY, achievementName: "Чемпион" },
    a5: { earnedAt: now - 80 * DAY, achievementName: "Пьедестал" },
    a6: { earnedAt: now - 60 * DAY, achievementName: "Финалист" },
    a7: { earnedAt: now - 3 * DAY, achievementName: "Охотник за баунти" },
  };
  users["p03"].achievements = { a1: { earnedAt: now - 400 * DAY, achievementName: "Первые шаги" }, a3: { earnedAt: now - 100 * DAY, achievementName: "Чемпион" } };
  users["p09"].achievements = { a1: { earnedAt: now - 200 * DAY, achievementName: "Первые шаги" }, a8: { earnedAt: now - 20 * DAY, achievementName: "Марафонец" } };

  const ach = (id: string, name: string, description: string, icon: string, conditionType: CondType, threshold: number): Achievement =>
    ({ id, name, description, icon, conditionType, threshold, createdAt: now - 200 * DAY });
  const achievements: Record<string, Achievement> = {};
  [
    ach("a1", "Первые шаги", "Сыграть первый турнир в клубе", "cards", "totalTournaments", 1),
    ach("a2", "Ветеран клуба", "Сыграть 25 турниров", "shield", "totalTournaments", 25),
    ach("a3", "Чемпион", "Одержать первую победу", "crown", "wins", 1),
    ach("a4", "Серийный чемпион", "Одержать 5 побед", "trophy", "wins", 5),
    ach("a5", "Пьедестал", "5 попаданий в топ-3", "medal", "top3", 5),
    ach("a6", "Финалист", "Сыграть за финальным столом", "star", "finalTables", 1),
    ach("a7", "Охотник за баунти", "Выбить 15 игроков", "target", "knockouts", 15),
    ach("a8", "Марафонец", "5 ребаев и адд-онов суммарно", "bolt", "rebuyAddon", 5),
    ach("a9", "Рекордсмен", "Набрать 150+ очков за турнир", "diamond", "bestScore", 150),
  ].forEach((a) => (achievements[a.id] = a));

  /* ---- active tournament ---- */
  const seats: Record<string, string> = {};
  const assign: Array<[string, string]> = [
    ["p01", "C1-1"], ["p02", "C1-2"], ["p03", "C1-3"], ["u-admin", "C1-4"], ["u-operator", "C1-5"],
    ["p04", "C1-6"], ["p06", "C1-7"], ["p07", "C1-8"], ["p10", "C1-9"],
    ["p05", "C2-1"], ["p08", "C2-2"], ["p09", "C2-3"],
  ];
  assign.forEach(([u, s]) => (seats[s] = u));
  const tActive: Tournament = {
    id: "t-active", status: "active", name: "Кубок Пиковой Дамы", seasonId: "s1",
    startDate: now - 2 * 3600e3, startTime: "19:00", registrationDuration: 40,
    startingStack: 15000, finalTablePlayers: 9, description: "Флагманский турнир клуба. Поздняя регистрация 40 минут, баунти за выбивание.",
    pointsForKnockout: true, knockoutPoints: 5, rebuyChips: 15000, reentryChips: 15000, addonChips: 7500, createdAt: now - 9 * DAY,
    structure: { levels: seedLevels(), breaks: [{ afterLevel: 4, duration: 10 }, { afterLevel: 6, duration: 10 }] },
    bonuses: [
      { id: "b1", name: "Ранний бонус", chips: 3000 },
      { id: "b2", name: "Двойной стек", chips: 5000 },
      { id: "b3", name: "Приз чиплидера", chips: 2000 },
    ],
    pointsTable: { ...stdPoints },
    tables: { totalTables: 2, seatsPerTable: 9, seats },
    registeredPlayers: {
      p01: mkReg(1, "C1-1", 48200, { knockouts: 2 }),
      p02: mkReg(2, "C1-2", 31500, { knockouts: 1 }),
      p03: mkReg(3, "C1-3", 27400, { knockouts: 1 }),
      "u-admin": mkReg(4, "C1-4", 22100),
      "u-operator": mkReg(5, "C1-5", 18900),
      p04: mkReg(6, "C1-6", 16200),
      p06: mkReg(7, "C1-7", 14800),
      p07: mkReg(8, "C1-8", 12600),
      p10: mkReg(9, "C1-9", 9800),
      p05: mkReg(10, "C2-1", 0, { isEliminated: true }),
      p08: mkReg(11, "C2-2", 0, { isEliminated: true }),
      p09: mkReg(12, "C2-3", 0, { isEliminated: true, rebuy: 1 }),
    },
    pult: {
      currentLevel: 3, currentBreak: false, timerStarted: true, timerPaused: false,
      timeRemaining: 437, elapsedSeconds: 1723,
      knockouts: 3, returns: 1, bonusesGiven: 2,
      eliminated: {
        p05: { eliminatedAt: now - 42 * 60e3, knockedBy: "p01", returnMethod: null },
        p09: { eliminatedAt: now - 18 * 60e3, knockedBy: "p03", returnMethod: "rebuy" },
        p08: { eliminatedAt: now - 9 * 60e3, knockedBy: "p02", returnMethod: null },
      },
    },
  };

  /* ---- planned ---- */
  const tPlan1: Tournament = {
    id: "t-plan1", status: "planned", name: "Субботний MTT", seasonId: "s1",
    startDate: now + 2 * DAY, startTime: "18:00", registrationDuration: 30,
    startingStack: 12000, finalTablePlayers: 9, description: "Еженедельный субботний турнир для всех уровней подготовки.",
    pointsForKnockout: false, knockoutPoints: 0, rebuyChips: 12000, reentryChips: 12000, addonChips: 6000, createdAt: now - 4 * DAY,
    structure: { levels: seedLevels().slice(0, 7), breaks: [{ afterLevel: 4, duration: 10 }] },
    bonuses: [{ id: "b4", name: "Бонус ранней регистрации", chips: 2000 }],
    pointsTable: { ...stdPoints },
    tables: { totalTables: 2, seatsPerTable: 9, seats: {} },
    registeredPlayers: {
      p01: mkReg(1, null, 0), p02: mkReg(2, null, 0), p03: mkReg(3, null, 0), p06: mkReg(4, null, 0),
    },
    pult: { currentLevel: 1, currentBreak: false, timerStarted: false, timerPaused: false, timeRemaining: 0, elapsedSeconds: 0, knockouts: 0, returns: 0, bonusesGiven: 0, eliminated: {} },
  };
  const tPlan2: Tournament = {
    id: "t-plan2", status: "planned", name: "Хайроллер: Осенний финал", seasonId: "s1",
    startDate: now + 6 * DAY, startTime: "19:30", registrationDuration: 45,
    startingStack: 30000, finalTablePlayers: 8, description: "Турнир с высоким вступительным взносом и глубокими стеками.",
    pointsForKnockout: true, knockoutPoints: 8, rebuyChips: 30000, reentryChips: 30000, addonChips: 15000, createdAt: now - 2 * DAY,
    structure: { levels: seedLevels().map((l) => ({ ...l, duration: 20 })), breaks: [{ afterLevel: 3, duration: 15 }, { afterLevel: 6, duration: 15 }] },
    bonuses: [{ id: "b5", name: "Хайроллер-бонус", chips: 10000 }],
    pointsTable: { "1": 220, "2": 160, "3": 120, "4": 90, "5": 70, "6": 55, "7": 45, "8": 35, participation: 15 },
    tables: { totalTables: 2, seatsPerTable: 9, seats: {} },
    registeredPlayers: { p01: mkReg(1, null, 0), "u-admin": mkReg(2, null, 0) },
    pult: { currentLevel: 1, currentBreak: false, timerStarted: false, timerPaused: false, timeRemaining: 0, elapsedSeconds: 0, knockouts: 0, returns: 0, bonusesGiven: 0, eliminated: {} },
  };

  /* ---- completed ---- */
  const done = (id: string, name: string, seasonId: string, completedAt: number, ranking: string[], ko: boolean): Tournament => {
    const pointsAwarded: Record<string, number> = {};
    ranking.forEach((u, i) => (pointsAwarded[u] = (stdPoints[String(i + 1)] ?? stdPoints.participation) + (ko && i < 3 ? 10 : 0)));
    const rp: Record<string, RegPlayer> = {};
    ranking.forEach((u, i) => (rp[u] = mkReg(i + 1, `C1-${i + 1}`, 0, { isEliminated: i > 0, knockouts: i < 2 ? 2 : 0 })));
    return {
      id, status: "completed", name, seasonId, startDate: completedAt - 5 * 3600e3, startTime: "19:00",
      registrationDuration: 30, startingStack: 15000, finalTablePlayers: 9,
      description: "Турнир завершён.", pointsForKnockout: ko, knockoutPoints: ko ? 5 : 0,
      rebuyChips: 15000, reentryChips: 15000, addonChips: 7500, createdAt: completedAt - 12 * DAY,
      structure: { levels: seedLevels(), breaks: [{ afterLevel: 4, duration: 10 }] },
      bonuses: [{ id: uid(), name: "Ранний бонус", chips: 3000 }],
      pointsTable: { ...stdPoints },
      tables: { totalTables: 2, seatsPerTable: 9, seats: {} },
      registeredPlayers: rp,
      pult: { currentLevel: 8, currentBreak: false, timerStarted: false, timerPaused: false, timeRemaining: 0, elapsedSeconds: 8000, knockouts: ranking.length - 1, returns: 0, bonusesGiven: 2, eliminated: {} },
      results: { ranking, pointsAwarded, completedAt, winner: ranking[0] },
    };
  };
  const tDone1 = done("t-done1", "Зимний марафон", "s2", now - 95 * DAY, ["p02", "p01", "p05", "u-admin", "p03", "p06", "p07", "p04", "p09", "p10"], false);
  const tDone2 = done("t-done2", "Кубок открытия", "s1", now - 6 * DAY, ["p01", "p03", "p02", "p04", "u-admin", "p06", "p09", "p05"], true);

  users["p01"].tournamentHistory = {
    "t-done2": { place: 1, points: 160, knockouts: 3, rebuy: 0, addon: 0, reentry: 0, date: now - 6 * DAY },
    "t-done1": { place: 2, points: 120, knockouts: 2, rebuy: 1, addon: 0, reentry: 0, date: now - 95 * DAY },
  };
  users["p03"].tournamentHistory = { "t-done2": { place: 2, points: 120, knockouts: 2, rebuy: 0, addon: 0, reentry: 0, date: now - 6 * DAY } };
  users["u-admin"].tournamentHistory = { "t-done2": { place: 5, points: 60, knockouts: 1, rebuy: 0, addon: 0, reentry: 0, date: now - 6 * DAY } };

  const seasons: Record<string, Season> = {
    s1: { id: "s1", name: "Сезон 2026 «Пиковая Дама»", startDate: new Date(2026, 0, 10).getTime(), endDate: new Date(2026, 11, 20).getTime(), isActive: true, tournaments: { "t-active": true, "t-plan1": true, "t-plan2": true, "t-done2": true }, finalTable: { places: 9, manualPlayers: [], finalTournamentId: null } },
    s2: { id: "s2", name: "Сезон 2025", startDate: new Date(2025, 0, 15).getTime(), endDate: new Date(2025, 11, 28).getTime(), isActive: false, tournaments: { "t-done1": true }, finalTable: { places: 9, manualPlayers: [], finalTournamentId: "t-done1" } },
  };

  const tplData = (stack: number, durs: number, desc: string): TemplateData => ({
    startingStack: stack, finalTablePlayers: 9, pointsForKnockout: true, knockoutPoints: 5,
    rebuyChips: stack, reentryChips: stack, addonChips: Math.round(stack / 2),
    registrationDuration: 30, description: desc,
    structure: { levels: seedLevels().map((l) => ({ ...l, duration: durs })), breaks: [{ afterLevel: 4, duration: 10 }] },
    bonuses: [{ id: uid(), name: "Ранний бонус", chips: 3000 }],
    pointsTable: { ...stdPoints },
    tables: { totalTables: 2, seatsPerTable: 9 },
  });
  const templates: Record<string, Template> = {
    "tpl-std": { id: "tpl-std", name: "Стандартный MTT", data: tplData(15000, 12, "Классическая структура клуба на 8 уровней.") },
    "tpl-turbo": { id: "tpl-turbo", name: "Турбо", data: tplData(10000, 8, "Быстрая структура для вечерних турбо-турниров.") },
    "tpl-hr": { id: "tpl-hr", name: "Хайроллер", data: { ...tplData(30000, 20, "Глубокие стеки, длинные уровни."), pointsTable: { "1": 220, "2": 160, "3": 120, "4": 90, "5": 70, "6": 55, "7": 45, "8": 35, participation: 15 } } },
  };

  return {
    club: {
      name: "ПИКОВАЯ ДАМА", slogan: "Клуб спортивного покера «Пиковая Дама» ♠ Турниры каждый вечер в 19:00 ♠ Сезон 2026 в разгаре ♠ Рейк 0% — только спортивный интерес ♠",
      language: "ru", activeColor: "green", bgColor: "#0b0e15", sound: true,
    },
    users, seasons,
    tournaments: { "t-active": tActive, "t-plan1": tPlan1, "t-plan2": tPlan2, "t-done1": tDone1, "t-done2": tDone2 },
    templates, achievements,
    screens: {
      main: { type: "main", tournamentId: "t-active" },
      final: { type: "final-table", tournamentId: "t-active" },
      results: { type: "results", tournamentId: "t-done2" },
      ranking: { type: "ranking", tournamentId: null },
    },
    session: { uid: null, view: "club" },
  };
}

/* ============================== STORE ============================== */
const KEY = "pd-club-db-v2";
function load(): Root | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Root;
    if (!parsed.users || !parsed.tournaments) return null;
    return parsed;
  } catch { return null; }
}
let saveT: ReturnType<typeof setTimeout> | null = null;
function persist(s: Root) {
  if (saveT) clearTimeout(saveT);
  saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ } }, 400);
}

class Store {
  state: Root;
  private subs = new Set<() => void>();
  constructor() { this.state = load() ?? seed(); }
  get = (): Root => this.state;
  subscribe = (fn: () => void) => { this.subs.add(fn); return () => { this.subs.delete(fn); }; };
  mutate(fn: (s: Root) => void) {
    const draft = structuredClone(this.state);
    fn(draft);
    this.state = draft;
    this.subs.forEach((f) => f());
    persist(this.state);
  }
  reset() {
    localStorage.removeItem(KEY);
    this.state = seed();
    this.subs.forEach((f) => f());
  }
}
export const db = new Store();
export function useDb(): Root { return useSyncExternalStore(db.subscribe, db.get); }
export function useMe(): User | null {
  const s = useDb();
  return s.session.uid ? s.users[s.session.uid] ?? null : null;
}
export function can(s: Root, what: "operate" | "admin") {
  const me = s.session.uid ? s.users[s.session.uid] : null;
  if (!me) return false;
  return what === "operate" ? me.role !== "player" : me.role === "admin";
}

/* ============================== HELPERS ============================== */
export function capacity(t: Tournament) { return t.tables.totalTables * t.tables.seatsPerTable; }
export function chipsInPlay(t: Tournament) {
  return Object.values(t.registeredPlayers).reduce((a, r) => a + (r.isEliminated ? 0 : r.chips), 0);
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
export function sortedSeatCodes(t: Tournament) { return seatCodes(t.tables.totalTables, t.tables.seatsPerTable); }

export function computeSeasonRating(s: Root, seasonId: string) {
  const map: Record<string, { uid: string; points: number; games: number; wins: number; top3: number; ft: number; best: number; kos: number; rebs: number }> = {};
  const get = (u: string) => (map[u] ??= { uid: u, points: 0, games: 0, wins: 0, top3: 0, ft: 0, best: 0, kos: 0, rebs: 0 });
  Object.values(s.tournaments).forEach((t) => {
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

function notifyUser(s: Root, targetUid: string, title: string, message: string, type: Notification["type"]) {
  const u = s.users[targetUid]; if (!u) return;
  const id = uid();
  u.notifications[id] = { id, title, message, type, read: false, timestamp: Date.now() };
}
function broadcast(s: Root, title: string, message: string) {
  Object.keys(s.users).forEach((u) => notifyUser(s, u, title, message, "club"));
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

/* ============================== ACTIONS: AUTH / CLUB ============================== */
export function login(loginUid: string): string | null {
  const u = db.get().users[loginUid];
  if (!u) return "Пользователь не найден";
  if (u.isBlocked) return "Аккаунт заблокирован администратором";
  db.mutate((s) => {
    s.session.uid = loginUid;
    s.session.view = u.role === "player" ? "player" : "club";
  });
  playSound("click");
  return null;
}
export function logout() { db.mutate((s) => { s.session.uid = null; }); }
export function setView(view: "club" | "player") { db.mutate((s) => { s.session.view = view; }); playSound("click"); }
export function registerUser(d: { nickname: string; firstName: string; lastName: string; email: string; phone: string }): string | null {
  const s0 = db.get();
  const n = d.nickname.trim();
  if (!n) return "Укажите никнейм";
  if (Object.values(s0.users).some((u) => u.nickname.toLowerCase() === n.toLowerCase())) return "Никнейм уже занят";
  if (d.email.trim() && Object.values(s0.users).some((u) => u.email.toLowerCase() === d.email.trim().toLowerCase())) return "Этот e-mail уже зарегистрирован";
  const id = uid();
  db.mutate((s) => {
    s.users[id] = mkUser({
      uid: id, nickname: n, firstName: d.firstName.trim(), lastName: d.lastName.trim(),
      email: d.email.trim(), phone: d.phone.trim(), role: "player",
      hue: Math.floor(Math.random() * 360), registrationDate: Date.now(),
    });
    s.session.uid = id; s.session.view = "player";
    notifyUser(s, id, "Добро пожаловать в клуб!", `Регистрация завершена — вам присвоена роль «Игрок». Запишитесь на ближайший турнир в разделе «Турниры».`, "account");
  });
  playSound("register");
  return null;
}
export function updateClub(patch: Partial<Club>) {
  db.mutate((s) => { Object.assign(s.club, patch); });
  applyTheme({ ...db.get().club });
}
export function resetDemo() { db.reset(); applyTheme(db.get().club); }
export function updateProfile(targetUid: string, patch: Partial<Pick<User, "nickname" | "firstName" | "lastName" | "phone" | "email" | "hue" | "avatar">>) {
  db.mutate((s) => { Object.assign(s.users[targetUid], patch); });
}
export function markAllRead(targetUid: string) {
  db.mutate((s) => { Object.values(s.users[targetUid]?.notifications ?? {}).forEach((n) => (n.read = true)); });
}
export function markRead(targetUid: string, nid: string) {
  db.mutate((s) => { const n = s.users[targetUid]?.notifications[nid]; if (n) n.read = true; });
}

/* ============================== ACTIONS: USERS (admin) ============================== */
export function adminSaveUser(targetUid: string | null, data: { nickname: string; firstName: string; lastName: string; email: string; phone: string; role: Role; startPoints: number; hue: number }): string | null {
  const s0 = db.get();
  const dup = Object.values(s0.users).find((u) => u.nickname.toLowerCase() === data.nickname.toLowerCase() && u.uid !== targetUid);
  if (dup) return "Никнейм уже занят";
  db.mutate((s) => {
    if (targetUid && s.users[targetUid]) {
      const u = s.users[targetUid];
      u.nickname = data.nickname; u.firstName = data.firstName; u.lastName = data.lastName;
      u.email = data.email; u.phone = data.phone; u.role = data.role; u.hue = data.hue;
      if (data.startPoints > 0) u.stats.points += data.startPoints;
    } else {
      const id = uid();
      s.users[id] = mkUser({
        uid: id, nickname: data.nickname, firstName: data.firstName, lastName: data.lastName,
        email: data.email, phone: data.phone, role: data.role, hue: data.hue, registrationDate: Date.now(),
        stats: st({ points: data.startPoints }),
      });
      notifyUser(s, id, "Добро пожаловать в клуб!", `Вы зарегистрированы в клубе «${s.club.name}». Стартовые очки: ${data.startPoints}.`, "account");
    }
  });
  return null;
}
export function toggleBlock(targetUid: string) { db.mutate((s) => { const u = s.users[targetUid]; u.isBlocked = !u.isBlocked; if (u.isBlocked) notifyUser(s, targetUid, "Аккаунт заблокирован", "Обратитесь к администратору клуба.", "account"); }); }
export function toggleArchive(targetUid: string) { db.mutate((s) => { const u = s.users[targetUid]; u.isArchived = !u.isArchived; }); }
export function removeUser(targetUid: string) {
  db.mutate((s) => {
    delete s.users[targetUid];
    Object.values(s.tournaments).forEach((t) => {
      if (t.registeredPlayers[targetUid]) {
        const seat = t.registeredPlayers[targetUid].seatCode;
        if (seat) delete t.tables.seats[seat];
        delete t.registeredPlayers[targetUid];
      }
    });
  });
}

/* ============================== ACTIONS: TOURNAMENTS ============================== */
export interface TournamentDraft {
  name: string; seasonId: string; startDate: number; startTime: string;
  registrationDuration: number; startingStack: number; finalTablePlayers: number;
  description: string; pointsForKnockout: boolean;
  knockoutPoints: number; rebuyChips: number; reentryChips: number; addonChips: number;
  structure: { levels: Level[]; breaks: Break[] };
  bonuses: Bonus[]; pointsTable: Record<string, number>;
  tables: { totalTables: number; seatsPerTable: number };
}
export function saveTournament(id: string | null, d: TournamentDraft): string | null {
  if (!d.name.trim()) return "Укажите название турнира";
  if (d.structure.levels.length === 0) return "Добавьте хотя бы один уровень блайндов";
  const dup = Object.values(db.get().tournaments).find((t) => t.name.toLowerCase() === d.name.trim().toLowerCase() && t.id !== id);
  if (dup) return "Турнир с таким названием уже существует";
  db.mutate((s) => {
    const tid = id ?? uid();
    const prev = id ? s.tournaments[id] : null;
    s.tournaments[tid] = {
      id: tid, status: "planned", name: d.name.trim(), seasonId: d.seasonId,
      startDate: d.startDate, startTime: d.startTime, registrationDuration: d.registrationDuration,
      startingStack: d.startingStack, finalTablePlayers: d.finalTablePlayers, description: d.description,
      pointsForKnockout: d.pointsForKnockout, knockoutPoints: d.knockoutPoints,
      rebuyChips: d.rebuyChips, reentryChips: d.reentryChips, addonChips: d.addonChips,
      isFinal: prev?.isFinal, withdrawn: prev?.withdrawn, createdAt: prev?.createdAt ?? Date.now(),
      structure: d.structure, bonuses: d.bonuses, pointsTable: d.pointsTable,
      tables: { totalTables: d.tables.totalTables, seatsPerTable: d.tables.seatsPerTable, seats: prev?.tables.seats ?? {} },
      registeredPlayers: prev?.registeredPlayers ?? {},
      pult: prev?.pult ?? { currentLevel: 1, currentBreak: false, timerStarted: false, timerPaused: false, timeRemaining: 0, elapsedSeconds: 0, knockouts: 0, returns: 0, bonusesGiven: 0, eliminated: {} },
      results: prev?.results,
    };
    if (s.seasons[d.seasonId]) s.seasons[d.seasonId].tournaments[tid] = true;
    if (!id) broadcast(s, "Новый турнир", `Открыта регистрация: «${d.name.trim()}» — ${fmtDate(d.startDate)} в ${d.startTime}.`);
  });
  playSound("register");
  return null;
}
export function deleteTournament(tid: string) {
  db.mutate((s) => {
    const t = s.tournaments[tid]; if (!t) return;
    if (s.seasons[t.seasonId]) delete s.seasons[t.seasonId].tournaments[tid];
    delete s.tournaments[tid];
  });
}
export function launchTournament(tid: string): string | null {
  const t = db.get().tournaments[tid]; if (!t) return "Турнир не найден";
  const seated = Object.values(t.registeredPlayers).filter((r) => r.seatCode).length;
  if (seated < 2) return "Для старта необходимо рассадить минимум 2 участников";
  db.mutate((s) => {
    const tt = s.tournaments[tid];
    tt.status = "active";
    tt.startDate = Date.now();
    Object.values(tt.registeredPlayers).forEach((r) => { r.chips = tt.startingStack; r.isEliminated = false; });
    tt.pult = { currentLevel: 1, currentBreak: false, timerStarted: true, timerPaused: false, timeRemaining: tt.structure.levels[0].duration * 60, elapsedSeconds: 0, knockouts: 0, returns: 0, bonusesGiven: 0, eliminated: {} };
    Object.keys(tt.registeredPlayers).forEach((u) => notifyUser(s, u, "Турнир стартовал!", `«${tt.name}» начался. Уровень 1: ${tt.structure.levels[0].sb}/${tt.structure.levels[0].bb}. Удачи!`, "tournament"));
  });
  playSound("level");
  return null;
}
function addReg(s: Root, tid: string, targetUid: string) {
  const t = s.tournaments[tid]; if (!t || t.registeredPlayers[targetUid]) return;
  t.registeredPlayers[targetUid] = { registeredAt: Date.now(), seatCode: null, playerNumber: null, isEliminated: false, chips: t.status === "active" ? t.startingStack : 0, knockouts: 0, rebuy: 0, addon: 0, reentry: 0 };
}
export function registerSelf(tid: string, targetUid: string): string | null {
  const t = db.get().tournaments[tid];
  if (!t) return "Турнир не найден";
  if (t.isFinal && !t.registeredPlayers[targetUid]) return "Турнир по приглашениям: регистрация закрыта";
  if (Object.keys(t.registeredPlayers).length >= capacity(t)) return "Все места заняты";
  if (!lateRegOpen(t)) return "Регистрация завершена";
  db.mutate((s) => {
    addReg(s, tid, targetUid);
    const tt = s.tournaments[tid];
    notifyUser(s, targetUid, "Вы записаны на турнир", `«${tt.name}» — ${fmtDate(tt.startDate)} в ${tt.startTime}.`, "tournament");
  });
  playSound("register");
  return null;
}
export function cancelSelf(tid: string, targetUid: string) {
  db.mutate((s) => {
    const t = s.tournaments[tid]; const r = t.registeredPlayers[targetUid]; if (!r) return;
    if (r.seatCode) delete t.tables.seats[r.seatCode];
    delete t.registeredPlayers[targetUid];
    notifyUser(s, targetUid, "Регистрация отменена", `Вы отменили запись на «${t.name}».`, "tournament");
  });
}
export function setPlayerNumber(tid: string, targetUid: string, num: number | null) {
  db.mutate((s) => { s.tournaments[tid].registeredPlayers[targetUid].playerNumber = num; });
}
export function setSeat(tid: string, targetUid: string, code: string | null): string | null {
  const t = db.get().tournaments[tid];
  if (code && t.tables.seats[code] && t.tables.seats[code] !== targetUid) return "Место уже занято";
  db.mutate((s) => {
    const tt = s.tournaments[tid]; const r = tt.registeredPlayers[targetUid]; if (!r) return;
    if (r.seatCode) delete tt.tables.seats[r.seatCode];
    r.seatCode = code;
    if (code) tt.tables.seats[code] = targetUid;
  });
  playSound("click");
  return null;
}
export function seatRandom(tid: string) {
  db.mutate((s) => {
    const t = s.tournaments[tid];
    const empty = sortedSeatCodes(t).filter((c) => !t.tables.seats[c]);
    const unseated = Object.entries(t.registeredPlayers).filter(([, r]) => !r.seatCode);
    for (let i = empty.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [empty[i], empty[j]] = [empty[j], empty[i]]; }
    unseated.forEach(([u, r], i) => { if (empty[i]) { r.seatCode = empty[i]; t.tables.seats[empty[i]] = u; } });
  });
  playSound("register");
}
export function seatByRating(tid: string) {
  db.mutate((s) => {
    const t = s.tournaments[tid];
    const unseated = Object.entries(t.registeredPlayers).filter(([, r]) => !r.seatCode)
      .sort((a, b) => (s.users[b[0]]?.stats.points ?? 0) - (s.users[a[0]]?.stats.points ?? 0));
    const all = sortedSeatCodes(t);
    const byTable: Record<string, string[]> = {};
    all.forEach((c) => { const tb = c.split("-")[0]; (byTable[tb] ??= []).push(c); });
    const ordered: string[] = [];
    Object.keys(byTable).sort().forEach((tb, i) => {
      const seats = byTable[tb]; if (i % 2 === 1) seats.reverse();
      ordered.push(...seats);
    });
    const empty = ordered.filter((c) => !t.tables.seats[c]);
    unseated.forEach(([u, r], i) => { if (empty[i]) { r.seatCode = empty[i]; t.tables.seats[empty[i]] = u; } });
  });
  playSound("register");
}

/* ============================== ACTIONS: PULT ============================== */
function advanceLevel(t: Tournament) {
  const p = t.pult, lvs = t.structure.levels;
  if (p.currentBreak) {
    p.currentBreak = false;
    p.currentLevel = Math.min(p.currentLevel + 1, lvs.length);
    p.timeRemaining = lvs[p.currentLevel - 1].duration * 60;
    playSound("level");
  } else {
    const bk = t.structure.breaks.find((b) => b.afterLevel === p.currentLevel);
    if (bk && p.currentLevel < lvs.length) { p.currentBreak = true; p.timeRemaining = bk.duration * 60; playSound("brk"); }
    else if (p.currentLevel < lvs.length) { p.currentLevel++; p.timeRemaining = lvs[p.currentLevel - 1].duration * 60; playSound("level"); }
    else { p.timerStarted = false; p.timeRemaining = 0; }
  }
}
export function tickTimers() {
  const s0 = db.get();
  const any = Object.values(s0.tournaments).some((t) => t.status === "active" && t.pult.timerStarted && !t.pult.timerPaused && t.pult.timeRemaining > 0);
  if (!any) return;
  db.mutate((s) => {
    Object.values(s.tournaments).forEach((t) => {
      if (t.status === "active" && t.pult.timerStarted && !t.pult.timerPaused && t.pult.timeRemaining > 0) {
        t.pult.timeRemaining--; t.pult.elapsedSeconds++;
        if (t.pult.timeRemaining <= 0) advanceLevel(t);
      }
    });
  });
}
export function togglePause(tid: string) {
  db.mutate((s) => { const p = s.tournaments[tid].pult; p.timerPaused = !p.timerPaused; p.timerStarted = true; });
  playSound("click");
}
export function stepLevel(tid: string, dir: 1 | -1) {
  db.mutate((s) => {
    const t = s.tournaments[tid]; const lvs = t.structure.levels;
    t.pult.currentBreak = false;
    t.pult.currentLevel = Math.min(Math.max(t.pult.currentLevel + dir, 1), lvs.length);
    t.pult.timeRemaining = lvs[t.pult.currentLevel - 1].duration * 60;
    t.pult.timerStarted = true;
  });
  playSound("level");
}
export function addMinute(tid: string, delta: number) {
  db.mutate((s) => { const p = s.tournaments[tid].pult; p.timeRemaining = Math.max(0, p.timeRemaining + delta * 60); if (p.timeRemaining > 0) p.timerStarted = true; });
  playSound("click");
}
export function startBreak(tid: string) {
  db.mutate((s) => {
    const t = s.tournaments[tid];
    const bk = t.structure.breaks.find((b) => b.afterLevel === t.pult.currentLevel);
    t.pult.currentBreak = true;
    t.pult.timeRemaining = (bk?.duration ?? 10) * 60;
    t.pult.timerStarted = true; t.pult.timerPaused = false;
  });
  playSound("brk");
}
export function eliminate(tid: string, targetUid: string, byUid: string | null): string | null {
  const t = db.get().tournaments[tid];
  const r = t.registeredPlayers[targetUid];
  if (!r || r.isEliminated) return "Игрок уже выбыл";
  db.mutate((s) => {
    const tt = s.tournaments[tid];
    const reg = tt.registeredPlayers[targetUid];
    const chips = reg.chips;
    if (byUid && tt.registeredPlayers[byUid] && byUid !== targetUid) {
      tt.registeredPlayers[byUid].chips += chips;
      tt.registeredPlayers[byUid].knockouts++;
    }
    reg.isEliminated = true; reg.chips = 0;
    tt.pult.eliminated[targetUid] = { eliminatedAt: Date.now(), knockedBy: byUid || null, returnMethod: null };
    tt.pult.knockouts++;
    notifyUser(s, targetUid, "Вы выбыли из турнира", `«${tt.name}». Ребай доступен до конца поздней регистрации.`, "tournament");
    if (byUid) notifyUser(s, byUid, "Нокаут!", `Вы выбили игрока и забрали ${fmtNum(chips)} фишек.`, "tournament");
  });
  playSound("knockout");
  return null;
}
export function returnChipsFor(t: Tournament, method: ReturnMethod): number {
  if (method === "rebuy") return t.rebuyChips > 0 ? t.rebuyChips : t.startingStack;
  if (method === "reentry") return t.reentryChips > 0 ? t.reentryChips : t.startingStack;
  if (method === "addon") return t.addonChips > 0 ? t.addonChips : Math.round(t.startingStack / 2);
  return 0; // last_chance — сумма задаётся вручную на пульте
}
export function returnPlayer(tid: string, targetUid: string, method: ReturnMethod, customChips?: number): string | null {
  const t = db.get().tournaments[tid];
  if (!lateRegOpen(t)) return "Поздняя регистрация завершена — возврат невозможен";
  if (method === "last_chance" && (!customChips || customChips <= 0)) return "Укажите количество фишек для Ласт Шанс";
  db.mutate((s) => {
    const tt = s.tournaments[tid];
    const reg = tt.registeredPlayers[targetUid];
    const chips = method === "last_chance" ? (customChips ?? 0) : returnChipsFor(tt, method);
    reg.isEliminated = false; reg.chips = chips;
    if (method === "rebuy") reg.rebuy++;
    else if (method === "addon") reg.addon++;
    else reg.reentry++;
    const e = tt.pult.eliminated[targetUid]; if (e) e.returnMethod = method;
    tt.pult.returns++;
    const names: Record<ReturnMethod, string> = { rebuy: "Ребай", reentry: "Ре-энтри", addon: "Адд-он", last_chance: "Ласт Шанс" };
    notifyUser(s, targetUid, "Возврат в игру", `${names[method]}: введено в игру ${fmtNum(chips)} фишек.`, "tournament");
  });
  playSound("rebuy");
  return null;
}
export function bankChips(t: Tournament) { return Math.max(0, chipsInPlay(t) - (t.withdrawn ?? 0)); }
export function withdrawChips(tid: string, amount: number): string | null {
  const t = db.get().tournaments[tid];
  if (!amount || amount <= 0) return "Введите сумму больше нуля";
  if (amount > bankChips(t)) return "Сумма превышает фишки в игре";
  db.mutate((s) => {
    const tt = s.tournaments[tid];
    tt.withdrawn = (tt.withdrawn ?? 0) + amount;
    broadcast(s, "Вывод фишек", `«${tt.name}»: из банка выведено ${fmtNum(amount)} фишек.`);
  });
  playSound("click");
  return null;
}
export function giveBonus(tid: string, bonusId: string, targetUid: string): string | null {
  const t = db.get().tournaments[tid];
  const b = t.bonuses.find((x) => x.id === bonusId);
  if (!b) return "Бонус не найден";
  if (!t.registeredPlayers[targetUid] || t.registeredPlayers[targetUid].isEliminated) return "Игрок не в игре";
  db.mutate((s) => {
    const tt = s.tournaments[tid];
    tt.registeredPlayers[targetUid].chips += b.chips;
    tt.pult.bonusesGiven++;
    notifyUser(s, targetUid, "Бонус!", `«${b.name}»: +${fmtNum(b.chips)} фишек к вашему стеку.`, "tournament");
  });
  playSound("bonus");
  return null;
}
export function finishTournament(tid: string) {
  db.mutate((s) => {
    const t = s.tournaments[tid];
    const active = Object.entries(t.registeredPlayers).filter(([, r]) => !r.isEliminated).sort((a, b) => b[1].chips - a[1].chips);
    const elim = Object.entries(t.pult.eliminated).sort((a, b) => b[1].eliminatedAt - a[1].eliminatedAt);
    const ranking = [...active.map(([u]) => u), ...elim.map(([u]) => u)];
    const part = t.pointsTable["participation"] ?? 0;
    const koPts = t.pointsForKnockout ? (t.knockoutPoints > 0 ? t.knockoutPoints : KO_POINTS) : 0;
    const pointsAwarded: Record<string, number> = {};
    ranking.forEach((targetUid, i) => {
      const place = i + 1;
      const reg = t.registeredPlayers[targetUid];
      let pts = t.pointsTable[String(place)] ?? part;
      pts += reg.knockouts * koPts;
      pointsAwarded[targetUid] = pts;
      const u = s.users[targetUid]; if (!u) return;
      const prevGames = u.stats.totalTournaments;
      u.stats.points += pts;
      u.stats.totalTournaments += 1;
      if (place === 1) u.stats.wins++;
      if (place <= 3) u.stats.top3++;
      if (place <= t.finalTablePlayers) u.stats.finalTables++;
      u.stats.knockouts += reg.knockouts;
      u.stats.rebuy += reg.rebuy; u.stats.addon += reg.addon; u.stats.reentry += reg.reentry;
      if (pts > u.stats.bestScore) u.stats.bestScore = pts;
      if (u.stats.bestPlace === 0 || place < u.stats.bestPlace) u.stats.bestPlace = place;
      u.stats.avgPlace = Math.round(((u.stats.avgPlace * prevGames + place) / (prevGames + 1)) * 10) / 10;
      u.tournamentHistory[tid] = { place, points: pts, knockouts: reg.knockouts, rebuy: reg.rebuy, addon: reg.addon, reentry: reg.reentry, date: Date.now() };
      Object.values(s.achievements).forEach((a) => {
        if (!u.achievements[a.id] && metricValue(u, a.conditionType) >= a.threshold) {
          u.achievements[a.id] = { earnedAt: Date.now(), achievementName: a.name };
          notifyUser(s, targetUid, "Новое достижение!", `«${a.name}» — ${a.description}`, "account");
        }
      });
      notifyUser(s, targetUid, place === 1 ? "Победа в турнире! 🏆".replace(" 🏆", "") : "Турнир завершён",
        place === 1 ? `Вы выиграли «${t.name}»! Начислено ${pts} очков.` : `«${t.name}»: ${place}-е место, +${pts} очков.`,
        "tournament");
    });
    t.results = { ranking, pointsAwarded, completedAt: Date.now(), winner: ranking[0] ?? "" };
    t.status = "completed";
    t.pult.timerStarted = false; t.pult.timerPaused = false;
    broadcast(s, "Турнир завершён", `«${t.name}» — победитель ${s.users[ranking[0]]?.nickname ?? "—"}. Итоги на экранах клуба.`);
  });
  playSound("win");
}

/* ============================== ACTIONS: TEMPLATES / SEASONS / ACHIEVEMENTS / SCREENS ============================== */
export function saveTemplate(id: string | null, name: string, data: TemplateData): string | null {
  if (!name.trim()) return "Укажите название шаблона";
  db.mutate((s) => { const tid = id ?? uid(); s.templates[tid] = { id: tid, name: name.trim(), data: structuredClone(data) }; });
  return null;
}
export function deleteTemplate(id: string) { db.mutate((s) => { delete s.templates[id]; }); }
export function saveSeason(id: string | null, data: { name: string; startDate: number; endDate: number; isActive: boolean }) {
  db.mutate((s) => {
    const sid = id ?? uid();
    if (data.isActive) Object.values(s.seasons).forEach((x) => (x.isActive = false));
    s.seasons[sid] = { ...(s.seasons[sid] ?? { id: sid, tournaments: {}, finalTable: { places: 9, manualPlayers: [], finalTournamentId: null } }), ...data, id: sid };
  });
}
export function deleteSeason(id: string) { db.mutate((s) => { delete s.seasons[id]; }); }
export function setSeasonFinal(seasonId: string, patch: Partial<Season["finalTable"]>) {
  db.mutate((s) => { Object.assign(s.seasons[seasonId].finalTable, patch); });
}
export function formFinal(seasonId: string, templateId: string): string | null {
  const s0 = db.get();
  const season = s0.seasons[seasonId]; const tpl = s0.templates[templateId];
  if (!season || !tpl) return "Выберите шаблон финального турнира";
  const rating = computeSeasonRating(s0, seasonId);
  const top = rating.slice(0, season.finalTable.places).map((r) => r.uid);
  const players = [...new Set([...top, ...season.finalTable.manualPlayers])].filter((p) => s0.users[p]);
  if (players.length === 0) return "В сезоне нет сыгранных турниров — участников для финала нет";
  db.mutate((s) => {
    const tid = uid();
    const d = tpl.data;
    const codes = seatCodes(d.tables.totalTables, d.tables.seatsPerTable);
    const seats: Record<string, string> = {};
    const rp: Record<string, RegPlayer> = {};
    players.forEach((p, i) => { seats[codes[i]] = p; rp[p] = { registeredAt: Date.now(), seatCode: codes[i], playerNumber: i + 1, isEliminated: false, chips: 0, knockouts: 0, rebuy: 0, addon: 0, reentry: 0 }; });
    s.tournaments[tid] = {
      id: tid, status: "planned", name: `Финал сезона — ${season.name}`, seasonId,
      startDate: Date.now() + 7 * DAY, startTime: "18:00", registrationDuration: d.registrationDuration,
      startingStack: d.startingStack, finalTablePlayers: d.finalTablePlayers, description: d.description,
      pointsForKnockout: d.pointsForKnockout, knockoutPoints: d.knockoutPoints ?? 5,
      rebuyChips: d.rebuyChips ?? d.startingStack, reentryChips: d.reentryChips ?? d.startingStack, addonChips: d.addonChips ?? Math.round(d.startingStack / 2),
      isFinal: true, createdAt: Date.now(),
      structure: structuredClone(d.structure), bonuses: structuredClone(d.bonuses), pointsTable: { ...d.pointsTable },
      tables: { totalTables: d.tables.totalTables, seatsPerTable: d.tables.seatsPerTable, seats },
      registeredPlayers: rp,
      pult: { currentLevel: 1, currentBreak: false, timerStarted: false, timerPaused: false, timeRemaining: 0, elapsedSeconds: 0, knockouts: 0, returns: 0, bonusesGiven: 0, eliminated: {} },
    };
    season.tournaments[tid] = true;
    season.finalTable.finalTournamentId = tid;
    players.forEach((p) => notifyUser(s, p, "Проходка в финал сезона!", `Вы автоматически зарегистрированы на «Финал сезона — ${season.name}».`, "tournament"));
  });
  playSound("win");
  return null;
}
export function saveAchievement(id: string | null, data: Omit<Achievement, "id" | "createdAt">) {
  db.mutate((s) => { const aid = id ?? uid(); s.achievements[aid] = { ...data, id: aid, createdAt: id ? s.achievements[id]?.createdAt ?? Date.now() : Date.now() }; });
}
export function deleteAchievement(id: string) { db.mutate((s) => { delete s.achievements[id]; }); }
export function setScreen(key: string, cfg: { type: string; tournamentId: string | null }) {
  db.mutate((s) => { s.screens[key] = cfg; });
}
