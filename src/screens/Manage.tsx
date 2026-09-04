import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Pencil, Trash2, Ban, Archive, ShieldCheck, ChevronRight, ExternalLink,
  Trophy, Medal, Crown, MonitorPlay, CalendarRange,
  ArrowUpDown, RotateCcw, FileStack, Save, Volume2, VolumeX, Sparkles, LayoutGrid, X, Flag,
} from "lucide-react";
import {
  useFirebaseData
} from "../lib/useFirebaseData";
import { useAuth } from "../lib/useAuth";
import {
  User, Role, Achievement, CondType, ACCENTS, BGS,
  fmtDate, fmtDateShort, fmtNum, plural, capacity, Season, Tournament,
  computeSeasonRating,
} from "../lib/db";
import {
  updateClub, adminSaveUser, toggleBlock, toggleArchive, removeUser,
  saveSeason, deleteSeason, setSeasonFinal, formFinal,
  saveAchievement, deleteAchievement, setScreen, saveTemplate, deleteTemplate,
} from "../lib/firebaseDb";
import { Avatar, AchIcon, Badge, Btn, Empty, Field, Modal, Reveal, SectionTitle, Select, StatusBadge, Toggle, cn, toast } from "../lib/ui";

const toISO = (ts: number) => new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fromISO = (iso: string) => new Date(iso + "T12:00:00").getTime();
const ROLE_LABEL: Record<Role, string> = { player: "Игрок", operator: "Оператор", admin: "Администратор" };
const COND_LABEL: Record<CondType, string> = {
  totalTournaments: "Сыграно турниров", wins: "Побед", top3: "Попаданий в топ-3", finalTables: "Финальных столов (топ-9)",
  knockouts: "Выбито игроков", rebuyAddon: "Ребаев и адд-онов", reentry: "Ре-энтри", bestScore: "Лучший результат по очкам",
};
const ACH_ICONS = ["trophy", "medal", "star", "target", "bolt", "shield", "crown", "cards", "diamond"];

/* ================================ УЧАСТНИКИ ================================ */
export function Members({ ro }: { ro: boolean }) {
  const { users, loading } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [editU, setEditU] = useState<User | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [delU, setDelU] = useState<User | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [form, setForm] = useState({ 
    nickname: "", firstName: "", lastName: "", email: "", phone: "", 
    role: "player" as Role, startPoints: 0, hue: 205 
  });

  const usersList = useMemo(() => {
    if (!users || Object.keys(users).length === 0) return [];
    return Object.values(users)
      .filter((u) => showHidden || (!u.isArchived && !u.isBlocked))
      .filter((u) => roleF === "all" || u.role === roleF)
      .filter((u) => (u.nickname + u.firstName + u.lastName + u.email).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.stats.points - a.stats.points);
  }, [users, q, roleF, showHidden]);

  const openEdit = (u: User | null) => {
    setIsNew(!u);
    setForm(u
      ? { nickname: u.nickname, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, role: u.role, startPoints: 0, hue: u.hue }
      : { nickname: "", firstName: "", lastName: "", email: "", phone: "", role: "player", startPoints: 0, hue: Math.floor(Math.random() * 360) });
    setEditU(u ?? ({ uid: "" } as User));
  };
  
  const save = async () => {
    if (!form.nickname.trim() || !form.firstName.trim()) { toast("Никнейм и имя обязательны", "err"); return; }
    setLoadingState(true);
    try {
      const err = await adminSaveUser(isNew ? null : editU!.uid, form);
      if (err) { toast(err, "err"); return; }
      toast(isNew ? "Игрок создан и уведомлён" : "Данные обновлены");
      setEditU(null);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoadingState(false);
    }
  };
  
  const lastGame = (u: User) => {
    const h = Object.values(u.tournamentHistory).sort((a, b) => b.date - a.date)[0];
    return h ? fmtDateShort(h.date) : "—";
  };

  return (
    <div>
      <SectionTitle kicker="База клуба" title="Участники"
        right={!ro && <Btn onClick={() => openEdit(null)}><Plus className="size-4.5" /> Создать игрока</Btn>} />
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input className="inp pl-9" placeholder="Поиск: ник, имя, почта…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="inp !min-h-[44px] !w-auto !py-2 text-[13px] font-bold" value={roleF} onChange={(e) => setRoleF(e.target.value)}>
          <option value="all">Все роли</option><option value="player">Игроки</option>
          <option value="operator">Операторы</option><option value="admin">Админы</option>
        </select>
        <Toggle checked={showHidden} onChange={setShowHidden} label="Заблокированные и архив" />
      </div>

      <div className="panel overflow-x-auto">
        <table className="tbl min-w-[880px]">
          <thead><tr><th>Участник</th><th>Контакты</th><th>Роль</th><th>Очки</th><th>Регистрация</th><th>Активность</th>{!ro && <th className="text-right">Действия</th>}</tr></thead>
          <tbody>
            {usersList.map((u) => (
              <tr key={u.uid} className={cn(u.isBlocked && "opacity-55", u.isArchived && "opacity-40")}>
                <td>
                  <span className="flex items-center gap-3">
                    <Avatar user={u} size={38} />
                    <span>
                      <span className="flex items-center gap-2 font-display text-[13px] font-bold">{u.nickname}
                        {u.isBlocked && <Badge tone="bad">блок</Badge>}{u.isArchived && <Badge tone="mut">архив</Badge>}
                      </span>
                      <span className="text-[12px] text-mut">{u.firstName} {u.lastName}</span>
                    </span>
                  </span>
                </td>
                <td><span className="block text-[12.5px] font-semibold">{u.email}</span><span className="text-[12px] text-dim">{u.phone}</span></td>
                <td><Badge tone={u.role === "admin" ? "acc" : u.role === "operator" ? "warn" : "mut"}>{ROLE_LABEL[u.role]}</Badge></td>
                <td className="num font-extrabold text-(--acc)">{fmtNum(u.stats.points)}</td>
                <td className="text-mut">{fmtDate(u.registrationDate)}</td>
                <td className="text-mut">{lastGame(u)}</td>
                {!ro && (
                  <td>
                    <span className="flex justify-end gap-1">
                      <RowBtn title="Редактировать" onClick={() => openEdit(u)}><Pencil className="size-4" /></RowBtn>
                      <RowBtn title={u.isBlocked ? "Разблокировать" : "Заблокировать"} onClick={async () => { 
                        setLoadingState(true);
                        try {
                          await toggleBlock(u.uid); 
                          toast(u.isBlocked ? "Разблокирован" : "Заблокирован", "info"); 
                        } catch (err: any) {
                          toast(err.message || "Ошибка", "err");
                        } finally {
                          setLoadingState(false);
                        }
                      }}><Ban className={cn("size-4", !u.isBlocked && "text-bad")} /></RowBtn>
                      <RowBtn title={u.isArchived ? "Вернуть из архива" : "Архивировать"} onClick={async () => { 
                        setLoadingState(true);
                        try {
                          await toggleArchive(u.uid); 
                          toast(u.isArchived ? "Возвращён из архива" : "Архивирован", "info"); 
                        } catch (err: any) {
                          toast(err.message || "Ошибка", "err");
                        } finally {
                          setLoadingState(false);
                        }
                      }}><Archive className="size-4" /></RowBtn>
                      <RowBtn title="Удалить" onClick={() => setDelU(u)}><Trash2 className="size-4 text-bad" /></RowBtn>
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {usersList.length === 0 && <Empty title="Никого не нашли" text="Измените фильтры или создайте нового игрока." />}
      </div>

      <Modal open={!!editU} onClose={() => setEditU(null)} title={isNew ? "Новый участник клуба" : `Редактировать: ${editU?.nickname}`}
        subtitle={isNew ? "Форма повторяет регистрацию + стартовые очки" : "Смена роли применяется сразу"} w="max-w-xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Никнейм"><input className="inp" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></Field>
          <Field label="Роль">
            <select className="inp" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="player">Игрок</option><option value="operator">Оператор</option><option value="admin">Администратор</option>
            </select>
          </Field>
          <Field label="Имя"><input className="inp" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Фамилия"><input className="inp" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="E-mail"><input type="email" className="inp" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Телефон"><input type="tel" className="inp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          {isNew && <Field label="Начислить стартовые очки"><input type="number" className="inp" value={form.startPoints} onChange={(e) => setForm({ ...form, startPoints: +e.target.value || 0 })} /></Field>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setEditU(null)}>Отмена</Btn>
          <Btn onClick={save} disabled={loadingState}><Save className="size-4" /> Сохранить</Btn>
        </div>
      </Modal>

      <Modal open={!!delU} onClose={() => setDelU(null)} title="Удалить участника?" subtitle={`${delU?.nickname} · ${delU?.firstName} ${delU?.lastName}`}>
        <p className="text-[13.5px] font-semibold leading-relaxed text-mut">Профиль, статистика и турнирные записи будут удалены безвозвратно. Рекомендуется архивировать вместо удаления.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setDelU(null)}>Отмена</Btn>
          <Btn variant="danger" onClick={async () => { 
            if (delU) { 
              setLoadingState(true);
              try {
                await removeUser(delU.uid); 
                toast("Участник удалён", "info"); 
              } catch (err: any) {
                toast(err.message || "Ошибка", "err");
              } finally {
                setLoadingState(false);
              }
            } 
            setDelU(null); 
          }} disabled={loadingState}><Trash2 className="size-4" /> Удалить</Btn>
        </div>
      </Modal>
    </div>
  );
}

function RowBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return <button title={title} onClick={onClick} className="grid size-8.5 place-items-center rounded-lg border border-line bg-white/[0.04] text-mut transition hover:border-(--acc-line) hover:text-ink">{children}</button>;
}

/* ================================ РЕЙТИНГ (админ) ================================ */
export function AdminRating() {
  const { users, tournaments, seasons } = useFirebaseData();
  const [mode, setMode] = useState<"all" | "season">("all");
  const seasonsList = useMemo(() => Object.values(seasons || {}).sort((a, b) => Number(b.isActive) - Number(a.isActive)), [seasons]);
  const [sid, setSid] = useState(seasonsList.find((x) => x.isActive)?.id ?? seasonsList[0]?.id ?? "");
  const [sortK, setSortK] = useState("points");
  const [dir, setDir] = useState(-1);

  type Row = { uid: string; nick: string; first: string; last: string; user: User; points: number; games: number; wins: number; top3: number; ft: number; best: number; kos: number; rebs: number };
  const rows: Row[] = useMemo(() => {
    if (!users || Object.keys(users).length === 0) return [];
    if (mode === "season") {
      const rating = computeSeasonRating(users, tournaments, sid);
      return rating.map((r) => {
        const u = users[r.uid];
        return { 
          uid: r.uid, nick: u?.nickname ?? "—", first: u?.firstName ?? "", last: u?.lastName ?? "", 
          user: u!, points: r.points, games: r.games, wins: r.wins, top3: r.top3, ft: r.ft, 
          best: r.best, kos: r.kos, rebs: r.rebs 
        };
      }).filter((r) => r.user);
    }
    return Object.values(users).filter((u) => !u.isArchived).map((u) => ({
      uid: u.uid, nick: u.nickname, first: u.firstName, last: u.lastName, user: u,
      points: u.stats.points, games: u.stats.totalTournaments, wins: u.stats.wins, top3: u.stats.top3,
      ft: u.stats.finalTables, best: u.stats.bestScore, kos: u.stats.knockouts, rebs: u.stats.rebuy + u.stats.addon,
    }));
  }, [mode, sid, users, tournaments]);

  const sorted = [...rows].sort((a, b) => (((a as unknown as Record<string, number>)[sortK] ?? 0) - ((b as unknown as Record<string, number>)[sortK] ?? 0)) * dir);
  const TH = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <th><button onClick={() => { if (sortK === k) setDir(-dir); else { setSortK(k); setDir(-1); } }}
      className={cn("inline-flex items-center gap-1 uppercase tracking-[0.13em] transition hover:text-(--acc)", sortK === k && "text-(--acc)")}>
      {children}<ArrowUpDown className="size-3" /></button></th>
  );

  return (
    <div>
      <SectionTitle kicker="Таблица лидеров клуба" title="Рейтинг"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {mode === "season" && (
              <select className="inp !min-h-[40px] !w-auto !py-1.5 text-[13px]" value={sid} onChange={(e) => setSid(e.target.value)}>
                {seasonsList.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            )}
            <div className="flex rounded-xl border border-line bg-white/[0.03] p-1">
              {([["all", "Все время"], ["season", "Сезон"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setMode(k)} className={cn("rounded-lg px-3.5 py-1.5 text-[12px] font-extrabold uppercase transition", mode === k ? "bg-(--acc) text-(--acc-ink)" : "text-mut")}>{l}</button>
              ))}
            </div>
          </div>
        } />
      <div className="panel overflow-x-auto">
        <table className="tbl min-w-[980px]">
          <thead><tr>
            <th>Место</th><th>Никнейм</th><th>Имя</th>
            <TH k="points">Очки</TH><TH k="games">Игры</TH><TH k="wins">Победы</TH><TH k="top3">Топ-3</TH>
            <TH k="ft">Финалки</TH><TH k="best">Лучший</TH><TH k="kos">Выбил</TH><TH k="rebs">Докупы</TH>
          </tr></thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.uid}>
                <td><span className={cn("num font-display text-[15px] font-extrabold", i === 0 ? "text-[#ffd76a]" : i === 1 ? "text-[#c9d4e5]" : i === 2 ? "text-[#d9915b]" : "text-dim")}>{i + 1}</span></td>
                <td><span className="flex items-center gap-2.5"><Avatar user={r.user} size={32} /><b className="font-display text-[13px]">{r.nick}</b></span></td>
                <td className="text-mut">{r.first} {r.last}</td>
                <td className="num font-extrabold text-(--acc)">{fmtNum(r.points)}</td>
                <td className="num text-mut">{r.games}</td>
                <td className="num text-mut">{r.wins}</td>
                <td className="num text-mut">{r.top3}</td>
                <td className="num text-mut">{r.ft}</td>
                <td className="num text-mut">{r.best}</td>
                <td className="num text-mut">{r.kos}</td>
                <td className="num text-mut">{r.rebs}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <Empty title="Нет данных" text="В выбранном сезоне ещё не было завершённых турниров." />}
      </div>
    </div>
  );
}
/* ================================ ШАБЛОНЫ ================================ */
export function Templates({ ro }: { ro: boolean }) {
  const { templates } = useFirebaseData();
  const nav = useNavigate();
  const [delT, setDelT] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tpls = Object.values(templates || {});

  return (
    <div>
      <SectionTitle kicker="Библиотека структур" title="Шаблоны турниров"
        right={
          <div className="flex items-center gap-2">
            <Badge tone="mut">{tpls.length} {plural(tpls.length, "шаблон", "шаблона", "шаблонов")}</Badge>
            {!ro && <Btn size="sm" variant="soft" onClick={() => nav("/app/templates/new")}><Plus className="size-4" /> Создать шаблон</Btn>}
          </div>
        } />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tpls.map((t, i) => (
          <Reveal key={t.id} delay={i * 60} className="h-full">
            <div className="panel flex h-full flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-(--acc-soft) text-(--acc) ring-1 ring-(--acc-line)"><FileStack className="size-5" /></span>
                <Badge tone="acc">{t.data.structure.levels.length} ур.</Badge>
              </div>
              <h3 className="mt-3 font-display text-[16px] font-extrabold">{t.name}</h3>
              <p className="mt-1 line-clamp-2 text-[12.5px] text-mut">{t.data.description || "Без описания"}</p>
              <div className="mt-3 space-y-1 text-[12.5px] font-semibold text-mut">
                <p>Стартовый стек: <b className="num text-ink">{fmtNum(t.data.startingStack)}</b></p>
                <p>Финальный стол: <b className="num text-ink">{t.data.finalTablePlayers}</b> игроков</p>
                <p>Столы: <b className="num text-ink">{t.data.tables.totalTables} × {t.data.tables.seatsPerTable}</b> · рег. {t.data.registrationDuration} мин</p>
              </div>
              {!ro && (
                <div className="mt-auto flex gap-2 pt-4">
                  <Btn size="sm" variant="soft" className="flex-1" onClick={() => nav(`/app/templates/edit/${t.id}`)} title="Откроется полная форма создания турнира — с кнопкой «Сохранить шаблон»"><Pencil className="size-4" /> Редактировать</Btn>
                  <Btn size="sm" variant="danger" onClick={() => setDelT(t.id)}><Trash2 className="size-4" /></Btn>
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
      {tpls.length === 0 && <div className="panel mt-4"><Empty icon={<FileStack className="size-7" />} title="Шаблонов нет" text="Сохраните структуру при создании турнира — она появится здесь." /></div>}

      <Modal open={!!delT} onClose={() => setDelT(null)} title="Удалить шаблон?">
        <p className="text-[13.5px] font-semibold text-mut">Шаблон будет удалён из библиотеки. Созданные по нему турниры останутся.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setDelT(null)}>Отмена</Btn>
          <Btn variant="danger" onClick={async () => { 
            if (delT) { 
              setLoading(true);
              try {
                await deleteTemplate(delT); 
                setDelT(null); 
                toast("Шаблон удалён", "info"); 
              } catch (err: any) {
                toast(err.message || "Ошибка", "err");
              } finally {
                setLoading(false);
              }
            } 
          }} disabled={loading}><Trash2 className="size-4" /> Удалить</Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ================================ СЕЗОНЫ ================================ */
export function Seasons({ ro }: { ro: boolean }) {
  const { seasons } = useFirebaseData();
  const nav = useNavigate();
  const [editS, setEditS] = useState<{ id: string | null; name: string; start: string; end: string; isActive: boolean } | null>(null);
  const [delS, setDelS] = useState<Season | null>(null);
  const [loading, setLoading] = useState(false);
  const seasonsList = Object.values(seasons || {}).sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.startDate - a.startDate);

  return (
    <div>
      <SectionTitle kicker="Сезонная система" title="Сезоны"
        right={!ro && <Btn onClick={() => setEditS({ id: null, name: "", start: toISO(Date.now()), end: toISO(Date.now() + 180 * 86400e3), isActive: false })}><Plus className="size-4.5" /> Создать сезон</Btn>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {seasonsList.map((x, i) => {
          const cnt = Object.keys(x.tournaments || {}).length;
          return (
            <Reveal key={x.id} delay={i * 60} className="h-full">
              <div className="panel flex h-full flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-(--acc-soft) text-(--acc) ring-1 ring-(--acc-line)"><CalendarRange className="size-5" /></span>
                  {x.isActive ? <Badge tone="ok"><span className="relative size-1.5 rounded-full bg-ok live-dot" />Активен</Badge> : <Badge tone="mut">Не активен</Badge>}
                </div>
                <h3 className="mt-3 font-display text-[16px] font-extrabold leading-snug">{x.name}</h3>
                <p className="mt-1 text-[12.5px] font-semibold text-mut">{fmtDate(x.startDate)} — {fmtDate(x.endDate)}</p>
                <p className="mt-3 text-[12.5px] font-semibold text-dim">{cnt} {plural(cnt, "турнир", "турнира", "турниров")} · финал: топ-{x.finalTable.places}{x.finalTable.finalTournamentId ? " · сформирован" : ""}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Btn size="sm" variant="soft" onClick={() => nav(`/app/seasons/${x.id}`)}>Страница сезона <ChevronRight className="size-4" /></Btn>
                  {!ro && (
                    <>
                      <Btn size="sm" variant="dark" onClick={() => setEditS({ id: x.id, name: x.name, start: toISO(x.startDate), end: toISO(x.endDate), isActive: x.isActive })}><Pencil className="size-4" /></Btn>
                      <Btn size="sm" variant="danger" onClick={() => setDelS(x)}><Trash2 className="size-4" /></Btn>
                    </>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Modal open={!!editS} onClose={() => setEditS(null)} title={editS?.id ? "Редактировать сезон" : "Новый сезон"}>
        {editS && (
          <div className="space-y-4">
            <Field label="Название"><input className="inp" value={editS.name} onChange={(e) => setEditS({ ...editS, name: e.target.value })} placeholder="Сезон 2026" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Начало"><input type="date" className="inp" value={editS.start} onChange={(e) => setEditS({ ...editS, start: e.target.value })} /></Field>
              <Field label="Окончание"><input type="date" className="inp" value={editS.end} onChange={(e) => setEditS({ ...editS, end: e.target.value })} /></Field>
            </div>
            <Toggle checked={editS.isActive} onChange={(v) => setEditS({ ...editS, isActive: v })} label="Активный сезон (остальные станут неактивными)" />
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditS(null)}>Отмена</Btn>
              <Btn onClick={async () => {
                if (!editS.name.trim()) { toast("Укажите название", "err"); return; }
                setLoading(true);
                try {
                  await saveSeason(editS.id, { 
                    name: editS.name.trim(), 
                    startDate: fromISO(editS.start), 
                    endDate: fromISO(editS.end), 
                    isActive: editS.isActive 
                  });
                  setEditS(null); 
                  toast("Сезон сохранён");
                } catch (err: any) {
                  toast(err.message || "Ошибка", "err");
                } finally {
                  setLoading(false);
                }
              }} disabled={loading}><Save className="size-4" /> Сохранить</Btn>
            </div>
          </div>
        )}
      </Modal>
      
      <Modal open={!!delS} onClose={() => setDelS(null)} title="Удалить сезон?" subtitle={delS?.name}>
        <p className="text-[13.5px] font-semibold text-mut">Турниры сезона сохранятся, но перестанут учитываться в сезонном рейтинге.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setDelS(null)}>Отмена</Btn>
          <Btn variant="danger" onClick={async () => { 
            if (delS) { 
              setLoading(true);
              try {
                await deleteSeason(delS.id); 
                setDelS(null); 
                toast("Сезон удалён", "info"); 
              } catch (err: any) {
                toast(err.message || "Ошибка", "err");
              } finally {
                setLoading(false);
              }
            } 
          }} disabled={loading}><Trash2 className="size-4" /> Удалить</Btn>
        </div>
      </Modal>
    </div>
  );
}export function SeasonPage({ sid, ro }: { sid: string; ro: boolean }) {
  const { users, tournaments, seasons, templates } = useFirebaseData();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const season = seasons ? seasons[sid] : undefined;
  const [tplId, setTplId] = useState(templates ? (Object.keys(templates)[0] ?? "") : "");
  const [manualUid, setManualUid] = useState("");
  
  if (!season) return <Empty title="Сезон не найден" />;

  const tIds = Object.keys(season.tournaments || {});
  const list = tIds.map((id) => tournaments[id]).filter(Boolean);
  const played = list.filter((t) => t.status === "completed").length;
  const live = list.filter((t) => t.status === "active").length;
  const planned = list.filter((t) => t.status === "planned").length;
  const rating = computeSeasonRating(users, tournaments, sid);
  const leader = rating[0];
  const pool = useMemo(() => 
    Object.values(users || {}).filter((u) => u && !u.isArchived && !u.isBlocked && !(season.finalTable?.manualPlayers || []).includes(u.uid)),
    [users, season?.finalTable?.manualPlayers]
  );

  const doForm = async () => {
    setLoading(true);
    try {
      const err = await formFinal(sid, tplId);
      if (err) { toast(err, "err"); return; }
      toast("Финальный турнир сформирован — участники зарегистрированы автоматически");
      nav("/app/tournaments");
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => nav("/app/seasons")} className="mb-4 inline-flex items-center gap-2 text-[13px] font-extrabold text-mut transition hover:text-(--acc)">← Все сезоны</button>
      <SectionTitle kicker="Страница сезона" title={season.name}
        right={season.isActive ? <Badge tone="ok">Активен</Badge> : <Badge tone="mut">Не активен</Badge>} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Reveal><div className="panel p-4"><p className="lbl">Сыграно турниров</p><p className="num mt-1 text-[26px] font-extrabold text-(--acc)">{played}</p><p className="text-[11.5px] font-bold text-dim">в игре: {live} · в плане: {planned}</p></div></Reveal>
        <Reveal delay={60}><div className="panel p-4"><p className="lbl">Лидер сезона</p><p className="mt-1 truncate font-display text-[17px] font-extrabold">{leader ? users[leader.uid]?.nickname : "—"}</p><p className="text-[11.5px] font-bold text-dim">{leader ? `${fmtNum(leader.points)} очков · ${leader.games} игр` : "нет результатов"}</p></div></Reveal>
        <Reveal delay={120}><div className="panel p-4"><p className="lbl">Участников в зачёте</p><p className="num mt-1 text-[26px] font-extrabold text-(--acc)">{rating.length}</p><p className="text-[11.5px] font-bold text-dim">набрали очки в сезоне</p></div></Reveal>
        <Reveal delay={180}><div className="panel p-4"><p className="lbl">Финальный стол</p><p className="num mt-1 text-[26px] font-extrabold text-(--acc)">топ-{season.finalTable?.places ?? 9}</p><p className="text-[11.5px] font-bold text-dim">{season.finalTable?.finalTournamentId ? "турнир сформирован" : "+ проходки вручную"}</p></div></Reveal>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Reveal delay={100}>
          <div className="panel p-5">
            <p className="lbl flex items-center gap-2"><Trophy className="size-4 text-(--acc)" /> Рейтинг сезона</p>
            <div className="mt-2 space-y-1">
              {rating.slice(0, 10).map((r, i) => (
                <div key={r.uid} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-white/[0.04]">
                  <span className={cn("num w-7 text-center font-display text-[14px] font-extrabold", i === 0 ? "text-[#ffd76a]" : i < 3 ? "text-(--acc)" : "text-dim")}>{i + 1}</span>
                  <Avatar user={users[r.uid]} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{users[r.uid]?.nickname}{i < (season.finalTable?.places ?? 9) && <Badge tone="acc" className="ml-2">финал</Badge>}</span>
                  <span className="num text-[13.5px] font-extrabold text-(--acc)">{fmtNum(r.points)}</span>
                </div>
              ))}
              {rating.length === 0 && <p className="py-6 text-center text-[13px] text-dim">В сезоне ещё нет завершённых турниров</p>}
            </div>
          </div>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={160}>
            <div className="panel p-5">
              <p className="lbl flex items-center gap-2"><CalendarRange className="size-4 text-(--acc)" /> Турниры сезона</p>
              <div className="mt-2 space-y-1.5">
                {list.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                    <StatusBadge status={t.status} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{t.name}</span>
                    <span className="text-[11.5px] font-semibold text-dim">{fmtDateShort(t.startDate)}</span>
                  </div>
                ))}
                {list.length === 0 && <p className="py-4 text-center text-[12.5px] text-dim">Турниров в сезоне нет</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={220}>
            <div className="panel relative overflow-hidden p-5">
              <div className="absolute -right-10 -top-10 size-36 rounded-full bg-(--acc-soft) blur-3xl" />
              <p className="lbl relative flex items-center gap-2"><Crown className="size-4 text-[#ffd76a]" /> Финал сезона</p>
              <div className="relative mt-3 space-y-3.5">
                <Field label="Сколько мест попадает за финальный стол">
                  <input type="number" className="inp" value={season.finalTable?.places ?? 9} disabled={ro}
                    onChange={async (e) => { 
                      setLoading(true);
                      try {
                        await setSeasonFinal(sid, { places: Math.max(2, +e.target.value || 9) });
                      } catch (err: any) {
                        toast(err.message || "Ошибка", "err");
                      } finally {
                        setLoading(false);
                      }
                    }} />
                </Field>
                <Field label="Проходки вручную" hint="Игроки попадут в финал вне зависимости от рейтинга">
                  <div className="flex gap-2">
                    <select className="inp" value={manualUid} onChange={(e) => setManualUid(e.target.value)}>
                      <option value="">— выбрать игрока —</option>
                      {pool.map((u) => <option key={u.uid} value={u.uid}>{u.nickname}</option>)}
                    </select>
                    <Btn variant="soft" disabled={ro || !manualUid || loading} onClick={async () => { 
                      setLoading(true);
                      try {
                        await setSeasonFinal(sid, { manualPlayers: [...(season.finalTable?.manualPlayers || []), manualUid] });
                        setManualUid("");
                      } catch (err: any) {
                        toast(err.message || "Ошибка", "err");
                      } finally {
                        setLoading(false);
                      }
                    }}><Plus className="size-4" /></Btn>
                  </div>
                </Field>
                {(season.finalTable?.manualPlayers || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(season.finalTable?.manualPlayers || []).map((u) => (
                      <span key={u} className="inline-flex items-center gap-1.5 rounded-lg bg-(--acc-soft) px-2.5 py-1.5 text-[12px] font-extrabold text-(--acc)">
                        {users[u]?.nickname ?? u}
                        {!ro && <button onClick={async () => { 
                          setLoading(true);
                          try {
                            await setSeasonFinal(sid, { manualPlayers: (season.finalTable?.manualPlayers || []).filter((x) => x !== u) });
                          } catch (err: any) {
                            toast(err.message || "Ошибка", "err");
                          } finally {
                            setLoading(false);
                          }
                        }}><X className="size-3.5" /></button>}
                      </span>
                    ))}
                  </div>
                )}
                <Select label="Шаблон финального турнира" value={tplId} onChange={setTplId}
                  options={Object.values(templates).map((t) => ({ v: t.id, l: t.name }))} />
                {season.finalTable?.finalTournamentId && tournaments[season.finalTable.finalTournamentId] ? (
                  <Btn variant="soft" className="w-full" onClick={() => nav(`/app/tournaments/${season.finalTable.finalTournamentId}/seats`)}>
                    Финал сформирован: «{tournaments[season.finalTable.finalTournamentId].name}» <ChevronRight className="size-4" />
                  </Btn>
                ) : (
                  <Btn className="w-full" disabled={ro || !tplId || loading} onClick={doForm}><Sparkles className="size-4.5" /> Сформировать финальный турнир</Btn>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

/* ================================ ЭКРАНЫ ================================ */
export function ScreensAdmin({ ro }: { ro: boolean }) {
  const { tournaments, screens } = useFirebaseData();
  const [loading, setLoading] = useState(false);
  
  const defs = [
    { key: "main", title: "Основной экран", desc: "Турнир, блайнды и таймер + бегущая строка", url: (id: string) => `#/screen/main/${id}`, type: "main" },
    { key: "final", title: "Финальный стол", desc: "9 игроков с аватарами и стеками", url: (id: string) => `#/screen/final/${id}`, type: "final-table" },
    { key: "results", title: "Итоги турнира", desc: "Победитель и топ-10 с очками", url: (id: string) => `#/screen/results/${id}`, type: "results" },
    { key: "ranking", title: "Рейтинг клуба", desc: "Топ-20 игроков, автообновление", url: () => "#/screen/ranking", type: "ranking" },
  ];
  const ts = Object.values(tournaments);
  
  return (
    <div>
      <SectionTitle kicker="ТВ-мониторы клуба" title="Экраны" right={<Badge tone="mut">обновление в реальном времени</Badge>} />
      <div className="grid gap-4 md:grid-cols-2">
        {defs.map((d, i) => {
          const cfg = screens[d.key];
          const tid = cfg?.tournamentId ?? ts.find((t) => t.status === "active")?.id ?? ts[0]?.id ?? "";
          const t = tournaments[tid];
          return (
            <Reveal key={d.key} delay={i * 70} className="h-full">
              <div className="panel flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[15.5px] font-extrabold">{d.title}</h3>
                    <p className="mt-1 text-[12.5px] text-mut">{d.desc}</p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-xl bg-(--acc-soft) text-(--acc) ring-1 ring-(--acc-line)"><MonitorPlay className="size-5" /></span>
                </div>
                <div className="felt stitched mt-4 flex items-center justify-between rounded-xl px-4 py-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/60">{d.type}</span>
                  <span className="num text-[17px] font-extrabold text-[#ffd76a]">{d.key === "ranking" ? "ТОП-20" : t ? `${t.pult.currentLevel} ур. · ${fmtNum(t.startingStack)}` : "—"}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {d.key !== "ranking" && (
                    <Select label="Какой турнир транслировать" value={tid} 
                      onChange={async (v) => { 
                        if (!ro) {
                          setLoading(true);
                          try {
                            await setScreen(d.key, { type: d.type, tournamentId: v });
                          } catch (err: any) {
                            toast(err.message || "Ошибка", "err");
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      options={ts.map((x) => ({ v: x.id, l: `${x.name} · ${x.status === "active" ? "LIVE" : x.status === "planned" ? "скоро" : "завершён"}` }))} />
                  )}
                  <a href={d.url(tid)} className="flex items-center justify-center gap-2 rounded-xl border border-(--acc-line)/60 bg-(--acc-soft) px-4 py-2.5 text-[13.5px] font-extrabold text-(--acc) transition hover:brightness-125">
                    <ExternalLink className="size-4" /> Открыть экран (публичная ссылка)
                  </a>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
      <p className="mt-4 text-[12.5px] font-semibold text-dim">Экраны не требуют авторизации: откройте ссылку на ТВ-мониторе — данные подтянутся автоматически, F11 — полноэкранный режим.</p>
    </div>
  );
}
/* ================================ НАСТРОЙКИ ================================ */
export function SettingsPage() {
  const { club, achievements, users } = useFirebaseData();
  const [achEdit, setAchEdit] = useState<{ id: string | null; name: string; description: string; icon: string; conditionType: CondType; threshold: number } | null>(null);
  const [delAch, setDelAch] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <SectionTitle kicker="Конфигурация платформы" title="Настройки" />
      <div className="grid gap-4 xl:grid-cols-2">
        {/* brand */}
        <Reveal>
          <div className="panel p-5">
            <p className="lbl flex items-center gap-2"><Flag className="size-4 text-(--acc)" /> Бренд клуба</p>
            <div className="mt-3 space-y-3.5">
              <Field label="Название клуба">
                <input className="inp" defaultValue={club?.name || ""} 
                  onBlur={async (e) => { 
                    try {
                      await updateClub({ name: e.target.value || club?.name || "" }); 
                      toast("Название обновлено"); 
                    } catch (err: any) {
                      toast(err.message || "Ошибка", "err");
                    }
                  }} />
              </Field>
              <Field label="Слоган" hint="Попадает в бегущую строку на ТВ-экранах">
                <textarea className="inp min-h-[70px]" defaultValue={club?.slogan || ""} 
                  onBlur={async (e) => { 
                    try {
                      await updateClub({ slogan: e.target.value }); 
                      toast("Слоган обновлён"); 
                    } catch (err: any) {
                      toast(err.message || "Ошибка", "err");
                    }
                  }} />
              </Field>
              <Select label="Язык интерфейса" value={club?.language || "ru"} 
                onChange={async (v) => { 
                  try {
                    await updateClub({ language: v as "ru" | "en" }); 
                  } catch (err: any) {
                    toast(err.message || "Ошибка", "err");
                  }
                }}
                options={[{ v: "ru", l: "Русский" }, { v: "en", l: "English" }]} />
            </div>
          </div>
        </Reveal>

        <div className="space-y-4">
          {/* accent */}
          <Reveal delay={60}>
            <div className="panel p-5">
              <p className="lbl flex items-center gap-2"><Sparkles className="size-4 text-(--acc)" /> Активный цвет</p>
              <p className="mt-1 text-[12.5px] text-mut">Применяется сразу: кнопки, акценты, ТВ-экраны</p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                {Object.entries(ACCENTS).map(([k, a]) => (
                  <button key={k} onClick={async () => { 
                    try {
                      await updateClub({ activeColor: k }); 
                      toast(`Акцент: ${a.name}`); 
                    } catch (err: any) {
                      toast(err.message || "Ошибка", "err");
                    }
                  }}
                    className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-extrabold transition-all",
                      club?.activeColor === k ? "border-(--acc-line) bg-(--acc-soft)" : "border-line bg-white/[0.03] hover:bg-white/[0.07]")}>
                    <span className="size-4.5 rounded-full" style={{ background: a.hex }} /> {a.name}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
          
          {/* bg */}
          <Reveal delay={120}>
            <div className="panel p-5">
              <p className="lbl flex items-center gap-2"><LayoutGrid className="size-4 text-(--acc)" /> Цвет фона платформы</p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                {BGS.map((b) => (
                  <button key={b.hex} onClick={async () => { 
                    try {
                      await updateClub({ bgColor: b.hex }); 
                      toast(`Фон: ${b.name}`); 
                    } catch (err: any) {
                      toast(err.message || "Ошибка", "err");
                    }
                  }}
                    className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-extrabold transition-all",
                      club?.bgColor === b.hex ? "border-(--acc-line) bg-(--acc-soft)" : "border-line bg-white/[0.03] hover:bg-white/[0.07]")}>
                    <span className="size-4.5 rounded-full ring-1 ring-white/25" style={{ background: b.hex }} /> {b.name}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
          
          {/* sound */}
          <Reveal delay={180}>
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <p className="lbl !mb-0 flex items-center gap-2">{club?.sound ? <Volume2 className="size-4 text-(--acc)" /> : <VolumeX className="size-4 text-dim" />} Звуковое сопровождение</p>
                <Toggle checked={club?.sound || false} onChange={async (v) => { 
                  try {
                    await updateClub({ sound: v }); 
                    if (v) setTimeout(() => updateClub({ sound: true }), 0); 
                  } catch (err: any) {
                    toast(err.message || "Ошибка", "err");
                  }
                }} />
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-mut">Смена уровня, нокаут, бонус, ребай и победа озвучиваются на пульте и в кабинетах. Звуки синтезируются Web Audio API — файлы не нужны.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["уровень", "нокаут", "бонус", "ребай", "победа"].map((x) => <Badge key={x} tone="mut">{x}</Badge>)}
              </div>
            </div>
          </Reveal>
        </div>

        {/* achievements */}
        <Reveal delay={100}>
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="lbl !mb-0 flex items-center gap-2"><Medal className="size-4 text-(--acc)" /> Достижения игроков</p>
              <Btn size="xs" variant="soft" onClick={() => setAchEdit({ id: null, name: "", description: "", icon: "trophy", conditionType: "totalTournaments", threshold: 1 })}><Plus className="size-3.5" /> Создать</Btn>
            </div>
            <p className="mt-2 text-[12.5px] text-mut">Присваиваются автоматически после каждого завершённого турнира, когда показатель достигает порога.</p>
            <div className="mt-3 space-y-2">
              {Object.values(achievements || {}).map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--acc-soft) text-(--acc)"><AchIcon name={a.icon} className="size-4.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{a.name}</span>
                    <span className="text-[11.5px] font-semibold text-dim">{COND_LABEL[a.conditionType]} ≥ <b className="num text-mut">{a.threshold}</b></span>
                  </span>
                  <RowBtn title="Изменить" onClick={() => setAchEdit({ id: a.id, name: a.name, description: a.description, icon: a.icon, conditionType: a.conditionType, threshold: a.threshold })}><Pencil className="size-4" /></RowBtn>
                  <RowBtn title="Удалить" onClick={() => setDelAch(a)}><Trash2 className="size-4 text-bad" /></RowBtn>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* operators + danger */}
        <div className="space-y-4">
          <Reveal delay={160}>
            <div className="panel p-5">
              <p className="lbl flex items-center gap-2"><ShieldCheck className="size-4 text-(--acc)" /> Роли и операторы</p>
              <p className="mt-1 text-[12.5px] text-mut">Оператор ведёт пульт и турниры, остальные разделы — только просмотр.</p>
              <div className="mt-3 max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
                {Object.values(users || {}).filter((u) => u && !u.isArchived).sort((a, b) => a.nickname.localeCompare(b.nickname)).map((u) => (
                  <div key={u.uid} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-2.5 py-2">
                    <Avatar user={u} size={30} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{u.nickname}</span>
                    <select className="inp !min-h-[34px] !w-auto !rounded-lg !px-2 !py-1 text-[12px] font-bold" value={u.role}
                      onChange={async (e) => { 
                        setLoading(true);
                        try {
                          await adminSaveUser(u.uid, { 
                            nickname: u.nickname, firstName: u.firstName, lastName: u.lastName, 
                            email: u.email, phone: u.phone, role: e.target.value as Role, 
                            startPoints: 0, hue: u.hue 
                          }); 
                          toast(`${u.nickname}: роль «${ROLE_LABEL[e.target.value as Role]}»`); 
                        } catch (err: any) {
                          toast(err.message || "Ошибка", "err");
                        } finally {
                          setLoading(false);
                        }
                      }}>
                      <option value="player">Игрок</option><option value="operator">Оператор</option><option value="admin">Админ</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          
          <Reveal delay={220}>
            <div className="panel border-bad/25 p-5">
              <p className="lbl flex items-center gap-2"><RotateCcw className="size-4 text-bad" /> Демо-данные</p>
              <p className="mt-1 text-[12.5px] text-mut">Вернуть платформу к исходному состоянию — все изменения будут потеряны.</p>
              <Btn variant="danger" size="sm" className="mt-3" disabled title="Функция восстановления пока недоступна"><RotateCcw className="size-4" /> Сбросить данные</Btn>
            </div>
          </Reveal>
        </div>
      </div>

      <Modal open={!!achEdit} onClose={() => setAchEdit(null)} title={achEdit?.id ? "Редактировать достижение" : "Новое достижение"} w="max-w-xl">
        {achEdit && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Название"><input className="inp" value={achEdit.name} onChange={(e) => setAchEdit({ ...achEdit, name: e.target.value })} /></Field>
              <Field label="Порог значения"><input type="number" className="inp" value={achEdit.threshold} onChange={(e) => setAchEdit({ ...achEdit, threshold: +e.target.value || 1 })} /></Field>
            </div>
            <Field label="Описание"><input className="inp" value={achEdit.description} onChange={(e) => setAchEdit({ ...achEdit, description: e.target.value })} /></Field>
            <Select label="Условие" value={achEdit.conditionType} onChange={(v) => setAchEdit({ ...achEdit, conditionType: v as CondType })}
              options={Object.entries(COND_LABEL).map(([k, l]) => ({ v: k, l }))} />
            <Field label="Иконка">
              <div className="flex flex-wrap gap-2 pt-1">
                {ACH_ICONS.map((ic) => (
                  <button key={ic} onClick={() => setAchEdit({ ...achEdit, icon: ic })}
                    className={cn("grid size-11 place-items-center rounded-xl border transition", achEdit.icon === ic ? "border-(--acc-line) bg-(--acc-soft) text-(--acc)" : "border-line bg-white/[0.03] text-mut hover:text-ink")}>
                    <AchIcon name={ic} className="size-5" />
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setAchEdit(null)}>Отмена</Btn>
              <Btn onClick={async () => {
                if (!achEdit.name.trim()) { toast("Укажите название", "err"); return; }
                setLoading(true);
                try {
                  await saveAchievement(achEdit.id, { 
                    name: achEdit.name.trim(), description: achEdit.description, 
                    icon: achEdit.icon, conditionType: achEdit.conditionType, 
                    threshold: achEdit.threshold 
                  });
                  setAchEdit(null); 
                  toast("Достижение сохранено");
                } catch (err: any) {
                  toast(err.message || "Ошибка", "err");
                } finally {
                  setLoading(false);
                }
              }} disabled={loading}><Save className="size-4" /> Сохранить</Btn>
            </div>
          </div>
        )}
      </Modal>
      
      <Modal open={!!delAch} onClose={() => setDelAch(null)} title="Удалить достижение?" subtitle={delAch?.name}>
        <p className="text-[13.5px] font-semibold text-mut">Уже полученные игроками награды с этим названием останутся в их витринах.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setDelAch(null)}>Отмена</Btn>
          <Btn variant="danger" onClick={async () => { 
            if (delAch) { 
              setLoading(true);
              try {
                await deleteAchievement(delAch.id); 
                setDelAch(null); 
                toast("Удалено", "info"); 
              } catch (err: any) {
                toast(err.message || "Ошибка", "err");
              } finally {
                setLoading(false);
              }
            } 
          }} disabled={loading}><Trash2 className="size-4" /> Удалить</Btn>
        </div>
      </Modal>
    </div>
  );
}