// src/lib/firebaseDb.ts
import { db } from "../firebase";
import {
  ref, set, update, remove, push, get, onValue, runTransaction,
} from "firebase/database";
import { 
  uid, Tournament, TournamentDraft, User, Season, Achievement, Template, Club, Notification,
  fmtDate, fmtNum, plural, capacity, chipsInPlay, lateRegOpen,
  sortedSeatCodes, tableCounts, balanceErrorForSeat,
  KO_POINTS, DAY, metricValue,
} from "./db";

// ========== ПОДПИСКИ (реактивность) ==========
export function subscribeClub(callback: (club: Club | null) => void) {
  const clubRef = ref(db, "club");
  return onValue(clubRef, (snap) => { const val = snap.val(); callback(val || null); });
}
export function subscribeUsers(callback: (users: Record<string, User>) => void) {
  const usersRef = ref(db, "users");
  return onValue(usersRef, (snap) => { const val = snap.val() || {}; callback(val); });
}
export function subscribeTournaments(callback: (tournaments: Record<string, Tournament>) => void) {
  const refTour = ref(db, "tournaments");
  return onValue(refTour, (snap) => { const val = snap.val() || {}; callback(val); });
}
export function subscribeSeasons(callback: (seasons: Record<string, Season>) => void) {
  const refSeasons = ref(db, "seasons");
  return onValue(refSeasons, (snap) => { const val = snap.val() || {}; callback(val); });
}
export function subscribeTemplates(callback: (templates: Record<string, Template>) => void) {
  const refTpl = ref(db, "templates");
  return onValue(refTpl, (snap) => { const val = snap.val() || {}; callback(val); });
}
export function subscribeAchievements(callback: (achievements: Record<string, Achievement>) => void) {
  const refAch = ref(db, "achievements");
  return onValue(refAch, (snap) => { const val = snap.val() || {}; callback(val); });
}
export function subscribeScreens(callback: (screens: Record<string, { type: string; tournamentId: string | null }>) => void) {
  const refScr = ref(db, "screens");
  return onValue(refScr, (snap) => { const val = snap.val() || {}; callback(val); });
}

// ========== УВЕДОМЛЕНИЯ ==========
export async function notifyUser(targetUid: string, title: string, message: string, type: Notification["type"]) {
  const id = uid();
  const notif = { id, title, message, type, read: false, timestamp: Date.now() };
  await set(ref(db, `users/${targetUid}/notifications/${id}`), notif);
}

export async function broadcast(title: string, message: string) {
  const snap = await get(ref(db, "users"));
  const users = snap.val() || {};
  for (const uid of Object.keys(users)) {
    await notifyUser(uid, title, message, "club");
  }
}

// ========== ПОЛУЧЕНИЕ ДАННЫХ ==========
export async function getTournament(tid: string): Promise<Tournament | null> {
  const snap = await get(ref(db, `tournaments/${tid}`));
  return snap.val() || null;
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.val() || null;
}

export async function getClub(): Promise<Club | null> {
  const snap = await get(ref(db, "club"));
  return snap.val() || null;
}

// ========== КЛУБ ==========
export async function updateClub(patch: Partial<Club>) {
  const current = await getClub();
  await update(ref(db, "club"), { ...current, ...patch });
}

// ========== ПОЛЬЗОВАТЕЛИ ==========
export async function adminSaveUser(targetUid: string | null, data: { 
  nickname: string; firstName: string; lastName: string; email: string; phone: string; 
  role: "player" | "operator" | "admin"; startPoints: number; hue: number 
}): Promise<string | null> {
  const usersSnap = await get(ref(db, "users"));
  const users = usersSnap.val() || {};
  const dup = Object.values(users).find((u: any) => u.nickname.toLowerCase() === data.nickname.toLowerCase() && u.uid !== targetUid);
  if (dup) return "Никнейм уже занят";
  
  if (targetUid && users[targetUid]) {
    const u = users[targetUid];
    await update(ref(db, `users/${targetUid}`), {
      nickname: data.nickname,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      hue: data.hue,
      stats: { ...u.stats, points: (u.stats.points || 0) + (data.startPoints > 0 ? data.startPoints : 0) }
    });
  } else {
    const id = uid();
    const newUser: User = {
      uid: id,
      nickname: data.nickname,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      hue: data.hue,
      avatar: undefined,
      registrationDate: Date.now(),
      isBlocked: false,
      isArchived: false,
      stats: {
        totalTournaments: 0, wins: 0, top3: 0, finalTables: 0,
        knockouts: 0, rebuy: 0, addon: 0, reentry: 0,
        bestScore: 0, avgPlace: 0, bestPlace: 0, points: data.startPoints || 0,
      },
      achievements: {},
      tournamentHistory: {},
      notifications: {},
    };
    await set(ref(db, `users/${id}`), newUser);
    await notifyUser(id, "Добро пожаловать в клуб!", `Вы зарегистрированы в клубе. Стартовые очки: ${data.startPoints}.`, "account");
  }
  return null;
}

export async function toggleBlock(targetUid: string) {
  const snap = await get(ref(db, `users/${targetUid}/isBlocked`));
  const current = snap.val() || false;
  await set(ref(db, `users/${targetUid}/isBlocked`), !current);
  if (!current) {
    await notifyUser(targetUid, "Аккаунт заблокирован", "Обратитесь к администратору клуба.", "account");
  }
}

export async function toggleArchive(targetUid: string) {
  const snap = await get(ref(db, `users/${targetUid}/isArchived`));
  const current = snap.val() || false;
  await set(ref(db, `users/${targetUid}/isArchived`), !current);
}

export async function removeUser(targetUid: string) {
  const tournSnap = await get(ref(db, "tournaments"));
  const tournaments = tournSnap.val() || {};
  for (const [tid, t] of Object.entries(tournaments) as [string, any][]) {
    if (t.registeredPlayers && t.registeredPlayers[targetUid]) {
      const seat = t.registeredPlayers[targetUid].seatCode;
      if (seat) {
        await remove(ref(db, `tournaments/${tid}/tables/seats/${seat}`));
      }
      await remove(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}`));
    }
  }
  await remove(ref(db, `users/${targetUid}`));
}

export async function updateProfile(targetUid: string, patch: Partial<Pick<User, "nickname" | "firstName" | "lastName" | "phone" | "email" | "hue" | "avatar">>) {
  await update(ref(db, `users/${targetUid}`), patch);
}

export async function markAllRead(targetUid: string) {
  const snap = await get(ref(db, `users/${targetUid}/notifications`));
  const notifs = snap.val() || {};
  for (const id of Object.keys(notifs)) {
    await update(ref(db, `users/${targetUid}/notifications/${id}`), { read: true });
  }
}

export async function markRead(targetUid: string, nid: string) {
  await update(ref(db, `users/${targetUid}/notifications/${nid}`), { read: true });
}
// ========== ТУРНИРЫ ==========
export async function saveTournament(id: string | null, draft: TournamentDraft): Promise<string | null> {
  if (!draft.name.trim()) return "Укажите название турнира";
  if (draft.structure.levels.length === 0) return "Добавьте хотя бы один уровень блайндов";
  const tid = id ?? uid();
  
  if (!id) {
    const all = await get(ref(db, "tournaments"));
    const existing = Object.values(all.val() || {}).find((t: any) => t.name.toLowerCase() === draft.name.trim().toLowerCase());
    if (existing) return "Турнир с таким названием уже существует";
  }
  
  const prevSnap = await get(ref(db, `tournaments/${tid}`));
  const prev = prevSnap.val();
  
  const newTour: Tournament = {
    id: tid,
    status: "planned",
    name: draft.name.trim(),
    seasonId: draft.seasonId,
    startDate: draft.startDate,
    startTime: draft.startTime,
    registrationDuration: draft.registrationDuration,
    startingStack: draft.startingStack,
    finalTablePlayers: draft.finalTablePlayers,
    description: draft.description,
    pointsForKnockout: draft.pointsForKnockout,
    knockoutPoints: draft.knockoutPoints,
    rebuyChips: draft.rebuyChips,
    reentryChips: draft.reentryChips,
    addonChips: draft.addonChips,
    isFinal: prev?.isFinal ?? (draft.isFinal || false),
    withdrawn: prev?.withdrawn ?? 0,
    createdAt: prev?.createdAt ?? Date.now(),
    structure: draft.structure,
    bonuses: draft.bonuses,
    pointsTable: draft.pointsTable,
    tables: { totalTables: draft.tables.totalTables, seatsPerTable: draft.tables.seatsPerTable, seats: prev?.tables?.seats ?? {} },
    registeredPlayers: prev?.registeredPlayers ?? {},
    pult: prev?.pult ?? { currentLevel: 1, currentBreak: false, timerStarted: false, timerPaused: false, timeRemaining: 0, elapsedSeconds: 0, knockouts: 0, returns: 0, bonusesGiven: 0, eliminated: {} },
    results: prev?.results,
  };
  
  await set(ref(db, `tournaments/${tid}`), newTour);
  await update(ref(db, `seasons/${draft.seasonId}/tournaments`), { [tid]: true });
  await broadcast("Новый турнир", `Открыта регистрация: «${draft.name.trim()}» — ${fmtDate(draft.startDate)} в ${draft.startTime}.`);
  return null;
}

export async function deleteTournament(tid: string) {
  const tSnap = await get(ref(db, `tournaments/${tid}`));
  const t = tSnap.val();
  if (t) {
    await remove(ref(db, `seasons/${t.seasonId}/tournaments/${tid}`));
    await remove(ref(db, `tournaments/${tid}`));
  }
}

export async function launchTournament(tid: string): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  const seated = Object.values(t.registeredPlayers).filter(r => r.seatCode).length;
  if (seated < 2) return "Для старта необходимо рассадить минимум 2 участников";
  
  const updateData: any = {
    status: "active",
    startDate: Date.now(),
    pult: {
      currentLevel: 1,
      currentBreak: false,
      timerStarted: true,
      timerPaused: false,
      timeRemaining: t.structure.levels[0].duration * 60,
      elapsedSeconds: 0,
      knockouts: 0,
      returns: 0,
      bonusesGiven: 0,
      eliminated: {},
    },
  };
  
  const regs = t.registeredPlayers;
  const regUpdates: Record<string, any> = {};
  for (const uid of Object.keys(regs)) {
    regUpdates[`registeredPlayers/${uid}/chips`] = t.startingStack;
    regUpdates[`registeredPlayers/${uid}/isEliminated`] = false;
  }
  
  await update(ref(db, `tournaments/${tid}`), { ...updateData, ...regUpdates });
  
  for (const uid of Object.keys(regs)) {
    await notifyUser(uid, "Турнир стартовал!", `«${t.name}» начался. Уровень 1: ${t.structure.levels[0].sb}/${t.structure.levels[0].bb}. Удачи!`, "tournament");
  }
  return null;
}

export async function registerSelf(tid: string, targetUid: string): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  if (t.isFinal && !t.registeredPlayers[targetUid]) return "Турнир по приглашениям: регистрация закрыта";
  if (Object.keys(t.registeredPlayers).length >= capacity(t)) return "Все места заняты";
  if (!lateRegOpen(t)) return "Регистрация завершена";
  
  const reg = {
    registeredAt: Date.now(),
    seatCode: null,
    playerNumber: null,
    isEliminated: false,
    chips: t.status === "active" ? t.startingStack : 0,
    knockouts: 0,
    rebuy: 0,
    addon: 0,
    reentry: 0,
  };
  await set(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}`), reg);
  await notifyUser(targetUid, "Вы записаны на турнир", `«${t.name}» — ${fmtDate(t.startDate)} в ${t.startTime}.`, "tournament");
  return null;
}

export async function cancelSelf(tid: string, targetUid: string) {
  const t = await getTournament(tid);
  if (!t) return;
  const reg = t.registeredPlayers[targetUid];
  if (!reg) return;
  if (reg.seatCode) {
    await remove(ref(db, `tournaments/${tid}/tables/seats/${reg.seatCode}`));
  }
  await remove(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}`));
  await notifyUser(targetUid, "Регистрация отменена", `Вы отменили запись на «${t.name}».`, "tournament");
}

export async function setPlayerNumber(tid: string, targetUid: string, num: number | null): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  if (num != null) {
    const n = Math.max(1, Math.floor(num));
    const dup = Object.entries(t.registeredPlayers).find(([u, r]) => u !== targetUid && r.playerNumber === n);
    if (dup) return `Номер ${n} уже занят — у игрока ${(await getUser(dup[0]))?.nickname ?? "другого участника"}.`;
    num = n;
  }
  await set(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}/playerNumber`), num);
  return null;
}

export async function setSeat(tid: string, targetUid: string, code: string | null): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  const reg = t.registeredPlayers[targetUid];
  if (!reg) return "Игрок не зарегистрирован в турнире";
  if (code && t.tables.seats[code] && t.tables.seats[code] !== targetUid) return "Место уже занято";
  if (code) {
    if (reg.playerNumber == null) return "Игрок без номера не может быть посажен за стол — сначала присвойте номер участника";
    const from = reg.seatCode?.split("-")[0];
    const to = code.split("-")[0];
    if (from !== to) {
      const be = balanceErrorForSeat(t, code);
      if (be) return be;
    }
  }
  if (reg.seatCode) {
    await remove(ref(db, `tournaments/${tid}/tables/seats/${reg.seatCode}`));
  }
  if (code) {
    await set(ref(db, `tournaments/${tid}/tables/seats/${code}`), targetUid);
  }
  await set(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}/seatCode`), code);
  return null;
}

export async function seatRandom(tid: string): Promise<{ seated: number; skippedNoNumber: number }> {
  const t = await getTournament(tid);
  if (!t) return { seated: 0, skippedNoNumber: 0 };
  const eligible = Object.entries(t.registeredPlayers).filter(([, r]) => !r.seatCode && r.playerNumber != null);
  const skipped = Object.values(t.registeredPlayers).filter(r => !r.seatCode && r.playerNumber == null).length;
  if (!eligible.length) return { seated: 0, skippedNoNumber: skipped };
  
  const counts = tableCounts(t);
  const empties: Record<string, string[]> = {};
  sortedSeatCodes(t).forEach((c) => { if (!t.tables.seats[c]) (empties[c.split("-")[0]] ??= []).push(c); });
  for (let i = eligible.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [eligible[i], eligible[j]] = [eligible[j], eligible[i]]; }
  
  let seated = 0;
  for (const [u] of eligible) {
    const avail = Object.keys(empties).filter(tb => empties[tb].length > 0);
    if (!avail.length) continue;
    const min = Math.min(...avail.map(tb => counts[tb]));
    const cands = avail.filter(tb => counts[tb] === min);
    const tb = cands[Math.floor(Math.random() * cands.length)];
    const code = empties[tb].pop()!;
    await set(ref(db, `tournaments/${tid}/registeredPlayers/${u}/seatCode`), code);
    await set(ref(db, `tournaments/${tid}/tables/seats/${code}`), u);
    counts[tb]++; seated++;
  }
  return { seated, skippedNoNumber: skipped };
}

export async function seatByRating(tid: string): Promise<{ seated: number; skippedNoNumber: number }> {
  const t = await getTournament(tid);
  if (!t) return { seated: 0, skippedNoNumber: 0 };
  const usersSnap = await get(ref(db, "users"));
  const users = usersSnap.val() || {};
  
  const eligible = Object.entries(t.registeredPlayers)
    .filter(([, r]) => !r.seatCode && r.playerNumber != null)
    .sort((a, b) => (users[b[0]]?.stats?.points ?? 0) - (users[a[0]]?.stats?.points ?? 0));
  const skipped = Object.values(t.registeredPlayers).filter(r => !r.seatCode && r.playerNumber == null).length;
  if (!eligible.length) return { seated: 0, skippedNoNumber: skipped };
  
  const counts = tableCounts(t);
  const empties: Record<string, string[]> = {};
  sortedSeatCodes(t).forEach((c) => { if (!t.tables.seats[c]) (empties[c.split("-")[0]] ??= []).push(c); });
  const avg: Record<string, { sum: number; n: number }> = {};
  Object.keys(counts).forEach(tb => (avg[tb] = { sum: 0, n: 0 }));
  sortedSeatCodes(t).forEach(c => {
    const u = t.tables.seats[c];
    if (!u) return;
    const tb = c.split("-")[0];
    avg[tb].sum += users[u]?.stats?.points ?? 0;
    avg[tb].n++;
  });
  
  let seated = 0;
  for (const [u] of eligible) {
    const avail = Object.keys(empties).filter(tb => empties[tb].length > 0);
    if (!avail.length) continue;
    const min = Math.min(...avail.map(tb => counts[tb]));
    const cands = avail.filter(tb => counts[tb] === min);
    const pts = users[u]?.stats?.points ?? 0;
    let best = cands[0];
    let bestD = Infinity;
    cands.forEach(tb => {
      const a = avg[tb];
      const d = a.n ? Math.abs(a.sum / a.n - pts) : Number.MAX_SAFE_INTEGER;
      if (d < bestD - 1e-9 || (Math.abs(d - bestD) < 1e-9 && Math.random() < 0.5)) { bestD = d; best = tb; }
    });
    const code = empties[best].pop()!;
    await set(ref(db, `tournaments/${tid}/registeredPlayers/${u}/seatCode`), code);
    await set(ref(db, `tournaments/${tid}/tables/seats/${code}`), u);
    counts[best]++; avg[best].sum += pts; avg[best].n++; seated++;
  }
  return { seated, skippedNoNumber: skipped };
}
// ========== ПУЛЬТ ==========
export async function tickTimers() {
  const snap = await get(ref(db, "tournaments"));
  const tournaments = snap.val() || {};
  for (const [tid, t] of Object.entries(tournaments) as [string, any][]) {
    if (t.status === "active" && t.pult?.timerStarted && !t.pult?.timerPaused && t.pult?.timeRemaining > 0) {
      const remaining = t.pult.timeRemaining - 1;
      const elapsed = t.pult.elapsedSeconds + 1;
      await update(ref(db, `tournaments/${tid}/pult`), { timeRemaining: remaining, elapsedSeconds: elapsed });
      if (remaining <= 0) {
        await advanceLevel(tid, t);
      }
    }
  }
}

async function advanceLevel(tid: string, t: any) {
  const p = t.pult;
  const lvs = t.structure.levels;
  if (p.currentBreak) {
    await update(ref(db, `tournaments/${tid}/pult`), {
      currentBreak: false,
      currentLevel: Math.min(p.currentLevel + 1, lvs.length),
      timeRemaining: lvs[Math.min(p.currentLevel, lvs.length - 1)]?.duration * 60 || 0,
    });
  } else {
    const bk = t.structure.breaks?.find((b: any) => b.afterLevel === p.currentLevel);
    if (bk && p.currentLevel < lvs.length) {
      await update(ref(db, `tournaments/${tid}/pult`), {
        currentBreak: true,
        timeRemaining: bk.duration * 60,
      });
    } else if (p.currentLevel < lvs.length) {
      await update(ref(db, `tournaments/${tid}/pult`), {
        currentLevel: p.currentLevel + 1,
        timeRemaining: lvs[p.currentLevel]?.duration * 60 || 0,
      });
    } else {
      await update(ref(db, `tournaments/${tid}/pult`), {
        timerStarted: false,
        timeRemaining: 0,
      });
    }
  }
}

export async function togglePause(tid: string) {
  const snap = await get(ref(db, `tournaments/${tid}/pult`));
  const p = snap.val() || {};
  await update(ref(db, `tournaments/${tid}/pult`), {
    timerPaused: !p.timerPaused,
    timerStarted: true,
  });
}

export async function stepLevel(tid: string, dir: 1 | -1) {
  const snap = await get(ref(db, `tournaments/${tid}`));
  const t = snap.val();
  if (!t) return;
  const lvs = t.structure.levels;
  const current = t.pult.currentLevel || 1;
  const newLevel = Math.min(Math.max(current + dir, 1), lvs.length);
  await update(ref(db, `tournaments/${tid}/pult`), {
    currentBreak: false,
    currentLevel: newLevel,
    timeRemaining: lvs[newLevel - 1]?.duration * 60 || 0,
    timerStarted: true,
  });
}

export async function addMinute(tid: string, delta: number) {
  const snap = await get(ref(db, `tournaments/${tid}/pult`));
  const p = snap.val() || {};
  const remaining = Math.max(0, (p.timeRemaining || 0) + delta * 60);
  await update(ref(db, `tournaments/${tid}/pult`), {
    timeRemaining: remaining,
    timerStarted: remaining > 0,
  });
}

export async function startBreak(tid: string) {
  const snap = await get(ref(db, `tournaments/${tid}`));
  const t = snap.val();
  if (!t) return;
  const bk = t.structure.breaks?.find((b: any) => b.afterLevel === t.pult.currentLevel);
  await update(ref(db, `tournaments/${tid}/pult`), {
    currentBreak: true,
    timeRemaining: (bk?.duration ?? 10) * 60,
    timerStarted: true,
    timerPaused: false,
  });
}

export async function eliminate(tid: string, targetUid: string, byUid: string | null): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  const reg = t.registeredPlayers[targetUid];
  if (!reg || reg.isEliminated) return "Игрок уже выбыл";
  
  const chips = reg.chips;
  if (byUid && t.registeredPlayers[byUid] && byUid !== targetUid) {
    await update(ref(db, `tournaments/${tid}/registeredPlayers/${byUid}`), {
      chips: (t.registeredPlayers[byUid].chips || 0) + chips,
      knockouts: (t.registeredPlayers[byUid].knockouts || 0) + 1,
    });
  }
  await update(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}`), {
    isEliminated: true,
    chips: 0,
  });
  await set(ref(db, `tournaments/${tid}/pult/eliminated/${targetUid}`), {
    eliminatedAt: Date.now(),
    knockedBy: byUid || null,
    returnMethod: null,
  });
  await update(ref(db, `tournaments/${tid}/pult`), {
    knockouts: (t.pult.knockouts || 0) + 1,
  });
  await notifyUser(targetUid, "Вы выбыли из турнира", `«${t.name}». Ребай доступен до конца поздней регистрации.`, "tournament");
  if (byUid) {
    await notifyUser(byUid, "Нокаут!", `Вы выбили игрока и забрали ${fmtNum(chips)} фишек.`, "tournament");
  }
  return null;
}

export async function returnPlayer(tid: string, targetUid: string, method: "rebuy" | "reentry" | "addon" | "last_chance", customChips?: number): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  if (!lateRegOpen(t)) return "Поздняя регистрация завершена — возврат невозможен";
  if (method === "last_chance" && (!customChips || customChips <= 0)) return "Укажите количество фишек для Ласт Шанс";
  
  let chips = 0;
  if (method === "last_chance") {
    chips = customChips || 0;
  } else if (method === "rebuy") {
    chips = t.rebuyChips > 0 ? t.rebuyChips : t.startingStack;
  } else if (method === "reentry") {
    chips = t.reentryChips > 0 ? t.reentryChips : t.startingStack;
  } else if (method === "addon") {
    chips = t.addonChips > 0 ? t.addonChips : Math.round(t.startingStack / 2);
  }
  
  await update(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}`), {
    isEliminated: false,
    chips: chips,
    rebuy: method === "rebuy" ? (t.registeredPlayers[targetUid]?.rebuy || 0) + 1 : (t.registeredPlayers[targetUid]?.rebuy || 0),
    addon: method === "addon" ? (t.registeredPlayers[targetUid]?.addon || 0) + 1 : (t.registeredPlayers[targetUid]?.addon || 0),
    reentry: method === "reentry" ? (t.registeredPlayers[targetUid]?.reentry || 0) + 1 : (t.registeredPlayers[targetUid]?.reentry || 0),
  });
  await set(ref(db, `tournaments/${tid}/pult/eliminated/${targetUid}/returnMethod`), method);
  await update(ref(db, `tournaments/${tid}/pult`), {
    returns: (t.pult.returns || 0) + 1,
  });
  const names = { rebuy: "Ребай", reentry: "Ре-энтри", addon: "Адд-он", last_chance: "Ласт Шанс" };
  await notifyUser(targetUid, "Возврат в игру", `${names[method]}: введено в игру ${fmtNum(chips)} фишек.`, "tournament");
  return null;
}

export async function giveBonus(tid: string, bonusId: string, targetUid: string): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  const b = t.bonuses.find(x => x.id === bonusId);
  if (!b) return "Бонус не найден";
  if (!t.registeredPlayers[targetUid] || t.registeredPlayers[targetUid].isEliminated) return "Игрок не в игре";
  await set(ref(db, `tournaments/${tid}/registeredPlayers/${targetUid}/chips`), (t.registeredPlayers[targetUid].chips || 0) + b.chips);
  await update(ref(db, `tournaments/${tid}/pult`), {
    bonusesGiven: (t.pult.bonusesGiven || 0) + 1,
  });
  await notifyUser(targetUid, "Бонус!", `«${b.name}»: +${fmtNum(b.chips)} фишек к вашему стеку.`, "tournament");
  return null;
}

export async function withdrawChips(tid: string, amount: number): Promise<string | null> {
  const t = await getTournament(tid);
  if (!t) return "Турнир не найден";
  if (!amount || amount <= 0) return "Введите сумму больше нуля";
  const bank = chipsInPlay(t) - (t.withdrawn || 0);
  if (amount > bank) return "Сумма превышает фишки в игре";
  await set(ref(db, `tournaments/${tid}/withdrawn`), (t.withdrawn || 0) + amount);
  await broadcast("Вывод фишек", `«${t.name}»: из банка выведено ${fmtNum(amount)} фишек.`);
  return null;
}

export async function finishTournament(tid: string) {
  const tournRef = ref(db, `tournaments/${tid}`);
  await runTransaction(tournRef, async (current) => {
    if (!current) return;
    const t = current as Tournament;
    const active = Object.entries(t.registeredPlayers).filter(([, r]) => !r.isEliminated).sort((a, b) => b[1].chips - a[1].chips);
    const elim = Object.entries(t.pult.eliminated).sort((a, b) => b[1].eliminatedAt - a[1].eliminatedAt);
    const ranking = [...active.map(([u]) => u), ...elim.map(([u]) => u)];
    const part = t.pointsTable["participation"] ?? 0;
    const koPts = t.pointsForKnockout ? (t.knockoutPoints > 0 ? t.knockoutPoints : KO_POINTS) : 0;
    const pointsAwarded: Record<string, number> = {};
    
    for (let i = 0; i < ranking.length; i++) {
      const uid = ranking[i];
      const place = i + 1;
      const reg = t.registeredPlayers[uid];
      let pts = t.pointsTable[String(place)] ?? part;
      pts += reg.knockouts * koPts;
      pointsAwarded[uid] = pts;
    }
    
    // Обновляем статистику пользователей
    for (const [uid, pts] of Object.entries(pointsAwarded)) {
      const userSnap = await get(ref(db, `users/${uid}`));
      const user = userSnap.val();
      if (!user) continue;
      const reg = t.registeredPlayers[uid];
      const prevGames = user.stats.totalTournaments || 0;
      const place = ranking.indexOf(uid) + 1;
      
      const newStats = {
        points: (user.stats.points || 0) + pts,
        totalTournaments: prevGames + 1,
        wins: place === 1 ? (user.stats.wins || 0) + 1 : (user.stats.wins || 0),
        top3: place <= 3 ? (user.stats.top3 || 0) + 1 : (user.stats.top3 || 0),
        finalTables: place <= t.finalTablePlayers ? (user.stats.finalTables || 0) + 1 : (user.stats.finalTables || 0),
        knockouts: (user.stats.knockouts || 0) + (reg.knockouts || 0),
        rebuy: (user.stats.rebuy || 0) + (reg.rebuy || 0),
        addon: (user.stats.addon || 0) + (reg.addon || 0),
        reentry: (user.stats.reentry || 0) + (reg.reentry || 0),
        bestScore: Math.max(user.stats.bestScore || 0, pts),
        bestPlace: user.stats.bestPlace === 0 || place < user.stats.bestPlace ? place : user.stats.bestPlace,
        avgPlace: Math.round(((user.stats.avgPlace || 0) * prevGames + place) / (prevGames + 1) * 10) / 10,
      };
      await set(ref(db, `users/${uid}/stats`), newStats);
      await set(ref(db, `users/${uid}/tournamentHistory/${tid}`), {
        place, points: pts, knockouts: reg.knockouts || 0,
        rebuy: reg.rebuy || 0, addon: reg.addon || 0, reentry: reg.reentry || 0,
        date: Date.now(),
      });
      
      // Проверка достижений
      const achSnap = await get(ref(db, "achievements"));
      const achievements = achSnap.val() || {};
      for (const [aid, ach] of Object.entries(achievements) as [string, any][]) {
        if (!user.achievements?.[aid]) {
          let metric = 0;
          const cond = ach.conditionType;
          if (cond === "totalTournaments") metric = newStats.totalTournaments;
          else if (cond === "wins") metric = newStats.wins;
          else if (cond === "top3") metric = newStats.top3;
          else if (cond === "finalTables") metric = newStats.finalTables;
          else if (cond === "knockouts") metric = newStats.knockouts;
          else if (cond === "rebuyAddon") metric = newStats.rebuy + newStats.addon;
          else if (cond === "reentry") metric = newStats.reentry;
          else if (cond === "bestScore") metric = newStats.bestScore;
          if (metric >= ach.threshold) {
            await set(ref(db, `users/${uid}/achievements/${aid}`), {
              earnedAt: Date.now(),
              achievementName: ach.name,
            });
            await notifyUser(uid, "Новое достижение!", `«${ach.name}» — ${ach.description}`, "account");
          }
        }
      }
    }
    
    current.results = { ranking, pointsAwarded, completedAt: Date.now(), winner: ranking[0] ?? "" };
    current.status = "completed";
    current.pult.timerStarted = false;
    current.pult.timerPaused = false;
    return current;
  });
  
  const t = await getTournament(tid);
  await broadcast("Турнир завершён", `«${t?.name}» — победитель ${(await getUser(t?.results?.winner || ""))?.nickname ?? "—"}. Итоги на экранах клуба.`);
}

// ========== ШАБЛОНЫ ==========
export async function saveTemplate(id: string | null, name: string, data: any): Promise<string | null> {
  if (!name.trim()) return "Укажите название шаблона";
  const tid = id ?? uid();
  await set(ref(db, `templates/${tid}`), { id: tid, name: name.trim(), data: structuredClone(data) });
  return null;
}
export async function deleteTemplate(id: string) {
  await remove(ref(db, `templates/${id}`));
}

// ========== СЕЗОНЫ ==========
export async function saveSeason(id: string | null, data: { name: string; startDate: number; endDate: number; isActive: boolean }) {
  const sid = id ?? uid();
  if (data.isActive) {
    const seasonsSnap = await get(ref(db, "seasons"));
    const seasons = seasonsSnap.val() || {};
    for (const sid of Object.keys(seasons)) {
      await update(ref(db, `seasons/${sid}`), { isActive: false });
    }
  }
  const existing = await get(ref(db, `seasons/${sid}`));
  const prev = existing.val() || {};
  await set(ref(db, `seasons/${sid}`), {
    ...prev,
    ...data,
    id: sid,
    tournaments: prev.tournaments || {},
    finalTable: prev.finalTable || { places: 9, manualPlayers: [], finalTournamentId: null },
  });
}
export async function deleteSeason(id: string) {
  await remove(ref(db, `seasons/${id}`));
}
export async function setSeasonFinal(seasonId: string, patch: any) {
  const snap = await get(ref(db, `seasons/${seasonId}/finalTable`));
  const current = snap.val() || {};
  await update(ref(db, `seasons/${seasonId}/finalTable`), { ...current, ...patch });
}

export async function formFinal(seasonId: string, templateId: string): Promise<string | null> {
  const [seasonSnap, tplSnap, usersSnap] = await Promise.all([
    get(ref(db, `seasons/${seasonId}`)),
    get(ref(db, `templates/${templateId}`)),
    get(ref(db, "users")),
  ]);
  const season = seasonSnap.val();
  const tpl = tplSnap.val();
  const users = usersSnap.val() || {};
  if (!season || !tpl) return "Выберите шаблон финального турнира";
  
  // Получаем рейтинг сезона
  const rating = await computeSeasonRating(seasonId);
  const top = rating.slice(0, season.finalTable?.places || 9).map(r => r.uid);
  const players = [...new Set([...top, ...(season.finalTable?.manualPlayers || [])])].filter(p => users[p]);
  if (players.length === 0) return "В сезоне нет сыгранных турниров — участников для финала нет";
  
  const tid = uid();
  const d = tpl.data;
  const codes = sortedSeatCodes({ tables: { totalTables: d.tables.totalTables || 2, seatsPerTable: d.tables.seatsPerTable || 9 } } as any);
  const seats: Record<string, string> = {};
  const rp: Record<string, any> = {};
  players.forEach((p, i) => {
    seats[codes[i]] = p;
    rp[p] = { registeredAt: Date.now(), seatCode: codes[i], playerNumber: i + 1, isEliminated: false, chips: 0, knockouts: 0, rebuy: 0, addon: 0, reentry: 0 };
  });
  
  const newTour = {
    id: tid, status: "planned", name: `Финал сезона — ${season.name}`, seasonId,
    startDate: Date.now() + 7 * DAY, startTime: "18:00",
    registrationDuration: d.registrationDuration || 30,
    startingStack: d.startingStack || 15000,
    finalTablePlayers: d.finalTablePlayers || 9,
    description: d.description || "",
    pointsForKnockout: d.pointsForKnockout || true,
    knockoutPoints: d.knockoutPoints || 5,
    rebuyChips: d.rebuyChips || d.startingStack || 15000,
    reentryChips: d.reentryChips || d.startingStack || 15000,
    addonChips: d.addonChips || Math.round((d.startingStack || 15000) / 2),
    isFinal: true,
    createdAt: Date.now(),
    structure: structuredClone(d.structure || { levels: [], breaks: [] }),
    bonuses: structuredClone(d.bonuses || []),
    pointsTable: { ...(d.pointsTable || {}) },
    tables: { totalTables: d.tables.totalTables || 2, seatsPerTable: d.tables.seatsPerTable || 9, seats },
    registeredPlayers: rp,
    pult: { currentLevel: 1, currentBreak: false, timerStarted: false, timerPaused: false, timeRemaining: 0, elapsedSeconds: 0, knockouts: 0, returns: 0, bonusesGiven: 0, eliminated: {} },
  };
  await set(ref(db, `tournaments/${tid}`), newTour);
  await update(ref(db, `seasons/${seasonId}/tournaments`), { [tid]: true });
  await update(ref(db, `seasons/${seasonId}/finalTable`), { finalTournamentId: tid });
  for (const p of players) {
    await notifyUser(p, "Проходка в финал сезона!", `Вы автоматически зарегистрированы на «Финал сезона — ${season.name}».`, "tournament");
  }
  return null;
}

async function computeSeasonRating(seasonId: string): Promise<{ uid: string; points: number }[]> {
  const tournSnap = await get(ref(db, "tournaments"));
  const tournaments = tournSnap.val() || {};
  const map: Record<string, number> = {};
  for (const [tid, t] of Object.entries(tournaments) as [string, any][]) {
    if (t.seasonId !== seasonId || t.status !== "completed" || !t.results) continue;
    for (const [uid, pts] of Object.entries(t.results.pointsAwarded || {})) {
      map[uid] = (map[uid] || 0) + (pts as number);
    }
  }
  return Object.entries(map).map(([uid, points]) => ({ uid, points })).sort((a, b) => b.points - a.points);
}

// ========== ДОСТИЖЕНИЯ ==========
export async function saveAchievement(id: string | null, data: any) {
  const aid = id ?? uid();
  const existing = await get(ref(db, `achievements/${aid}`));
  const prev = existing.val() || {};
  await set(ref(db, `achievements/${aid}`), { ...prev, ...data, id: aid, createdAt: prev.createdAt ?? Date.now() });
}
export async function deleteAchievement(id: string) {
  await remove(ref(db, `achievements/${id}`));
}

// ========== ЭКРАНЫ ==========
export async function setScreen(key: string, cfg: { type: string; tournamentId: string | null }) {
  await set(ref(db, `screens/${key}`), cfg);
}