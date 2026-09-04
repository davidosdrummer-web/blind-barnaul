import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Play, Users, CalendarDays, Coins, Timer, ListOrdered, Settings2,
  Gift, LayoutGrid, ChevronUp, ChevronDown, Search, X, Shuffle, SortDesc, Zap, FileStack,
  Save, ArrowLeft, ExternalLink, Trophy, Dices, AlertTriangle, Scale,
} from "lucide-react";
import { useFirebaseData } from "../lib/useFirebaseData";
import { useAuth } from "../lib/useAuth";
import {
  Tournament, TournamentDraft, TemplateData, User, capacity, lateRegOpen, sortedSeatCodes, tableCounts, balanceErrorForSeat,
  fmtDate, fmtNum, fmtDateShort, plural, DAY, uid as genId,
} from "../lib/db";
import {
  saveTournament, deleteTournament, launchTournament, registerSelf, cancelSelf, setSeat,
  setPlayerNumber, seatRandom, seatByRating, saveTemplate,
} from "../lib/firebaseDb";
import { Avatar, Badge, Btn, Empty, Field, Modal, Reveal, SectionTitle, Select, StatusBadge, Tabs, Toggle, cn, toast, useHoverDelay } from "../lib/ui";

const toISO = (ts: number) => new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fromISO = (iso: string) => new Date(iso + "T12:00:00").getTime();

/* ================================ СПИСОК ================================ */
export default function TournamentsList() {
  const { tournaments, seasons, users } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("planned");
  const [del, setDel] = useState<Tournament | null>(null);
  const [res, setRes] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  
  const me = firebaseUser ? users?.[firebaseUser.uid] : null;
  const isAdmin = me?.role === "admin";

  const groups: Record<string, Tournament[]> = { active: [], planned: [], completed: [] };
  Object.values(tournaments || {}).forEach((t) => groups[t.status].push(t));
  (["active", "planned"] as const).forEach((k) => groups[k].sort((a, b) => a.startDate - b.startDate));
  groups.completed.sort((a, b) => (b.results?.completedAt ?? 0) - (a.results?.completedAt ?? 0));
  const list = groups[tab];

  const onLaunch = async (t: Tournament) => {
    setLoading(true);
    try {
      const err = await launchTournament(t.id);
      if (err) { toast(err, "err"); return; }
      toast(`«${t.name}» запущен — таймер идёт`);
      nav(`/app/pult/${t.id}`);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionTitle kicker="Управление турнирами" title="Турниры"
        right={<Btn onClick={() => nav("/app/tournaments/new")}><Plus className="size-4.5" /> Создать турнир</Btn>} />
      <Tabs val={tab} onChange={setTab} tabs={[
        { k: "planned", label: "Запланированные", count: groups.planned.length },
        { k: "active", label: "Активные", count: groups.active.length },
        { k: "completed", label: "Завершённые", count: groups.completed.length },
      ]} />
      {list.length === 0 ? (
        <div className="panel mt-4"><Empty icon={<Trophy className="size-7" />} title={tab === "active" ? "Сейчас ничего не идёт" : "Пусто"}
          text={tab === "active" ? "Запустите запланированный турнир — пульт появится автоматически." : "Создайте турнир или примените шаблон."} /></div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t, i) => {
            const cnt = Object.keys(t.registeredPlayers || {}).length;
            const seated = Object.values(t.registeredPlayers || {}).filter((r) => r.seatCode).length;
            return (
              <Reveal key={t.id} delay={i * 60} className="h-full">
                <div className="panel flex h-full flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <StatusBadge status={t.status} />
                    {t.status === "planned" && seated < 2 && cnt > 0 && <Badge tone="warn">рассажено {seated}</Badge>}
                  </div>
                  <h3 className="mt-3 font-display text-[16.5px] font-extrabold leading-snug">{t.name}</h3>
                  <p className="mt-1 text-[12.5px] text-mut">{seasons[t.seasonId]?.name ?? "Вне сезона"}</p>
                  <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[12.5px] font-semibold text-mut">
                    <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-(--acc)" /> {fmtDate(t.startDate)} · {t.startTime}</span>
                    <span className="flex items-center gap-1.5"><Coins className="size-4 text-(--acc)" /> {fmtNum(t.startingStack)}</span>
                    <span className="flex items-center gap-1.5"><Users className="size-4 text-(--acc)" /> {cnt}/{capacity(t)} мест</span>
                    <span className="flex items-center gap-1.5"><Timer className="size-4 text-(--acc)" /> рег. {t.registrationDuration} мин</span>
                  </div>
                  {t.status === "active" && (
                    <p className="mt-3 flex items-center gap-2 rounded-xl bg-(--acc-soft) px-3 py-2 text-[12px] font-extrabold text-(--acc)">
                      <span className="relative size-1.5 rounded-full bg-(--acc) live-dot" />
                      Уровень {t.pult.currentLevel}/{t.structure.levels.length} · в игре {Object.values(t.registeredPlayers || {}).filter((r) => !r.isEliminated).length}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {t.status === "planned" && (
                      <>
                        <Btn size="sm" variant="soft" onClick={() => nav(`/app/tournaments/${t.id}/seats`)}><Users className="size-4" /> Регистрация</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => onLaunch(t)} disabled={seated < 2 || loading} title={seated < 2 ? "Нужно минимум 2 участника за столами" : ""}><Play className="size-4" /> Запустить</Btn>
                        <Btn size="sm" variant="dark" onClick={() => nav(`/app/tournaments/${t.id}/edit`)}><Pencil className="size-4" /></Btn>
                        {isAdmin && <Btn size="sm" variant="danger" onClick={() => setDel(t)}><Trash2 className="size-4" /></Btn>}
                      </>
                    )}
                    {t.status === "active" && (
                      <>
                        <Btn size="sm" onClick={() => nav(`/app/pult/${t.id}`)}><Zap className="size-4" /> Пульт</Btn>
                        <Btn size="sm" variant="soft" onClick={() => nav(`/app/tournaments/${t.id}/seats`)}><Users className="size-4" /> Регистрация</Btn>
                      </>
                    )}
                    {t.status === "completed" && (
                      <>
                        <Btn size="sm" variant="soft" onClick={() => setRes(t)}><ListOrdered className="size-4" /> Итоги</Btn>
                        <a href={`#/screen/results/${t.id}`} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3.5 py-2 text-[13px] font-bold text-mut transition hover:text-(--acc) hover:border-(--acc-line)">
                          <ExternalLink className="size-4" /> ТВ-экран
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      <Modal open={!!del} onClose={() => setDel(null)} title="Удалить турнир?" subtitle={del?.name}>
        <p className="text-[13.5px] font-semibold leading-relaxed text-mut">Записи участников будут удалены вместе с турниром. Действие необратимо.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setDel(null)}>Отмена</Btn>
          <Btn variant="danger" onClick={async () => { 
            if (del) { 
              setLoading(true);
              try {
                await deleteTournament(del.id); 
                toast("Турнир удалён", "info"); 
              } catch (err: any) {
                toast(err.message || "Ошибка", "err");
              } finally {
                setLoading(false);
              }
            } 
            setDel(null); 
          }} disabled={loading}><Trash2 className="size-4" /> Удалить</Btn>
        </div>
      </Modal>

      <Modal open={!!res} onClose={() => setRes(null)} title="Итоги турнира" subtitle={res ? `${res.name} · ${fmtDate(res.results?.completedAt ?? 0)}` : ""} w="max-w-xl">
        {res?.results && (
          <div className="space-y-1.5">
            {res.results.ranking.map((u, i) => (
              <div key={u} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", i === 0 ? "bg-[#ffd76a]/10 ring-1 ring-[#ffd76a]/30" : "bg-white/[0.03]")}>
                <span className={cn("num w-9 text-center font-display text-[16px] font-extrabold", i === 0 ? "text-[#ffd76a]" : i === 1 ? "text-[#c9d4e5]" : i === 2 ? "text-[#d9915b]" : "text-dim")}>{i + 1}</span>
                <Avatar user={users?.[u]} size={34} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{users[u]?.nickname ?? "—"}</span>
                <span className="num text-[14px] font-extrabold text-(--acc)">+{res.results!.pointsAwarded[u] ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ================================ ФОРМА ================================ */
function defaultDraft(seasons: Record<string, any>): TournamentDraft {
  const seasonId = Object.values(seasons || {}).find((x) => x.isActive)?.id ?? Object.keys(seasons || {})[0] ?? "";
  return {
    name: "", seasonId, startDate: Date.now() + 2 * DAY, startTime: "19:00", registrationDuration: 30,
    startingStack: 15000, finalTablePlayers: 9, description: "", pointsForKnockout: true,
    knockoutPoints: 5, rebuyChips: 15000, reentryChips: 15000, addonChips: 7500,
    isFinal: false,
    structure: {
      levels: [
        { level: 1, sb: 25, bb: 50, ante: 0, duration: 12 },
        { level: 2, sb: 50, bb: 100, ante: 0, duration: 12 },
        { level: 3, sb: 75, bb: 150, ante: 25, duration: 12 },
        { level: 4, sb: 100, bb: 200, ante: 50, duration: 12 },
      ],
      breaks: [{ afterLevel: 4, duration: 10 }],
    },
    bonuses: [{ id: genId(), name: "Ранний бонус", chips: 3000 }],
    pointsTable: { "1": 100, "2": 80, "3": 60, "4": 45, "5": 35, participation: 10 },
    tables: { totalTables: 2, seatsPerTable: 9 },
  };
}

export function TournamentForm({ editId, templateId }: { editId: string | null; templateId?: string | null }) {
  const { tournaments, seasons, templates } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const editing = editId ? tournaments[editId] : null;
  const tplMode = templateId != null;
  const srcTpl = tplMode && templateId !== "new" ? templates?.[templateId] || null : null;
  
  const [d, setD] = useState<TournamentDraft>(() => {
    const seasonId = Object.values(seasons || {}).find((x) => x.isActive)?.id ?? Object.keys(seasons || {})[0] ?? "";
    if (srcTpl) {
      const td = srcTpl.data;
      return {
        name: srcTpl.name, seasonId, startDate: Date.now() + 2 * DAY, startTime: "19:00",
        registrationDuration: td.registrationDuration, startingStack: td.startingStack,
        finalTablePlayers: td.finalTablePlayers, description: td.description,
        pointsForKnockout: td.pointsForKnockout, knockoutPoints: td.knockoutPoints ?? 5,
        rebuyChips: td.rebuyChips ?? td.startingStack, reentryChips: td.reentryChips ?? td.startingStack, 
        addonChips: td.addonChips ?? Math.round(td.startingStack / 2),
        isFinal: td.isFinal ?? false,
        structure: structuredClone(td.structure), bonuses: structuredClone(td.bonuses),
        pointsTable: { ...td.pointsTable }, tables: { ...td.tables },
      };
    }
    if (!editing) return defaultDraft(seasons);
    return {
      name: editing.name, seasonId: editing.seasonId, startDate: editing.startDate, startTime: editing.startTime,
      registrationDuration: editing.registrationDuration, startingStack: editing.startingStack,
      finalTablePlayers: editing.finalTablePlayers, description: editing.description,
      pointsForKnockout: editing.pointsForKnockout, knockoutPoints: editing.knockoutPoints ?? 5,
      rebuyChips: editing.rebuyChips ?? editing.startingStack, reentryChips: editing.reentryChips ?? editing.startingStack, 
      addonChips: editing.addonChips ?? Math.round(editing.startingStack / 2),
      isFinal: editing.isFinal ?? false,
      structure: structuredClone(editing.structure),
      bonuses: structuredClone(editing.bonuses), pointsTable: { ...editing.pointsTable },
      tables: { totalTables: editing.tables.totalTables, seatsPerTable: editing.tables.seatsPerTable },
    };
  });
  
  const [tab, setTab] = useState("params");
  const [tplOpen, setTplOpen] = useState(false);
  const [saveTpl, setSaveTpl] = useState(false);
  const [tplName, setTplName] = useState("");

  const set = (patch: Partial<TournamentDraft>) => setD((p) => ({ ...p, ...patch }));
  
  const setStruct = (fn: (st: TournamentDraft["structure"]) => void) => setD((p) => { 
    const st = structuredClone(p.structure); 
    fn(st); 
    return { ...p, structure: st }; 
  });
  
  const moveLevel = (i: number, dir: -1 | 1) => setStruct((st) => {
    const j = i + dir; 
    if (j < 0 || j >= st.levels.length) return;
    [st.levels[i], st.levels[j]] = [st.levels[j], st.levels[i]];
    st.levels.forEach((l, k) => (l.level = k + 1));
  });
  
  const addLevel = () => setStruct((st) => {
    const last = st.levels[st.levels.length - 1] ?? { sb: 25, bb: 50, ante: 0, duration: 12 };
    st.levels.push({ 
      level: st.levels.length + 1, 
      sb: last.bb, 
      bb: last.bb * 2, 
      ante: last.ante ? Math.round(last.ante * 2) : 0, 
      duration: last.duration 
    });
  });
  
  const removeLevel = (i: number) => setStruct((st) => { 
    st.levels.splice(i, 1); 
    st.levels.forEach((l, k) => (l.level = k + 1)); 
  });
  
  const updLevel = (i: number, patch: Partial<TournamentDraft["structure"]["levels"][0]>) =>
    setStruct((st) => Object.assign(st.levels[i], patch));

  const toTemplateData = (x: TournamentDraft): TemplateData => ({
    startingStack: x.startingStack, finalTablePlayers: x.finalTablePlayers, pointsForKnockout: x.pointsForKnockout,
    knockoutPoints: x.knockoutPoints, rebuyChips: x.rebuyChips, reentryChips: x.reentryChips, addonChips: x.addonChips,
    registrationDuration: x.registrationDuration, description: x.description,
    structure: x.structure, bonuses: x.bonuses, pointsTable: x.pointsTable, tables: x.tables,
  });
  
  const applyTemplate = (data: TemplateData) => {
    setD((p) => ({
      ...p, startingStack: data.startingStack, finalTablePlayers: data.finalTablePlayers,
      pointsForKnockout: data.pointsForKnockout, registrationDuration: data.registrationDuration,
      knockoutPoints: data.knockoutPoints ?? 5,
      rebuyChips: data.rebuyChips ?? data.startingStack, reentryChips: data.reentryChips ?? data.startingStack,
      addonChips: data.addonChips ?? Math.round(data.startingStack / 2),
      description: data.description || p.description,
      structure: structuredClone(data.structure), bonuses: structuredClone(data.bonuses),
      pointsTable: { ...data.pointsTable }, tables: { ...data.tables },
    }));
    setTplOpen(false);
    toast("Шаблон применён — данные можно отредактировать");
  };
  
  const doSaveTpl = async () => {
    setLoading(true);
    try {
      if (tplMode) {
        const err = await saveTemplate(templateId === "new" ? null : templateId, d.name.trim(), toTemplateData(d));
        if (err) { toast(err, "err"); return; }
        toast("Шаблон сохранён в библиотеку");
        nav("/app/templates");
        return;
      }
      const err = await saveTemplate(null, tplName || d.name + " (шаблон)", toTemplateData(d));
      if (err) { toast(err, "err"); return; }
      setSaveTpl(false); setTplName(""); toast("Шаблон сохранён в библиотеку");
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };
  
  const doSave = async () => {
    setLoading(true);
    try {
      const err = await saveTournament(editId, d);
      if (err) { toast(err, "err"); return; }
      toast(editId ? "Турнир обновлён" : "Турнир создан — регистрация открыта");
      nav("/app/tournaments");
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  const pts = Object.entries(d.pointsTable).filter(([k]) => k !== "participation");

  return (
    <div>
      <button onClick={() => nav(tplMode ? "/app/templates" : "/app/tournaments")} className="mb-4 inline-flex items-center gap-2 text-[13px] font-extrabold text-mut transition hover:text-(--acc)">
        <ArrowLeft className="size-4" /> {tplMode ? "К шаблонам" : "К списку турниров"}
      </button>
      <SectionTitle
        kicker={tplMode ? (srcTpl ? "Раздел «Шаблоны» · редактирование" : "Раздел «Шаблоны» · новый") : editing ? "Редактирование" : "Новый турнир"}
        title={tplMode ? (srcTpl ? `Шаблон «${srcTpl.name}»` : "Создание шаблона") : editing ? `«${editing.name}»` : "Создание турнира"}
        right={
          tplMode ? (
            <Badge tone="acc">поля идентичны созданию турнира</Badge>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Btn variant="soft" size="sm" onClick={() => setTplOpen(true)}><FileStack className="size-4" /> Выбрать шаблон</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setSaveTpl(true)}><Save className="size-4" /> Сохранить шаблон</Btn>
            </div>
          )
        } />

      <Tabs val={tab} onChange={setTab} tabs={[
        { k: "params", label: "Параметры", icon: <Settings2 className="size-4" /> },
        { k: "structure", label: "Структура", icon: <Timer className="size-4" /> },
        { k: "bonuses", label: "Бонусы", icon: <Gift className="size-4" /> },
        { k: "points", label: "Очки", icon: <ListOrdered className="size-4" /> },
        { k: "tables", label: "Столы", icon: <LayoutGrid className="size-4" /> },
      ]} />

      <div className="panel mt-4 p-5 sm:p-6">
        {tab === "params" && (
          <div className="grid gap-4 sm:grid-cols-2 anim-in">
            <Field label="Название турнира"><input className="inp" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Кубок осени" /></Field>
            <Select label="Сезон" value={d.seasonId} onChange={(v) => set({ seasonId: v })}
              options={Object.values(seasons).map((x) => ({ v: x.id, l: x.name + (x.isActive ? " · активен" : "") }))} />
            <Field label="Дата старта"><input type="date" className="inp" value={toISO(d.startDate)} onChange={(e) => e.target.value && set({ startDate: fromISO(e.target.value) })} /></Field>
            <Field label="Время старта"><input type="time" className="inp" value={d.startTime} onChange={(e) => set({ startTime: e.target.value })} /></Field>
            <Field label="Стартовый стек" hint="Фишек у каждого игрока на старте"><input type="number" className="inp" value={d.startingStack} onChange={(e) => set({ startingStack: +e.target.value || 0 })} /></Field>
            <Field label="Поздняя регистрация, мин" hint="Сколько минут можно регистрироваться и возвращаться после старта"><input type="number" className="inp" value={d.registrationDuration} onChange={(e) => set({ registrationDuration: +e.target.value || 0 })} /></Field>
            <Field label="Финальный стол, игроков" hint="При каком числе игроков включается режим финального стола"><input type="number" className="inp" value={d.finalTablePlayers} onChange={(e) => set({ finalTablePlayers: +e.target.value || 0 })} /></Field>
            <div className="sm:col-span-2 rounded-2xl border border-line bg-white/[0.025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Toggle checked={d.pointsForKnockout} onChange={(v) => set({ pointsForKnockout: v })} label="Очки за выбивание (баунти)" />
                {d.pointsForKnockout && (
                  <div className="w-[150px]">
                    <NumIn label="Очков за нокаут" v={d.knockoutPoints} on={(v) => set({ knockoutPoints: v })} />
                  </div>
                )}
              </div>
              <p className="mt-2 text-[12px] font-semibold text-dim">Очки начисляются автоматически при подведении итогов: за каждого выбитого игрока.</p>
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-line bg-white/[0.025] p-4">
              <p className="lbl !mb-3 flex items-center gap-2"><Coins className="size-4 text-(--acc)" /> Возврат в игру — размер в фишках</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumIn label="Ребай (Rebuy)" v={d.rebuyChips} on={(v) => set({ rebuyChips: v })} />
                <NumIn label="Ре-энтри (Re-entry)" v={d.reentryChips} on={(v) => set({ reentryChips: v })} />
                <NumIn label="Адд-он (Addon)" v={d.addonChips} on={(v) => set({ addonChips: v })} />
              </div>
              <p className="mt-2 text-[12px] font-semibold text-dim">Эти суммы вводятся в игру при возврате участника на пульте и прибавляются к общему банку турнира. Ласт Шанс — сумма задаётся вручную.</p>
            </div>
            <div className="sm:col-span-2"><Field label="Описание турнира"><textarea className="inp min-h-[88px]" value={d.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
          </div>
        )}

        {tab === "structure" && (
          <div className="anim-in">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold text-mut">Уровни блайндов — таймер переключает их автоматически</p>
              <Btn variant="soft" size="sm" onClick={addLevel}><Plus className="size-4" /> Уровень</Btn>
            </div>
            <div className="space-y-2">
              {d.structure.levels.map((l, i) => (
                <div key={i} className="grid grid-cols-[34px_repeat(4,1fr)_auto] items-center gap-2 rounded-xl border border-line bg-white/[0.03] p-2.5">
                  <span className="num text-center font-display text-[13px] font-extrabold text-(--acc)">{i + 1}</span>
                  <NumIn label="МБ" v={l.sb} on={(v) => updLevel(i, { sb: v })} />
                  <NumIn label="ББ" v={l.bb} on={(v) => updLevel(i, { bb: v })} />
                  <NumIn label="Анте" v={l.ante} on={(v) => updLevel(i, { ante: v })} />
                  <NumIn label="Мин" v={l.duration} on={(v) => updLevel(i, { duration: v })} />
                  <span className="flex gap-1">
                    <IconBtn onClick={() => moveLevel(i, -1)} disabled={i === 0}><ChevronUp className="size-4" /></IconBtn>
                    <IconBtn onClick={() => moveLevel(i, 1)} disabled={i === d.structure.levels.length - 1}><ChevronDown className="size-4" /></IconBtn>
                    <IconBtn onClick={() => removeLevel(i)} danger><X className="size-4" /></IconBtn>
                  </span>
                </div>
              ))}
            </div>
            <p className="lbl mt-6">Перерывы</p>
            <div className="space-y-2">
              {d.structure.breaks.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-xl border border-dashed border-line bg-white/[0.02] p-2.5">
                  <Select label="После уровня" value={String(b.afterLevel)} onChange={(v) => setStruct((st) => { st.breaks[i].afterLevel = +v; })}
                    options={d.structure.levels.map((l, k) => ({ v: String(k + 1), l: `Уровень ${k + 1}` }))} />
                  <NumIn label="Длительность, мин" v={b.duration} on={(v) => setStruct((st) => { st.breaks[i].duration = v; })} />
                  <IconBtn onClick={() => setStruct((st) => { st.breaks.splice(i, 1); })} danger><X className="size-4" /></IconBtn>
                </div>
              ))}
              <Btn variant="ghost" size="sm" onClick={() => setStruct((st) => { st.breaks.push({ afterLevel: st.levels.length, duration: 10 }); })}><Plus className="size-4" /> Перерыв</Btn>
            </div>
          </div>
        )}

        {tab === "bonuses" && (
          <div className="anim-in">
            <p className="mb-3 text-[13px] font-bold text-mut">Бонусы доступны оператору на пульте во время турнира</p>
            <div className="space-y-2">
              {d.bonuses.map((b, i) => (
                <div key={b.id} className="grid grid-cols-[2fr_1fr_auto] items-center gap-2 rounded-xl border border-line bg-white/[0.03] p-2.5">
                  <input className="inp !min-h-[42px]" value={b.name} onChange={(e) => setD((p) => { 
                    const bn = [...p.bonuses]; 
                    bn[i] = { ...bn[i], name: e.target.value }; 
                    return { ...p, bonuses: bn }; 
                  })} placeholder="Название бонуса" />
                  <NumIn label="Фишек" v={b.chips} on={(v) => setD((p) => { 
                    const bn = [...p.bonuses]; 
                    bn[i] = { ...bn[i], chips: v }; 
                    return { ...p, bonuses: bn }; 
                  })} />
                  <IconBtn onClick={() => setD((p) => ({ ...p, bonuses: p.bonuses.filter((x) => x.id !== b.id) }))} danger><X className="size-4" /></IconBtn>
                </div>
              ))}
            </div>
            <Btn variant="ghost" size="sm" className="mt-2" onClick={() => setD((p) => ({ ...p, bonuses: [...p.bonuses, { id: genId(), name: "", chips: 2000 }] }))}><Plus className="size-4" /> Бонус</Btn>
          </div>
        )}

        {tab === "points" && (
          <div className="anim-in">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold text-mut">Очки за место. Места сверх таблицы получают очки за участие.</p>
              <Btn variant="soft" size="sm" onClick={() => setD((p) => ({ ...p, pointsTable: { ...p.pointsTable, [String(pts.length + 1)]: 10 } }))}><Plus className="size-4" /> Место</Btn>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {pts.map(([place, val], i) => (
                <div key={place} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-xl border border-line bg-white/[0.03] p-2.5">
                  <span className="num rounded-lg bg-white/[0.05] px-3 py-2.5 text-center font-display text-[14px] font-extrabold text-(--acc)">#{place}</span>
                  <NumIn label="Очки" v={val} on={(v) => setD((p) => ({ ...p, pointsTable: { ...p.pointsTable, [place]: v } }))} />
                  <IconBtn onClick={() => setD((p) => { const pt = { ...p.pointsTable }; delete pt[place]; return { ...p, pointsTable: pt }; })} danger><X className="size-4" /></IconBtn>
                </div>
              ))}
            </div>
            <div className="mt-4 max-w-[240px]">
              <NumIn label="Очки за участие" v={d.pointsTable["participation"] ?? 0} on={(v) => setD((p) => ({ ...p, pointsTable: { ...p.pointsTable, participation: v } }))} />
            </div>
          </div>
        )}

        {tab === "tables" && (
          <div className="anim-in">
            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
              <Field label="Количество столов"><input type="number" min={1} max={12} className="inp" value={d.tables.totalTables} onChange={(e) => set({ tables: { ...d.tables, totalTables: Math.max(1, +e.target.value || 1) } })} /></Field>
              <Field label="Мест за столом"><input type="number" min={2} max={10} className="inp" value={d.tables.seatsPerTable} onChange={(e) => set({ tables: { ...d.tables, seatsPerTable: Math.max(2, +e.target.value || 2) } })} /></Field>
            </div>
            <p className="mt-4 text-[13.5px] font-bold text-mut">Всего мест для регистрации: <span className="num text-(--acc)">{d.tables.totalTables * d.tables.seatsPerTable}</span></p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Array.from({ length: d.tables.totalTables * d.tables.seatsPerTable }, (_, i) => {
                const tb = Math.floor(i / d.tables.seatsPerTable) + 1; const st = (i % d.tables.seatsPerTable) + 1;
                return <span key={i} className="num rounded-lg border border-line bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-bold text-mut">C{tb}-{st}</span>;
              })}
            </div>
            <p className="mt-3 text-[12px] font-semibold text-dim">Каждое место получает код: Стол 1 — место 1 → С1-1</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Btn variant="ghost" onClick={() => nav(tplMode ? "/app/templates" : "/app/tournaments")}>Отмена</Btn>
        {tplMode ? (
          <Btn size="lg" onClick={doSaveTpl} disabled={loading}><FileStack className="size-4.5" /> {srcTpl ? "Сохранить шаблон" : "Создать шаблон"}</Btn>
        ) : (
          <Btn size="lg" onClick={doSave} disabled={loading}><Save className="size-4.5" /> {editing ? "Сохранить изменения" : "Создать турнир"}</Btn>
        )}
      </div>

      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title="Выбрать шаблон" subtitle="Параметры, структура, бонусы и очки подставятся автоматически" w="max-w-xl">
        <div className="space-y-2">
          {Object.values(templates).map((t) => (
            <button key={t.id} onClick={() => applyTemplate(t.data)}
              className="flex w-full items-center gap-4 rounded-xl border border-line bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-(--acc-line) hover:bg-(--acc-soft)">
              <FileStack className="size-5 shrink-0 text-(--acc)" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[14px] font-bold">{t.name}</span>
                <span className="text-[12px] text-mut">стек {fmtNum(t.data.startingStack)} · {t.data.structure.levels.length} ур. · {t.data.tables.totalTables}×{t.data.tables.seatsPerTable} столов</span>
              </span>
              <ChevronDown className="size-4 -rotate-90 text-dim" />
            </button>
          ))}
          {Object.keys(templates).length === 0 && <Empty title="Шаблонов пока нет" text="Сохраните структуру турнира как шаблон — он появится здесь." />}
        </div>
      </Modal>

      <Modal open={saveTpl} onClose={() => setSaveTpl(false)} title="Сохранить как шаблон" subtitle="Текущая конфигурация турнира станет шаблоном">
        <Field label="Название шаблона"><input className="inp" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder={d.name ? d.name + " (шаблон)" : "Мой MTT"} /></Field>
        <div className="mt-5 flex justify-end gap-2"><Btn variant="ghost" onClick={() => setSaveTpl(false)}>Отмена</Btn><Btn onClick={doSaveTpl} disabled={loading}><Save className="size-4" /> Сохранить</Btn></div>
      </Modal>
    </div>
  );
}

function NumIn({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
  return (
    <label className="block">
      <span className="lbl !mb-1">{label}</span>
      <input type="number" className="inp !min-h-[42px] num" value={v} onChange={(e) => on(Math.max(0, +e.target.value || 0))} />
    </label>
  );
}

function IconBtn({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn("grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.04] text-mut transition hover:text-ink",
        danger && "hover:border-bad/40 hover:text-bad", disabled && "opacity-30 pointer-events-none")}>{children}</button>
  );
}

function NumField({ value, onCommit, disabled, title }: { value: number | null; onCommit: (raw: string) => string | null | Promise<string | null>; disabled?: boolean; title?: string }) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setDraft(value == null ? "" : String(value)); }, [value, focus]);
  const commit = async (raw: string) => {
    const clean = raw.trim();
    const target = clean === "" ? null : Math.max(1, Math.floor(+clean || 0));
    if (target === value) { setDraft(target == null ? "" : String(target)); return; }
    const err = await onCommit(clean);
    if (err) { toast(err, "err"); setDraft(value == null ? "" : String(value)); return; }
    setDraft(target == null ? "" : String(target));
  };
  return (
    <input type="text" inputMode="numeric" placeholder="№" title={title} disabled={disabled}
      className={cn("inp !min-h-[34px] !w-[62px] !rounded-lg !px-2 !py-1 text-center num !text-[13px] transition-colors",
        value == null && "!border-warn/60 !bg-warn/10", focus && "!border-(--acc-line) !bg-transparent")}
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
      onFocus={() => setFocus(true)}
      onBlur={(e) => { setFocus(false); void commit(e.target.value); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  );
}

/* ================================ РЕГИСТРАЦИЯ + СТОЛЫ ================================ */
export function TournamentSeats({ tid, ro }: { tid: string; ro: boolean }) {
  const { tournaments, users } = useFirebaseData();
  const { firebaseUser } = useAuth();
  const nav = useNavigate();
  const t = tournaments[tid];
  const [q, setQ] = useState("");
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [selUid, setSelUid] = useState<string | null>(null);
  const [pickSeat, setPickSeat] = useState<string | null>(null);
  const [pickQ, setPickQ] = useState("");
  const [occSeat, setOccSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  if (!t) return <Empty title="Турнир не найден" />;

  const regs = Object.entries(t.registeredPlayers || {}).sort((a, b) => (a[1].playerNumber ?? 99999) - (b[1].playerNumber ?? 99999));
  const seatedUids = new Set(Object.values(t.tables?.seats || {}));
  const unseated = regs.filter(([u]) => !seatedUids.has(u));
  const unseatedReady = unseated.filter(([, r]) => r.playerNumber != null);
  const noNumCnt = unseated.length - unseatedReady.length;
  const codes = sortedSeatCodes(t);
  const pool = Object.values(users || {}).filter((u) => !u.isArchived && !u.isBlocked && !(t.registeredPlayers || {})[u.uid]);
  const found = pool.filter((u) => (u.nickname + " " + u.firstName + " " + u.lastName).toLowerCase().includes(q.toLowerCase()));
  const regOpen = lateRegOpen(t);
  const seatedCnt = Object.values(t.registeredPlayers || {}).filter((r) => r.seatCode).length;
  const counts = tableCounts(t);
  const minCnt = Math.min(...Object.values(counts || {}));
  
  const batchToast = (r: { seated: number; skippedNoNumber: number }) => {
    if (r.seated === 0 && r.skippedNoNumber > 0) { toast("Рассадить некого: у всех игроков без места нет номера", "err"); return; }
    toast(`Рассажено: ${r.seated} ${plural(r.seated, "игрок", "игрока", "игроков")}${r.skippedNoNumber ? ` · без номера пропущено: ${r.skippedNoNumber}` : ""}`, r.skippedNoNumber ? "info" : "ok");
  };

  const addPlayer = async (u: User) => {
    setLoading(true);
    try {
      const err = await registerSelf(t.id, u.uid);
      if (err) { toast(err, "err"); return; }
      toast(`${u.nickname} зарегистрирован — присвойте номер, чтобы посадить за стол`);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };
  
  const trySeat = async (code: string) => {
    if (!selUid) return;
    setLoading(true);
    try {
      const err = await setSeat(t.id, selUid, code);
      if (err) { toast(err, "err"); return; }
      setSelUid(null);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };
  
  const onLaunch = async () => {
    setLoading(true);
    try {
      const err = await launchTournament(t.id);
      if (err) { toast(err, "err"); return; }
      toast(`«${t.name}» запущен!`);
      nav(`/app/pult/${t.id}`);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  const handleSeatRandom = async () => {
    setLoading(true);
    try {
      const result = await seatRandom(t.id);
      batchToast(result);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  const handleSeatByRating = async () => {
    setLoading(true);
    try {
      const result = await seatByRating(t.id);
      batchToast(result);
    } catch (err: any) {
      toast(err.message || "Ошибка", "err");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => nav("/app/tournaments")} className="mb-4 inline-flex items-center gap-2 text-[13px] font-extrabold text-mut transition hover:text-(--acc)">
        <ArrowLeft className="size-4" /> К списку турниров
      </button>
      <SectionTitle kicker="Регистрация и рассадка" title={`«${t.name}»`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={handleSeatRandom} disabled={ro || loading || unseatedReady.length === 0} title="Рассаживает игроков с номерами, соблюдая баланс столов"><Dices className="size-4" /> Случайно</Btn>
            <Btn variant="ghost" size="sm" onClick={handleSeatByRating} disabled={ro || loading || unseatedReady.length === 0} title="Соседи по рейтингу — за одним столом, с балансом по заполненности"><SortDesc className="size-4" /> По рейтингу</Btn>
            {t.status === "planned" && <Btn size="sm" onClick={onLaunch} disabled={ro || loading || seatedCnt < 2}><Play className="size-4" /> Запустить</Btn>}
            {t.status === "active" && <Btn size="sm" onClick={() => nav(`/app/pult/${t.id}`)}><Zap className="size-4" /> Пульт</Btn>}
          </div>
        } />

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Reveal>
            <div className="panel p-5">
              <p className="lbl flex items-center gap-2"><Users className="size-4 text-(--acc)" /> Добавить участника</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
                <input className="inp pl-9" placeholder="Поиск по базе клуба…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="mt-3 max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                {found.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-2.5 py-2">
                    <Avatar user={u} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{u.nickname}</span>
                      <span className="block truncate text-[11px] text-dim">{u.firstName} {u.lastName}</span>
                    </span>
                    <Btn size="xs" variant="soft" disabled={ro || !regOpen || loading} onClick={() => addPlayer(u)}><Plus className="size-3.5" /> </Btn>
                  </div>
                ))}
                {found.length === 0 && <p className="py-4 text-center text-[12.5px] text-dim">Все подходящие игроки уже зарегистрированы</p>}
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="panel p-5">
              <p className="lbl flex items-center gap-2"><ListOrdered className="size-4 text-(--acc)" /> Зарегистрированы ({regs.length}/{capacity(t)})</p>
              <div className="mt-2 max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
                {regs.map(([u, r]) => (
                  <div key={u} className={cn("flex items-center gap-2.5 rounded-xl border border-transparent bg-white/[0.03] px-2.5 py-2 transition", selUid === u && "border-(--acc-line) bg-(--acc-soft)")}>
                    <Avatar user={users?.[u]} size={34} />
                    <button className="min-w-0 flex-1 text-left" onClick={() => setSelUid(selUid === u ? null : u)}>
                      <span className="block truncate text-[13px] font-bold">{users[u]?.nickname}</span>
                      <span className="text-[11px] font-semibold text-dim">{r.seatCode ? `место ${r.seatCode}` : r.playerNumber == null ? "без места · нет номера" : "без места"} · {fmtDateShort(r.registeredAt)}</span>
                    </button>
                    <span className="relative">
                      <NumField value={r.playerNumber} disabled={ro}
                        title={r.playerNumber == null ? "Номер участника — обязателен для посадки за стол" : "Номер участника"}
                        onCommit={(raw) => setPlayerNumber(t.id, u, raw ? +raw : null)} />
                      {r.playerNumber == null && <AlertTriangle className="absolute -right-1 -top-1 size-3.5 text-warn" />}
                    </span>
                    {!ro && <button onClick={async () => { 
                      setLoading(true);
                      try {
                        await cancelSelf(t.id, u); 
                        toast("Регистрация отменена", "info"); 
                      } catch (err: any) {
                        toast(err.message || "Ошибка", "err");
                      } finally {
                        setLoading(false);
                      }
                    }} className="text-dim transition hover:text-bad"><X className="size-4" /></button>}
                  </div>
                ))}
                {regs.length === 0 && <p className="py-5 text-center text-[12.5px] text-dim">Пока никто не зарегистрировался</p>}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="space-y-4">
            <div className={cn("panel p-4 transition", selUid && "ring-1 ring-(--acc-line)")}>
              <p className="lbl flex items-center justify-between">
                <span className="flex items-center gap-2"><Shuffle className="size-4 text-(--acc)" /> Участники без места ({unseated.length})</span>
                {selUid
                  ? <span className="text-[10.5px] normal-case tracking-normal text-(--acc)">выбран: {users[selUid]?.nickname} — кликните на место</span>
                  : <span className="hidden text-[10.5px] normal-case tracking-normal text-dim sm:inline">перетащите или кликните на свободное место</span>}
              </p>
              <div className="flex min-h-[64px] flex-wrap gap-2 pt-1"
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => { 
                  e.preventDefault(); 
                  const u = e.dataTransfer.getData("uid") || dragUid; 
                  if (u && !ro) {
                    setLoading(true);
                    try {
                      await setSeat(t.id, u, null);
                      setDragUid(null);
                      toast("Игрок возвращён в пул без места", "info");
                    } catch (err: any) {
                      toast(err.message || "Ошибка", "err");
                    } finally {
                      setLoading(false);
                    }
                  }
                }}>
                {unseated.map(([u, r]) => (
                  <PlayerChip key={u} uid={u} nick={users[u]?.nickname ?? "?"} num={r.playerNumber} seat={null} user={users[u]}
                    warn={r.playerNumber == null}
                    sel={selUid === u} onSelect={() => setSelUid(selUid === u ? null : u)} onDrag={setDragUid} ro={ro} />
                ))}
                {unseated.length === 0 && <span className="py-4 text-[12.5px] font-semibold text-dim">Все участники рассажены — можно запускать</span>}
              </div>
              {noNumCnt > 0 && (
                <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-2 text-[11.5px] font-bold text-warn">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {noNumCnt} {plural(noNumCnt, "игрок", "игрока", "игроков")} без номера — присвойте номера, иначе посадить за стол нельзя
                </p>
              )}
            </div>

            <div className="panel-deep flex items-start gap-3 p-4">
              <Scale className="mt-0.5 size-4.5 shrink-0 text-(--acc)" />
              <div className="space-y-1 text-[11.5px] font-semibold leading-relaxed text-mut">
                <p><b className="text-ink">Правила рассадки:</b> без номера участника посадить нельзя · номера не повторяются · столы заполняются равномерно — разница не больше 1 игрока.</p>
                <p className="text-dim">Свободные столы подсвечены зелёным — сажайте сначала в них.</p>
              </div>
            </div>

            {Array.from({ length: t.tables.totalTables }, (_, ti) => {
              const tb = ti + 1;
              const tCodes = codes.filter((c) => c.startsWith(`C${tb}-`));
              const occCnt = tCodes.filter((c) => t.tables.seats[c]).length;
              const isMin = counts[`C${tb}`] === minCnt;
              return (
                <div key={tb} className={cn("panel overflow-hidden transition-shadow duration-300", isMin && "ring-1 ring-(--acc-line)/50")}>
                  <div className="felt stitched flex items-center justify-between px-4 py-3 sm:px-5">
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-full bg-black/30 ring-1 ring-white/20">
                        <LayoutGrid className="size-4 text-[#ffd76a]" />
                      </span>
                      <span className="font-display text-[14px] font-extrabold tracking-wide text-white">Стол {tb}</span>
                      {isMin && (
                        <span className="rounded-full bg-[#ffd76a]/20 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-[#ffd76a] ring-1 ring-[#ffd76a]/40">
                          свободнее всех
                        </span>
                      )}
                    </span>
                    <span className="num rounded-full bg-black/35 px-3 py-1 text-[12px] font-extrabold text-white/85 ring-1 ring-white/15">
                      {occCnt} / {t.tables.seatsPerTable} занято
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4">
                    <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">
                      {tCodes.map((code) => {
                        const occ = t.tables.seats[code];
                        const occReg = occ ? t.registeredPlayers[occ] : null;
                        const offBalance = !occ && !isMin;
                        return (
                          <div key={code}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={async (e) => { 
                              e.preventDefault(); 
                              const u = e.dataTransfer.getData("uid") || dragUid; 
                              if (u && !ro) {
                                setLoading(true);
                                try {
                                  const err = await setSeat(t.id, u, code);
                                  if (err) toast(err, "err");
                                  setDragUid(null);
                                } catch (err: any) {
                                  toast(err.message || "Ошибка", "err");
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            onClick={() => {
                              if (ro || loading) return;
                              if (occ) { setOccSeat(code); setSelUid(null); }
                              else if (selUid) trySeat(code);
                              else {
                                const be = balanceErrorForSeat(t, code);
                                if (be) { toast(be, "err"); return; }
                                setPickQ(""); setPickSeat(code);
                              }
                            }}
                            className={cn("group/seat relative min-h-[86px] cursor-pointer rounded-xl border transition-all duration-200",
                              occ ? "border-line bg-white/[0.05] hover:border-warn/50 hover:bg-warn/10" : "border-dashed border-line bg-white/[0.02] hover:border-(--acc-line) hover:bg-(--acc-soft)",
                              selUid && !occ && (isMin ? "border-(--acc-line) bg-(--acc-soft) pulse-live" : "opacity-40 saturate-50"),
                              offBalance && !selUid && "opacity-55")}>
                            <span className={cn("num absolute left-2 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold", 
                              occ ? "bg-(--acc-soft) text-(--acc)" : "bg-white/[0.05] text-dim")}>{code}</span>
                            {occ ? (
                              <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 pt-6">
                                <Avatar user={users?.[occ]} size={34} />
                                <span className="max-w-full truncate text-[11.5px] font-bold leading-none">{users[occ]?.nickname ?? "?"}</span>
                                <span className="num text-[10px] font-extrabold text-dim">
                                  {occReg?.playerNumber != null ? `#${occReg.playerNumber}` : "без номера"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-1 p-2 pt-4 text-dim transition group-hover/seat:text-(--acc)">
                                <Plus className="size-4.5 opacity-40 transition group-hover/seat:opacity-100" />
                                <span className="text-[10.5px] font-extrabold uppercase tracking-wide">{selUid ? "посадить сюда" : "свободно"}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>

      <Modal open={!!pickSeat} onClose={() => setPickSeat(null)} title={`Место ${pickSeat ?? ""}`} subtitle="Выберите участника — он будет посажен вручную" w="max-w-md">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input className="inp pl-9" autoFocus placeholder="Поиск среди зарегистрированных без места…" value={pickQ} onChange={(e) => setPickQ(e.target.value)} />
        </div>
        <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
          {unseatedReady
            .filter(([u]) => ((users[u]?.nickname ?? "") + " " + (users[u]?.firstName ?? "")).toLowerCase().includes(pickQ.toLowerCase()))
            .map(([u, r]) => (
              <button key={u} onClick={async () => {
                setLoading(true);
                try {
                  const err = await setSeat(t.id, u, pickSeat);
                  if (err) { toast(err, "err"); return; }
                  toast(`${users[u]?.nickname} → место ${pickSeat}`);
                  setPickSeat(null);
                } catch (err: any) {
                  toast(err.message || "Ошибка", "err");
                } finally {
                  setLoading(false);
                }
              }}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-(--acc-line) hover:bg-(--acc-soft)">
                <Avatar user={users?.[u]} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold">{users[u]?.nickname}</span>
                  <span className="text-[11.5px] font-semibold text-dim">№ {r.playerNumber} · {users[u]?.firstName} {users[u]?.lastName}</span>
                </span>
                <span className="num rounded-lg bg-(--acc-soft) px-2.5 py-1 text-[12px] font-extrabold text-(--acc)">{pickSeat}</span>
              </button>
            ))}
          {unseatedReady.filter(([u]) => ((users[u]?.nickname ?? "") + " " + (users[u]?.firstName ?? "")).toLowerCase().includes(pickQ.toLowerCase())).length === 0 && (
            <p className="py-6 text-center text-[13px] font-semibold text-dim">
              {noNumCnt > 0 && unseated.length > 0 ? "Все игроки без места пока без номера — присвойте номера в списке слева" : "Нет участников без места — зарегистрируйте игроков слева"}
            </p>
          )}
        </div>
        {noNumCnt > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[11.5px] font-bold text-warn">
            <AlertTriangle className="size-3.5 shrink-0" /> Скрыто игроков без номера: {noNumCnt} — им нельзя присвоить место
          </p>
        )}
      </Modal>

      <Modal open={!!occSeat} onClose={() => setOccSeat(null)} title={`Место ${occSeat ?? ""}`} subtitle="Занято участником" w="max-w-sm">
        {(() => {
          const u = occSeat ? t.tables.seats[occSeat] : null;
          const r = u ? t.registeredPlayers[u] : null;
          if (!u || !r) return null;
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-white/[0.03] p-3.5">
                <Avatar user={users?.[u]} size={46} ring />
                <div>
                  <p className="font-display text-[15px] font-extrabold">{users[u]?.nickname}</p>
                  <p className="text-[12.5px] font-semibold text-mut">{users[u]?.firstName} {users[u]?.lastName} · участник № {r.playerNumber ?? "—"}</p>
                  <p className="num mt-0.5 text-[12px] font-extrabold text-(--acc)">{r.playerNumber ?? "—"} — {occSeat}</p>
                </div>
              </div>
              {!ro && (
                <Btn variant="soft" className="w-full" onClick={async () => {
                  setLoading(true);
                  try {
                    await setSeat(t.id, u, null);
                    toast(`${users[u]?.nickname} возвращён в список без места`, "info");
                    setOccSeat(null);
                  } catch (err: any) {
                    toast(err.message || "Ошибка", "err");
                  } finally {
                    setLoading(false);
                  }
                }}><Users className="size-4" /> Вернуть в «Участники без места»</Btn>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function PlayerChip({ uid, nick, num, seat, user, sel, onSelect, onDrag, ro, compact, warn }: {
  uid: string; nick: string; num: number | null; seat: string | null; user: User | undefined;
  sel: boolean; onSelect: () => void; onDrag: (u: string | null) => void; ro: boolean; compact?: boolean; warn?: boolean;
}) {
  const hov = useHoverDelay(250);
  return (
    <span
      draggable={!ro}
      onDragStart={(e) => { e.dataTransfer.setData("uid", uid); e.dataTransfer.effectAllowed = "move"; onDrag(uid); }}
      onDragEnd={() => onDrag(null)}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      {...hov.bind}
      className={cn("relative inline-flex cursor-grab select-none items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all duration-200 active:cursor-grabbing",
        warn && !sel
          ? "border-dashed border-warn/55 bg-warn/10 hover:bg-warn/15"
          : sel ? "border-(--acc-line) bg-(--acc-soft) shadow-[0_6px_20px_-8px_var(--acc)]" : "border-line bg-white/[0.05] hover:border-(--acc-line)/70 hover:bg-white/[0.09]",
        compact && "w-full justify-center border-0 bg-transparent px-1 py-0.5 hover:bg-white/[0.06]")}>
      <Avatar user={user} size={compact ? 30 : 28} />
      <span className={cn("max-w-[110px] truncate font-bold", compact ? "text-[11.5px]" : "text-[12.5px]")}>{nick}</span>
      {num != null && <span className="num rounded-md bg-(--acc-soft) px-1.5 py-0.5 text-[10.5px] font-extrabold text-(--acc)">#{num}</span>}
      {warn && !compact && <AlertTriangle className="size-3.5 shrink-0 text-warn" />}
      {hov.on && (
        <span className="panel-deep absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-extrabold text-ink anim-pop">
          {warn ? "нет номера — посадка запрещена" : `${num ?? "—"} · ${seat ?? "без места"}`}
        </span>
      )}
    </span>
  );
}