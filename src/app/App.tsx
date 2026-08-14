import { useState, useEffect, useRef, useCallback, type JSX } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Settings, History, LayoutDashboard, Moon, Sun, Play, Square, TrendingUp, Target, CheckCircle, RefreshCw, ExternalLink, BookOpen, Briefcase, Plus, Inbox, BrainCircuit, Hand, Bell, Sparkles, Cpu, Globe, ChevronRight, Key, User } from "lucide-react";
import { toast, Toaster } from "sonner";
import type { AppRecord, AppStatus, Config, ExecMode, PendingVacancy, Position, Tab, Theme } from "./domain/types";
import { AREA_OPTIONS, createDemoQueue, MOCK_APPLICATIONS, PROVIDERS } from "./data/catalog";
import { validateImportedConfig } from "./lib/config";
import { AppCard, Field, PulseDot } from "./shared/components";
import { AddPositionModal, ExecutionModeModal, ManualReviewPanel, OnboardingScreen } from "./features/positions/components";
import { SearchPanel } from "./features/search/SearchPanel";
import { GuideTab } from "./features/guide/GuideTab";
import { ConfigPanel } from "./features/settings/ConfigPanel";

// ─── Main App ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: Config = {
  provider: "gemini", apiKey: "", profile: "",
  jobTitle: "", areaId: "1", salaryFrom: "", salaryTo: "", dailyLimit: 15,
};

const CONFIG_STORAGE_KEY = "huntpulse_config";
const API_KEY_SESSION_KEY = "huntpulse_api_key";
const POSITIONS_SESSION_KEY = "huntpulse_positions";

function loadConfig(): Config {
  try {
    const result = validateImportedConfig(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "{}"));
    const stored = result.valid ? result.data : DEFAULT_CONFIG;
    return { ...stored, apiKey: sessionStorage.getItem(API_KEY_SESSION_KEY) || "" };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function persistConfig(config: Config) {
  const { apiKey, ...nonSensitiveConfig } = config;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nonSensitiveConfig));
  if (apiKey) sessionStorage.setItem(API_KEY_SESSION_KEY, apiKey);
  else sessionStorage.removeItem(API_KEY_SESSION_KEY);
}

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [running, setRunning] = useState(false);
  const [applications, setApplications] = useState<AppRecord[]>(MOCK_APPLICATIONS);
  const [filterStatus, setFilterStatus] = useState<AppStatus | "Все">("Все");
  const [runProgress, setRunProgress] = useState(0);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [execMode, setExecMode] = useState<ExecMode | null>(null);
  const [positions, setPositions] = useState<Position[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(POSITIONS_SESSION_KEY) || "[]"); } catch { return []; }
  });
  const [manualQueue, setManualQueue] = useState<PendingVacancy[]>([]);
  const [foundCount, setFoundCount] = useState(47);
  const [invites, setInvites] = useState(3);
  const [guideSection, setGuideSection] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [config, setConfig] = useState<Config>(loadConfig);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  useEffect(() => () => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
  }, []);

  const saveConfig = useCallback((c: Config) => { setConfig(c); persistConfig(c); }, []);
  const updateConfig = (partial: Partial<Config>) => saveConfig({ ...config, ...partial });

  const todayApps = applications.filter(a => new Date(a.date).toDateString() === new Date().toDateString());
  const sentToday = todayApps.filter(a => a.status === "Отправлено").length;
  const totalSent = applications.filter(a => a.status === "Отправлено").length;
  const errCount = applications.filter(a => a.status === "Ошибка").length;
  const filteredApps = filterStatus === "Все" ? applications : applications.filter(a => a.status === filterStatus);
  const isOnboarded = positions.length > 0;
  const prov = PROVIDERS[config.provider];

  const handleAddPosition = (p: Position) => {
    const next = [...positions, p];
    setPositions(next);
    sessionStorage.setItem(POSITIONS_SESSION_KEY, JSON.stringify(next));
  };

  const handleStartClick = () => setShowModeSelect(true);

  const handleModeSelect = (mode: ExecMode) => {
    setExecMode(mode);
    setShowModeSelect(false);
    setRunning(true);
    setRunProgress(0);
    if (mode === "manual") {
      setManualQueue(createDemoQueue(positions[0]?.jobTitle || config.jobTitle));
    } else {
      let p = 0;
      const sim = () => {
        p += Math.random() * 18 + 5;
        setRunProgress(Math.min(p, 95));
        if (p < 95) intervalRef.current = setTimeout(sim, Math.random() * 7000 + 5000);
      };
      intervalRef.current = setTimeout(sim, 2000);
    }
  };

  const handleStop = () => {
    setRunning(false); setRunProgress(0); setExecMode(null); setManualQueue([]);
    if (intervalRef.current) clearTimeout(intervalRef.current);
  };

  const handleManualApply = () => {
    const v = manualQueue[0];
    if (!v) return;
    const newRecord: AppRecord = {
      id: Date.now().toString(), vacancyId: v.id, title: v.title, company: v.company,
      salary: v.salary, date: new Date().toISOString(), status: "Отправлено", letter: v.letter, url: v.url,
    };
    setApplications(prev => [newRecord, ...prev]);
    const next = manualQueue.slice(1);
    setManualQueue(next);
    toast.success("Отклик отправлен", { description: `${v.company} · ${v.title}` });
    if (next.length === 0) { setRunning(false); setExecMode(null); toast.success("Очередь обработана", { description: "Все вакансии просмотрены" }); }
  };

  const handleManualSkip = () => {
    const v = manualQueue[0];
    if (!v) return;
    const newRecord: AppRecord = {
      id: Date.now().toString(), vacancyId: v.id, title: v.title, company: v.company,
      salary: v.salary, date: new Date().toISOString(), status: "Пропущено", letter: "Вакансия пропущена пользователем.", url: v.url,
    };
    setApplications(prev => [newRecord, ...prev]);
    const next = manualQueue.slice(1);
    setManualQueue(next);
    if (next.length === 0) { setRunning(false); setExecMode(null); }
  };

  const openHelp = (sectionId: string) => { setGuideSection(sectionId); setTab("guide"); };

  const navItems: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: "dashboard", label: "Дашборд", icon: <LayoutDashboard size={16} /> },
    { id: "config", label: "Поиск", icon: <Target size={16} /> },
    { id: "history", label: "История", icon: <History size={16} /> },
    { id: "guide", label: "Руководство", icon: <BookOpen size={16} /> },
    { id: "settings", label: "Настройки", icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <Toaster position="top-right" theme={theme} richColors toastOptions={{ style: { fontFamily: "JetBrains Mono, monospace", fontSize: "13px" } }} />
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(var(--neon-violet) 1px, transparent 1px), linear-gradient(90deg, var(--neon-violet) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)" }}><Zap size={14} className="text-white" /></div>
              {running && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
            </div>
            <span className="font-bold tracking-tight" style={{ fontFamily: "Oxanium, monospace", fontSize: "1.1rem" }}>
              HuntPulse<span className="text-[var(--neon-violet)]">_</span>AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${tab === item.id ? "bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border border-[var(--neon-violet)]/30" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                {item.icon}{item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isOnboarded && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted text-xs font-mono text-muted-foreground">
                <PulseDot active={running} />
                <span className="hidden sm:inline">{running ? (execMode === "manual" ? "Ручной" : "Авто") : "Стоп"}</span>
              </div>
            )}
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-[var(--neon-violet)]/40 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex border-t border-border overflow-x-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex-1 min-w-fit flex flex-col items-center gap-0.5 py-2 px-2 text-[10px] font-mono transition-colors whitespace-nowrap ${tab === item.id ? "text-[var(--neon-violet)]" : "text-muted-foreground"}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {/* Onboarding empty state */}
              {!isOnboarded ? (
                <OnboardingScreen onAddPosition={() => setShowAddPosition(true)} />
              ) : (
                <>
                  {/* Run control */}
                  <div className="mb-5 rounded-xl border border-border bg-card p-5 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.3) 0%, transparent 60%)" }} />
                    <div className="relative flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "Oxanium, monospace" }}>
                          {positions[0]?.jobTitle || "Автоотклики"} <span className="text-[var(--neon-violet)]">·</span> {positions[0]?.areaName || ""}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm text-muted-foreground font-mono">
                            {running ? execMode === "manual" ? `Ручной контроль · ${manualQueue.length} в очереди` : `Автопилот · ${runProgress.toFixed(0)}%` : `Готов · ${prov.label}`}
                          </p>
                          {execMode && (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border ${execMode === "auto" ? "text-violet-400 bg-violet-400/10 border-violet-400/30" : "text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/30"}`}>
                              {execMode === "auto" ? <BrainCircuit size={11} /> : <Hand size={11} />}
                              {execMode === "auto" ? "Автопилот" : "Ручной контроль"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {!running && (
                          <button onClick={() => setShowAddPosition(true)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:border-[var(--neon-violet)]/30 transition-all min-h-[44px]">
                            <Plus size={14} />Добавить позицию
                          </button>
                        )}
                        <button onClick={running ? handleStop : handleStartClick}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-[44px] ${running ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30" : "text-white border border-[var(--neon-violet)]/50"}`}
                          style={!running ? { background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" } : {}}>
                          {running ? <><Square size={14} />Остановить</> : <><Play size={14} />Запустить</>}
                        </button>
                      </div>
                    </div>
                    {running && execMode === "auto" && (
                      <div className="relative mt-4 h-1 rounded-full bg-muted overflow-hidden">
                        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: "linear-gradient(90deg, #8B5CF6, #06b6d4)", width: `${runProgress}%` }} transition={{ duration: 0.5 }} />
                      </div>
                    )}
                  </div>

                  {/* Positions list */}
                  {positions.length > 0 && (
                    <div className="mb-5 flex gap-2 flex-wrap">
                      {positions.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-mono">
                          <Briefcase size={11} className="text-[var(--neon-violet)] opacity-70" />
                          <span className="text-foreground/80">{p.jobTitle}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{p.areaName}</span>
                          {p.salaryFrom && <><span className="text-muted-foreground">·</span><span className="text-emerald-400">от {Number(p.salaryFrom).toLocaleString("ru")} ₽</span></>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual review panel */}
                  <AnimatePresence>
                    {running && execMode === "manual" && manualQueue.length > 0 && (
                      <ManualReviewPanel
                        vacancy={manualQueue[0]} queue={manualQueue.length}
                        onApply={handleManualApply} onRegenerate={() => {}} onSkip={handleManualSkip} onStop={handleStop}
                      />
                    )}
                  </AnimatePresence>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 group hover:border-[var(--neon-violet)]/40 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-widest">Найдено вакансий</span>
                        <Inbox size={16} className="text-[var(--neon-violet)] opacity-60" />
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "Oxanium, monospace" }}>{foundCount}</div>
                      <div className="text-muted-foreground text-xs font-mono">новых сегодня</div>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 group hover:border-[var(--neon-cyan)]/40 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-widest">Откликов сегодня</span>
                        <TrendingUp size={16} className="text-[var(--neon-cyan)] opacity-60" />
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "Oxanium, monospace" }}>{sentToday}</div>
                      <div className="text-muted-foreground text-xs font-mono">из {config.dailyLimit} лимита</div>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 group hover:border-emerald-400/40 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-widest">Приглашения</span>
                        <Bell size={16} className="text-emerald-400 opacity-60" />
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "Oxanium, monospace" }}>{invites}</div>
                      <div className="text-muted-foreground text-xs font-mono">на интервью</div>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 group hover:border-red-400/40 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-widest">Всего отправлено</span>
                        <CheckCircle size={16} className="text-emerald-400 opacity-60" />
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "Oxanium, monospace" }}>{totalSent}</div>
                      <div className="text-muted-foreground text-xs font-mono">за всё время</div>
                    </div>
                  </div>

                  {/* Recent */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-sm" style={{ fontFamily: "Oxanium, monospace" }}>Последние отклики</h2>
                      <button onClick={() => setTab("history")} className="text-xs font-mono text-muted-foreground hover:text-[var(--neon-violet)] transition-colors flex items-center gap-1 min-h-[32px]">
                        Все <ExternalLink size={11} />
                      </button>
                    </div>
                    <div className="space-y-2">{applications.slice(0, 4).map(a => <AppCard key={a.id} record={a} />)}</div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* CONFIG / SEARCH */}
          {tab === "config" && (
            <motion.div key="config" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
                {/* Search panel — main */}
                <SearchPanel config={config} />

                {/* Config sidebar */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Settings size={14} className="text-muted-foreground" />
                      <h2 className="text-sm font-bold font-mono">Параметры автопоиска</h2>
                    </div>
                    <div className="space-y-4">
                      <Field label="Профессия или должность" value={config.jobTitle} onChange={v => updateConfig({ jobTitle: v })} placeholder="QA-инженер, дизайнер, художник…" icon={<Target size={12} />} />
                      <Field label="Зарплата от (₽)" value={config.salaryFrom} onChange={v => updateConfig({ salaryFrom: v })} placeholder="200000" type="number" />
                      <Field label="Зарплата до (₽)" value={config.salaryTo} onChange={v => updateConfig({ salaryTo: v })} placeholder="400000" type="number" />
                      <div className="space-y-1.5">
                        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Регион</label>
                        <select value={config.areaId} onChange={e => updateConfig({ areaId: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all">
                          {AREA_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          Суточный лимит: <span className="text-[var(--neon-violet)]">{config.dailyLimit}</span>
                        </label>
                        <input type="range" min={5} max={50} step={5} value={config.dailyLimit} onChange={e => updateConfig({ dailyLimit: Number(e.target.value) })} className="w-full accent-violet-500" />
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground"><span>5</span><span>25</span><span>50</span></div>
                      </div>
                      <button onClick={() => { toast.success("Параметры сохранены"); setTab("dashboard"); }}
                        className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 min-h-[44px]"
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)" }}>
                        Сохранить и перейти
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* HISTORY */}
          {tab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: "Oxanium, monospace" }}>История откликов <span className="text-xs text-amber-400">(демо)</span></h2>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{applications.length} записей</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground transition-colors min-h-[40px]">
                  <RefreshCw size={12} />Обновить
                </button>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {(["Все", "Отправлено", "В процессе", "Ошибка", "Пропущено"] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s as AppStatus | "Все")}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all min-h-[34px] ${filterStatus === s ? "bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border-[var(--neon-violet)]/40" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredApps.map(a => (
                    <motion.div key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <AppCard record={a} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredApps.length === 0 && <div className="py-16 text-center text-muted-foreground text-sm font-mono">Нет записей со статусом «{filterStatus}»</div>}
              </div>
            </motion.div>
          )}

          {/* GUIDE */}
          {tab === "guide" && <GuideTab key="guide" onGoToSettings={() => setTab("settings")} initialSection={guideSection} />}

          {/* SETTINGS */}
          {tab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="max-w-2xl space-y-4">
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: "Oxanium, monospace" }}>Настройки</h2>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">Обычные настройки хранятся локально; ключи — только до закрытия вкладки</p>
                </div>

                {/* AI Provider */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">AI Provider</div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${prov.badgeColor}`}>{prov.badge}</span>
                  </div>
                  <div className="space-y-2">
                    {(Object.entries(PROVIDERS) as [Provider, typeof PROVIDERS[Provider]][]).map(([id, p]) => (
                      <button key={id} onClick={() => updateConfig({ provider: id, apiKey: "" })}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all min-h-[52px] ${config.provider === id ? "border-[var(--neon-violet)]/60 bg-[var(--neon-violet)]/8" : "border-border hover:border-[var(--neon-violet)]/30 bg-input-background"}`}>
                        <span className={config.provider === id ? "text-[var(--neon-violet)]" : "text-muted-foreground"}>{p.icon}</span>
                        <div className="flex-1"><div className="text-sm font-mono font-medium text-foreground">{p.label}</div><div className="text-[11px] font-mono text-muted-foreground">{p.model}</div></div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${p.badgeColor}`}>{p.badge}</span>
                        {config.provider === id && <ChevronRight size={14} className="text-[var(--neon-violet)] shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={config.provider} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                      {config.provider === "gemini" && <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-emerald-400/8 border border-emerald-400/20 text-xs font-mono text-emerald-400"><Sparkles size={13} className="shrink-0 mt-0.5" /><div>Бесплатно · 1 500 req/day · без карты. Ключ: <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com</a> → «Create API Key»</div></div>}
                      {config.provider === "groq" && <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-[var(--neon-cyan)]/8 border border-[var(--neon-cyan)]/20 text-xs font-mono text-[var(--neon-cyan)]"><Cpu size={13} className="shrink-0 mt-0.5" /><div>Сверхбыстрая генерация, Llama 3, бесплатно. Ключ: <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com</a> → API Keys</div></div>}
                      {config.provider === "openrouter" && <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-[var(--neon-violet)]/8 border border-[var(--neon-violet)]/20 text-xs font-mono text-[var(--neon-violet)]"><Globe size={13} className="shrink-0 mt-0.5" /><div>Выбирайте модели с суффиксом :free. Ключ: <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai</a> → Keys</div></div>}
                    </motion.div>
                  </AnimatePresence>
                  <Field label={`${prov.label} — API Key *`} value={config.apiKey} onChange={v => updateConfig({ apiKey: v })}
                    placeholder={prov.placeholder} secret icon={<Key size={12} />} helpId={config.provider} onHelp={openHelp} />
                </div>

                {/* Profile */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Профиль кандидата</div>
                  <Field label="Описание профиля *" value={config.profile} onChange={v => updateConfig({ profile: v })}
                    placeholder="Расскажите о своём опыте, стеке, достижениях и пожеланиях. ИИ использует этот текст для генерации писем."
                    textarea icon={<User size={12} />} helpId="profile" onHelp={openHelp} />
                </div>

                <button onClick={() => setTab("dashboard")}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 min-h-[48px]"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
                  Сохранить и перейти на дашборд
                </button>

                <ConfigPanel config={config} onImport={saveConfig} />

                <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-2">Безопасность</div>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">Не передавайте экспортированный конфиг третьим лицам. API-ключ намеренно не включается в файл и не сохраняется между сессиями браузера.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>HuntPulse AI v0.1</span>
          <span className="flex items-center gap-1">{prov.icon}{prov.model} · hh.ru API</span>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showAddPosition && <AddPositionModal key="add-pos" onClose={() => setShowAddPosition(false)} onSave={handleAddPosition} onOpenGuide={(s) => { setShowAddPosition(false); openHelp(s); }} />}
        {showModeSelect && <ExecutionModeModal key="mode-sel" onClose={() => setShowModeSelect(false)} onSelect={handleModeSelect} />}
      </AnimatePresence>
    </div>
  );
}
