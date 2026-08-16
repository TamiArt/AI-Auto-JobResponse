import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Settings, History, LayoutDashboard, Moon, Sun, Eye, EyeOff,
  Play, Square, Copy, Check, ChevronDown, ChevronUp, Loader2,
  TrendingUp, Target, AlertCircle, CheckCircle, XCircle,
  SkipForward, RefreshCw, ExternalLink, Bot, User, Key, FileText,
  BookOpen, ArrowRight, Shield, Send, X, Pencil, Building2,
  Briefcase, MapPin, Clock, Download, Upload, HelpCircle, Sparkles,
  Cpu, Globe, ChevronRight, Plus, Inbox, BrainCircuit, Hand,
  RotateCcw, ThumbsUp, SkipForward as Skip, Rocket, Layers,
  Bell, ChevronLeft
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { PROFILE_PRESETS } from "./data/profile-presets";
import { AREA_OPTIONS, DEFAULT_CONFIG, JOB_SOURCES, validateImportedConfig, type AppRecord, type AppStatus, type Config, type JobSource, type Position, type Provider, type Tab, type Theme } from "./model";
import { PROVIDERS } from "./providers";
import { SearchPanel } from "./features/job-search/SearchPanel";
import { GuideTab } from "./features/guide/GuideTab";
import { getSourceErrorLabel, searchJobs, type SearchResult, type SearchableJobSource } from "./services/job-search";

// ─── Shared UI ────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, { color: string; icon: JSX.Element }> = {
    "Отправлено": { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: <CheckCircle size={11} /> },
    "В процессе": { color: "text-violet-400 bg-violet-400/10 border-violet-400/30", icon: <Loader2 size={11} className="animate-spin" /> },
    "Ошибка": { color: "text-red-400 bg-red-400/10 border-red-400/30", icon: <XCircle size={11} /> },
    "Пропущено": { color: "text-amber-400 bg-amber-400/10 border-amber-400/30", icon: <SkipForward size={11} /> },
  };
  const { color, icon } = map[status];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${color}`}>{icon}{status}</span>;
}

function PulseDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-violet-400" : "bg-muted-foreground/40"}`} />
    </span>
  );
}

function AppIcon({ className = "h-7 w-7" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`${className} flex items-center justify-center rounded-lg`}
        style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)" }}
        aria-hidden="true"
      >
        <Zap size={14} className="text-white" />
      </span>
    );
  }

  return (
    <img
      src="/icon.png"
      alt=""
      className={`${className} rounded-lg object-cover`}
      onError={() => setFailed(true)}
      aria-hidden="true"
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, textarea, icon, secret, helpId, onHelp, as: As }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean; icon?: JSX.Element; secret?: boolean;
  helpId?: string; onHelp?: (id: string) => void; as?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {icon && <span className="opacity-60">{icon}</span>}{label}
        </label>
        {helpId && onHelp && (
          <button onClick={() => onHelp(helpId)} className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-[var(--neon-violet)] transition-colors min-h-[28px] px-1.5 rounded-lg hover:bg-[var(--neon-violet)]/8">
            <HelpCircle size={12} /><span className="hidden sm:inline">Как получить?</span>
          </button>
        )}
      </div>
      <div className="relative">
        {textarea ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] focus:border-[var(--neon-violet)]/60 resize-none transition-all" />
        ) : (
          <input type={secret ? (show ? "text" : "password") : type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] focus:border-[var(--neon-violet)]/60 transition-all pr-10" />
        )}
        {secret && !textarea && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SourceTag({ source }: { source?: JobSource }) {
  if (!source) return null;
  const s = JOB_SOURCES[source];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${s.color} ${s.bg} ${s.border}`}>
      {s.label}
    </span>
  );
}

function AppCard({ record }: { record: AppRecord }) {
  const [open, setOpen] = useState(false);
  const date = new Date(record.date);
  const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
  return (
    <motion.div layout className="rounded-xl border border-border bg-card overflow-hidden hover:border-[var(--neon-violet)]/30 transition-all duration-200">
      <div className="flex items-center gap-3 p-4 cursor-pointer min-h-[60px]" onClick={() => setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-foreground text-sm" style={{ fontFamily: "Oxanium, monospace" }}>{record.title}</span>
            <StatusBadge status={record.status} />
            <SourceTag source={record.source} />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono flex-wrap">
            <span>{record.company}</span><span className="opacity-40">·</span>
            <span>{record.salary}</span><span className="opacity-40">·</span><span>{dateStr} {timeStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href={record.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="p-2 rounded-lg text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            <ExternalLink size={13} />
          </a>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Bot size={10} /> ИИ-письмо</span>
                <CopyButton text={record.letter} />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{record.letter}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${i === current ? "w-5 h-1.5 bg-[var(--neon-violet)]" : i < current ? "w-1.5 h-1.5 bg-[var(--neon-violet)]/40" : "w-1.5 h-1.5 bg-border"}`} />
      ))}
    </div>
  );
}

// ─── Add Position Modal ───────────────────────────────────────────────────────
function AddPositionModal({ onClose, onSave, onOpenGuide }: { onClose: () => void; onSave: (p: Position) => void; onOpenGuide: (s: string) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ hhToken: "", resumeId: "", jobTitle: "", salaryFrom: "", areaId: "1" });
  const [loading, setLoading] = useState(false);

  const areaName = AREA_OPTIONS.find(a => a.id === form.areaId)?.name || "Москва";
  const canStep0 = form.hhToken.trim().length > 10 && form.resumeId.trim().length > 5;
  const canStep1 = form.jobTitle.trim().length > 1;

  const handleFetchResume = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep(1);
    toast.success("Резюме подключено", { description: "Данные кандидата загружены с HH.ru" });
  };

  const handleSave = () => {
    const pos: Position = {
      id: `pos_${Date.now()}`, ...form, areaName,
      createdAt: new Date().toISOString(),
    };
    onSave(pos);
    toast.success("Позиция добавлена", { description: `${form.jobTitle} · ${areaName}` });
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--neon-violet)]/30 bg-card flex flex-col"
        style={{ boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 25px 50px rgba(0,0,0,0.5)" }}
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <ChevronLeft size={16} />
              </button>
            )}
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: "Oxanium, monospace" }}>
                {step === 0 ? "Подключение HH профиля" : step === 1 ? "Параметры поиска" : "Готово"}
              </h3>
              <div className="mt-1.5"><StepDots current={step} total={2} /></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex-1">
          <AnimatePresence mode="wait">

            {/* Step 0: HH Connection */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-[var(--neon-violet)]/8 border border-[var(--neon-violet)]/20 text-xs font-mono text-[var(--neon-violet)]">
                  <Shield size={13} className="shrink-0 mt-0.5" />
                  Токен и ID хранятся только в вашем браузере. Никуда не передаются.
                </div>

                {/* HH Token field with guide link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Key size={12} className="opacity-60" />HH Access Token *
                    </label>
                    <button onClick={() => { onClose(); onOpenGuide("hhtoken"); }}
                      className="flex items-center gap-1 text-[11px] font-mono text-[var(--neon-violet)] hover:underline transition-colors min-h-[28px] px-1">
                      <HelpCircle size={11} />Как получить?
                    </button>
                  </div>
                  <div className="relative">
                    <input type="password" value={form.hhToken} onChange={e => setForm(f => ({ ...f, hhToken: e.target.value }))} placeholder="Bearer eyJhbGci..."
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all" />
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground px-1">
                    Получается через OAuth на <button onClick={() => { onClose(); onOpenGuide("hhtoken"); }} className="text-[var(--neon-violet)] hover:underline">dev.hh.ru/admin</button>. Действует 14 дней.
                  </p>
                </div>

                {/* Resume ID field with guide link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText size={12} className="opacity-60" />Resume ID *
                    </label>
                    <button onClick={() => { onClose(); onOpenGuide("resumeid"); }}
                      className="flex items-center gap-1 text-[11px] font-mono text-[var(--neon-violet)] hover:underline transition-colors min-h-[28px] px-1">
                      <HelpCircle size={11} />Как найти?
                    </button>
                  </div>
                  <input type="text" value={form.resumeId} onChange={e => setForm(f => ({ ...f, resumeId: e.target.value }))} placeholder="abc123def456"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all" />
                  <div className="flex items-start gap-2 px-1 text-[11px] font-mono text-muted-foreground">
                    <HelpCircle size={11} className="shrink-0 mt-0.5 text-[var(--neon-violet)]" />
                    <span>Часть URL вашего резюме: hh.ru/resume/<button onClick={() => { onClose(); onOpenGuide("resumeid"); }} className="text-[var(--neon-violet)] hover:underline">ВАШ_ID</button></span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Search Params */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                <Field label="Желаемая должность *" value={form.jobTitle} onChange={v => setForm(f => ({ ...f, jobTitle: v }))}
                  placeholder="Frontend Developer" icon={<Briefcase size={12} />} />
                <Field label="Минимальная зарплата (₽)" value={form.salaryFrom} onChange={v => setForm(f => ({ ...f, salaryFrom: v }))}
                  placeholder="200000" type="number" icon={<Target size={12} />} />
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin size={12} className="opacity-60" />Локация
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AREA_OPTIONS.map(a => (
                      <button key={a.id} onClick={() => setForm(f => ({ ...f, areaId: a.id }))}
                        className={`py-2.5 px-3 rounded-xl border text-sm font-mono text-left transition-all min-h-[44px] ${form.areaId === a.id ? "border-[var(--neon-violet)]/60 bg-[var(--neon-violet)]/10 text-[var(--neon-violet)]" : "border-border bg-input-background text-foreground/80 hover:border-[var(--neon-violet)]/30"}`}>
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          {step === 0 ? (
            <button onClick={handleFetchResume} disabled={!canStep0 || loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: canStep0 ? "0 0 20px rgba(139,92,246,0.35)" : "none" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" />Проверка резюме...</> : <>Подключить профиль HH <ArrowRight size={14} /></>}
            </button>
          ) : (
            <button onClick={handleSave} disabled={!canStep1}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: canStep1 ? "0 0 20px rgba(139,92,246,0.35)" : "none" }}>
              <Check size={15} />Сохранить позицию
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────────
function OnboardingScreen({ onAddPosition }: { onAddPosition: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}>
        <div className="relative mb-6 inline-flex">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)", boxShadow: "0 0 40px rgba(139,92,246,0.4)" }}>
            <Zap size={28} className="text-white" />
          </div>
          <div className="absolute -inset-2 rounded-2xl border border-[var(--neon-violet)]/20 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Oxanium, monospace" }}>
          Добро пожаловать в HuntPulse<span className="text-[var(--neon-violet)]">_</span>AI
        </h1>
        <p className="text-muted-foreground text-sm font-mono max-w-sm mx-auto mb-8 leading-relaxed">
          ИИ-агент автоматических откликов на HeadHunter. Добавьте первую позицию, чтобы начать.
        </p>

        {/* Steps preview */}
        <div className="flex items-center justify-center gap-0 mb-10 max-w-xs mx-auto">
          {[
            { icon: <Key size={13} />, label: "Профиль HH" },
            { icon: <Target size={13} />, label: "Параметры" },
            { icon: <Rocket size={13} />, label: "Запуск" },
          ].map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground">{s.icon}</div>
                <span className="text-[9px] font-mono text-muted-foreground">{s.label}</span>
              </div>
              {i < 2 && <div className="w-8 h-px bg-border mx-1 mb-4" />}
            </div>
          ))}
        </div>

        <motion.button
          onClick={onAddPosition}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 mx-auto min-h-[52px]"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 30px rgba(139,92,246,0.45)" }}
        >
          <Plus size={18} />Добавить позицию
        </motion.button>

        <p className="text-[11px] font-mono text-muted-foreground mt-4">Ваши данные хранятся только в браузере</p>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [tab, setTab] = useState<Tab>("dashboard");
  const running = false;
  const [applications, setApplications] = useState<AppRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem("huntpulse_applications") || "[]"); } catch { return []; }
  });
  const [filterStatus, setFilterStatus] = useState<AppStatus | "Все">("Все");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [positions, setPositions] = useState<Position[]>(() => {
    try { return JSON.parse(localStorage.getItem("huntpulse_positions") || "[]"); } catch { return []; }
  });
  const [foundCount] = useState(0);
  const [invites] = useState(0);
  const [guideSection, setGuideSection] = useState<string | null>(null);

  const [config, setConfig] = useState<Config>(() => {
    try { const r = validateImportedConfig(JSON.parse(localStorage.getItem("huntpulse_config") || "{}")); return r.valid ? r.data : DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; }
  });

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  useEffect(() => { localStorage.setItem("huntpulse_applications", JSON.stringify(applications)); }, [applications]);

  const saveConfig = useCallback((c: Config) => { setConfig(c); localStorage.setItem("huntpulse_config", JSON.stringify(c)); }, []);
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
    localStorage.setItem("huntpulse_positions", JSON.stringify(next));
  };

  const handleStartClick = () => {
    setTab("config");
    toast.info("Настройте запрос и запустите поиск", { description: "Результаты загружаются напрямую из открытых API." });
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
              <AppIcon />
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
                <span className="hidden sm:inline">{running ? "Работа" : "Готов"}</span>
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
                          <p className="text-sm text-muted-foreground font-mono">Готов к поиску · {prov.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {!running && (
                          <button onClick={() => setShowAddPosition(true)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:border-[var(--neon-violet)]/30 transition-all min-h-[44px]">
                            <Plus size={14} />Добавить позицию
                          </button>
                        )}
                        <button onClick={handleStartClick}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--neon-violet)]/50 text-sm font-semibold text-white transition-all min-h-[44px]"
                          style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
                          <Target size={14} />Найти вакансии
                        </button>
                      </div>
                    </div>
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
                      <Field label="Должность" value={config.jobTitle} onChange={v => updateConfig({ jobTitle: v })} placeholder="Frontend Developer" icon={<Target size={12} />} />
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
                  <h2 className="text-lg font-bold" style={{ fontFamily: "Oxanium, monospace" }}>История откликов</h2>
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
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">Данные хранятся локально в браузере</p>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Готовый профиль</label>
                      <span className="text-[10px] font-mono text-[var(--neon-violet)]">Приоритет: тестировщик</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PROFILE_PRESETS.map((preset, index) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateConfig({ jobTitle: preset.jobTitle, profile: preset.profile });
                            toast.success(`Профиль «${preset.label}» применён`);
                          }}
                          className={`rounded-xl border p-3 text-left transition-all hover:border-[var(--neon-violet)]/50 ${index < 2 ? "border-[var(--neon-violet)]/30 bg-[var(--neon-violet)]/5" : "border-border bg-input-background"}`}
                        >
                          <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                            {preset.label}
                            {index < 2 && <span className="rounded-full bg-[var(--neon-violet)]/15 px-1.5 py-0.5 text-[9px] font-mono text-[var(--neon-violet)]">приоритет</span>}
                          </span>
                          <span className="block text-[11px] font-mono leading-relaxed text-muted-foreground">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground">Пресет заменяет должность и описание профиля. Текст можно отредактировать перед поиском.</p>
                  </div>
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

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">PWA</div>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">HuntPulse AI — Progressive Web App. Нажмите «Добавить на главный экран» в браузере для установки без App Store.</p>
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
      </AnimatePresence>
    </div>
  );
}
