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

// ─── Types ────────────────────────────────────────────────────────────────────
type Theme = "dark" | "light";
type Tab = "dashboard" | "config" | "history" | "settings" | "guide";
type AppStatus = "Отправлено" | "В процессе" | "Ошибка" | "Пропущено";
type Provider = "gemini" | "groq" | "openrouter";
type ExecMode = "auto" | "manual";

interface Position {
  id: string;
  hhToken: string;
  resumeId: string;
  jobTitle: string;
  salaryFrom: string;
  areaId: string;
  areaName: string;
  createdAt: string;
}

type JobSource = "hh" | "habr" | "djinni" | "remoteco" | "remoteok" | "telegram" | "arbeitnow";

interface AppRecord {
  id: string; vacancyId: string; title: string; company: string;
  salary: string; date: string; status: AppStatus; letter: string; url: string;
  source?: JobSource;
}

interface PendingVacancy {
  id: string; title: string; company: string; salary: string;
  location: string; experience: string; description: string;
  skills: string[]; letter: string; url: string;
}

interface Config {
  provider: Provider; apiKey: string; profile: string;
  jobTitle: string; areaId: string; salaryFrom: string; salaryTo: string; dailyLimit: number;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateImportedConfig(raw: unknown): { valid: true; data: Config } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { valid: false, error: "Файл должен содержать JSON-объект" };
  const r = raw as Record<string, unknown>;
  const validProviders: Provider[] = ["gemini", "groq", "openrouter"];
  if (r.provider && !validProviders.includes(r.provider as Provider)) return { valid: false, error: `Неизвестный провайдер: "${r.provider}"` };
  return {
    valid: true,
    data: {
      provider: (r.provider as Provider) || "gemini", apiKey: String(r.apiKey ?? ""),
      profile: String(r.profile ?? ""), jobTitle: String(r.jobTitle ?? ""),
      areaId: String(r.areaId ?? "1"), salaryFrom: String(r.salaryFrom ?? ""),
      salaryTo: String(r.salaryTo ?? ""), dailyLimit: Number(r.dailyLimit ?? 15),
    }
  };
}

// ─── Job sources registry ─────────────────────────────────────────────────────
const JOB_SOURCES: Record<JobSource, {
  label: string; url: string; color: string; bg: string; border: string;
  rss?: string; api?: string; free: boolean; geo: string; desc: string;
}> = {
  hh:        { label: "HH.ru",           url: "https://hh.ru",                color: "text-red-400",      bg: "bg-red-400/10",      border: "border-red-400/30",      free: true,  geo: "RU",     desc: "Крупнейший job-сайт РФ. Бесплатный публичный API.", rss: "https://hh.ru/search/vacancy/rss?text={q}&area={area}" },
  habr:      { label: "Habr Career",     url: "https://career.habr.com",      color: "text-sky-400",      bg: "bg-sky-400/10",      border: "border-sky-400/30",      free: true,  geo: "RU",     desc: "IT-вакансии от Хабра. Публичный JSON API без авторизации.", api: "https://career.habr.com/api/frontend/vacancies?q={q}&sort=date" },
  djinni:    { label: "Djinni.co",       url: "https://djinni.co",            color: "text-violet-400",   bg: "bg-violet-400/10",   border: "border-violet-400/30",   free: true,  geo: "RU/UA",  desc: "IT-платформа РФ/Украина. Бесплатный RSS-фид.", rss: "https://djinni.co/jobs/rss/?primary_keyword={q}" },
  remoteco:  { label: "Remote.co",       url: "https://remote.co",            color: "text-emerald-400",  bg: "bg-emerald-400/10",  border: "border-emerald-400/30",  free: true,  geo: "World",  desc: "Удалёнка по всему миру. RSS-фид без регистрации.", rss: "https://remote.co/remote-jobs/feed/" },
  remoteok:  { label: "RemoteOK",        url: "https://remoteok.io",          color: "text-amber-400",    bg: "bg-amber-400/10",    border: "border-amber-400/30",    free: true,  geo: "World",  desc: "Бесплатный JSON API. Только удалённые вакансии.", api: "https://remoteok.io/api?tag={q}" },
  telegram:  { label: "Telegram RSS",    url: "https://t.me",                 color: "text-cyan-400",     bg: "bg-cyan-400/10",     border: "border-cyan-400/30",     free: true,  geo: "RU",     desc: "Публичные Telegram-каналы с вакансиями через RSS-прокси.", rss: "https://rsshub.app/telegram/channel/devjobs_ru" },
  arbeitnow: { label: "Arbeitnow",       url: "https://www.arbeitnow.com",    color: "text-pink-400",     bg: "bg-pink-400/10",     border: "border-pink-400/30",     free: true,  geo: "EU/World", desc: "Бесплатный API без ключа. Международные вакансии.", api: "https://www.arbeitnow.com/api/job-board-api" },
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_APPLICATIONS: AppRecord[] = [
  { id: "1", vacancyId: "v001", title: "Senior Frontend Developer", company: "Яндекс", salary: "300 000 – 400 000 ₽", date: "2025-07-21T09:14:00", status: "Отправлено", source: "hh",       letter: "Уважаемая команда Яндекса! Меня привлекает ваша вакансия Senior Frontend Developer. За 6 лет опыта я освоил React, TypeScript и архитектуру микрофронтендов. Ваш акцент на масштабируемости и производительности полностью совпадает с моим профессиональным вектором.", url: "https://hh.ru/vacancy/1" },
  { id: "2", vacancyId: "v002", title: "React Developer", company: "Тинькофф", salary: "250 000 – 320 000 ₽", date: "2025-07-21T09:08:00", status: "Отправлено", source: "habr",     letter: "Добрый день! Тинькофф — один из самых технологичных банков страны. Мой стек: React 18, Next.js, Zustand, GraphQL. Готов принести пользу уже с первого спринта.", url: "https://hh.ru/vacancy/2" },
  { id: "3", vacancyId: "v003", title: "Frontend Engineer", company: "Авито", salary: "280 000 – 360 000 ₽", date: "2025-07-21T08:55:00", status: "В процессе", source: "hh",       letter: "Генерация письма...", url: "https://hh.ru/vacancy/3" },
  { id: "4", vacancyId: "v004", title: "UI Developer", company: "VK", salary: "200 000 – 280 000 ₽", date: "2025-07-21T08:42:00", status: "Пропущено", source: "djinni",    letter: "Вакансия уже была в истории откликов.", url: "https://hh.ru/vacancy/4" },
  { id: "5", vacancyId: "v005", title: "JavaScript Developer", company: "Ozon", salary: "не указана", date: "2025-07-21T08:30:00", status: "Ошибка", source: "hh",       letter: "API ответил ошибкой 403.", url: "https://hh.ru/vacancy/5" },
  { id: "6", vacancyId: "v006", title: "Frontend Architect", company: "Sber", salary: "400 000 – 550 000 ₽", date: "2025-07-20T16:45:00", status: "Отправлено", source: "habr",     letter: "Здравствуйте! Архитектурная роль в Сбере — именно то, к чему я шёл три года. Имею опыт проектирования design system и монорепозиториев на Nx.", url: "https://hh.ru/vacancy/6" },
  { id: "7", vacancyId: "v007", title: "React Native Developer", company: "Delivery Club", salary: "220 000 – 290 000 ₽", date: "2025-07-20T14:22:00", status: "Отправлено", source: "remoteok", letter: "Мобильная разработка на React Native — моя вторая специализация. Участвовал в запуске приложения с 2 млн MAU.", url: "https://hh.ru/vacancy/7" },
];

const MOCK_PENDING: PendingVacancy[] = [
  {
    id: "pv1", title: "Frontend Lead", company: "Avito Tech", salary: "350 000 – 450 000 ₽",
    location: "Москва · Гибрид", experience: "5+ лет", url: "https://hh.ru/vacancy/100",
    skills: ["React", "TypeScript", "Team Lead", "Architecture", "GraphQL"],
    description: "Ищем опытного Frontend Lead для развития платформы объявлений. Отвечаете за архитектурные решения, менторинг команды из 6 разработчиков, взаимодействие с продуктом.",
    letter: `Уважаемая команда Avito Tech!\n\nПозиция Frontend Lead — это именно тот следующий шаг, к которому я готовился последние два года в роли Senior. Имею опыт архитектурных решений для высоконагруженных платформ и менторинга junior-разработчиков.\n\nМой стек полностью соответствует вашим требованиям: React, TypeScript, GraphQL. Готов взять ответственность за команду и технические стандарты.`,
  },
  {
    id: "pv2", title: "Senior React Developer", company: "Lamoda Tech", salary: "280 000 – 370 000 ₽",
    location: "Москва · Удалённо", experience: "4+ лет", url: "https://hh.ru/vacancy/101",
    skills: ["React", "Next.js", "Redux", "Node.js", "Docker"],
    description: "Ищем Senior React Developer для развития e-commerce платформы Lamoda. Задачи: архитектура новых фич, оптимизация производительности, code review.",
    letter: `Добрый день, команда Lamoda!\n\nE-commerce разработка — это мой основной профиль последних 3 лет. На текущем месте участвовал в редизайне checkout-флоу, который увеличил конверсию на 18%.\n\nС вашим стеком работаю ежедневно. Готов к техническому интервью в удобное время.`,
  },
  {
    id: "pv3", title: "UI/UX Engineer", company: "Sber Technology", salary: "300 000 – 400 000 ₽",
    location: "Москва · Офис", experience: "3+ лет", url: "https://hh.ru/vacancy/102",
    skills: ["React", "Design Systems", "Figma", "Storybook", "CSS"],
    description: "Разработчик, умеющий говорить на одном языке с дизайнерами. Будете развивать корпоративную design system, интегрировать Figma-компоненты в продукт.",
    letter: `Здравствуйте!\n\nДизайн-системы — моя страсть. Два года разрабатывал и поддерживал component library на 120+ компонентов в Storybook. Умею выстраивать рабочий процесс между дизайн-командой и разработкой.\n\nГотов показать живые примеры работ на портфолио.`,
  },
];

const AREA_OPTIONS = [
  { id: "1", name: "Москва" }, { id: "2", name: "Санкт-Петербург" },
  { id: "113", name: "Россия (вся)" }, { id: "0", name: "Удалённо / Весь мир" },
];

const PROVIDERS: Record<Provider, { label: string; badge: string; badgeColor: string; model: string; icon: JSX.Element; placeholder: string }> = {
  gemini: { label: "Google Gemini", badge: "Бесплатно", badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", model: "gemini-1.5-flash", icon: <Sparkles size={14} />, placeholder: "AIza..." },
  groq: { label: "Groq (Llama 3)", badge: "Бесплатно", badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", model: "llama-3.1-8b-instant", icon: <Cpu size={14} />, placeholder: "gsk_..." },
  openrouter: { label: "OpenRouter", badge: ":free модели", badgeColor: "text-violet-400 bg-violet-400/10 border-violet-400/30", model: "llama-3.1-8b:free", icon: <Globe size={14} />, placeholder: "sk-or-..." },
};

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

// ─── Execution Mode Modal ─────────────────────────────────────────────────────
function ExecutionModeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (m: ExecMode) => void }) {
  const [hovered, setHovered] = useState<ExecMode | null>(null);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--neon-violet)]/30 bg-card flex flex-col"
        style={{ boxShadow: "0 0 60px rgba(139,92,246,0.2), 0 25px 50px rgba(0,0,0,0.5)" }}
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base" style={{ fontFamily: "Oxanium, monospace" }}>Выбор режима работы</h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Как ИИ будет отправлять отклики?</p>
        </div>
        <div className="p-5 space-y-3">
          {/* Auto */}
          <motion.button
            onClick={() => onSelect("auto")}
            onHoverStart={() => setHovered("auto")} onHoverEnd={() => setHovered(null)}
            className="w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 min-h-[100px]"
            style={{ borderColor: hovered === "auto" ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.2)", background: hovered === "auto" ? "rgba(139,92,246,0.08)" : "transparent" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)" }}>
                <BrainCircuit size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground" style={{ fontFamily: "Oxanium, monospace" }}>Полный автопилот</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border border-[var(--neon-violet)]/30">Рекомендуется</span>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed">ИИ самостоятельно находит вакансии, генерирует письмо и отправляет отклик. Вы только наблюдаете за статистикой.</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Максимальный охват", "Без участия пользователя", "5–12 сек пауза между откликами"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-1" />
            </div>
          </motion.button>

          {/* Manual */}
          <motion.button
            onClick={() => onSelect("manual")}
            onHoverStart={() => setHovered("manual")} onHoverEnd={() => setHovered(null)}
            className="w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 min-h-[100px]"
            style={{ borderColor: hovered === "manual" ? "rgba(6,182,212,0.5)" : "rgba(6,182,212,0.15)", background: hovered === "manual" ? "rgba(6,182,212,0.06)" : "transparent" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
                <Hand size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground" style={{ fontFamily: "Oxanium, monospace" }}>Ручной контроль</span>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed">ИИ генерирует письмо, но вы сами решаете — отправить, переписать или пропустить вакансию.</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Полный контроль", "Редактирование письма", "Одобрение каждого отклика"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-1" />
            </div>
          </motion.button>
        </div>
        <div className="px-5 py-4 border-t border-border">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:text-foreground transition-all min-h-[44px]">Отмена</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Manual Review Panel ──────────────────────────────────────────────────────
function ManualReviewPanel({ vacancy, queue, onApply, onRegenerate, onSkip, onStop }: {
  vacancy: PendingVacancy; queue: number;
  onApply: () => void; onRegenerate: () => void; onSkip: () => void; onStop: () => void;
}) {
  const [letter, setLetter] = useState(vacancy.letter);
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { setLetter(vacancy.letter); setEditing(false); }, [vacancy.id]);

  const handleRegen = async () => {
    setRegenerating(true);
    await new Promise(r => setTimeout(r, 1800));
    setLetter(`Здравствуйте, команда ${vacancy.company}!\n\nПосле детального изучения вашей вакансии "${vacancy.title}" я убеждён, что мой опыт будет максимально полезен. ${vacancy.skills.slice(0, 2).join(" и ")} — технологии, с которыми я работаю ежедневно на протяжении последних лет.\n\nГотов обсудить детали в удобное для вас время.`);
    setRegenerating(false);
    onRegenerate();
  };

  const charCount = letter.length;

  return (
    <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      {/* Mode banner */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/8 text-[var(--neon-cyan)] text-xs font-mono">
            <Hand size={11} /><span>Ручной контроль</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{queue} в очереди</span>
        </div>
        <button onClick={onStop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/8 text-red-400 text-xs font-mono hover:bg-red-500/15 transition-all min-h-[36px]">
          <Square size={11} />Стоп
        </button>
      </div>

      {/* Vacancy card */}
      <div className="rounded-2xl border border-[var(--neon-violet)]/25 bg-card overflow-hidden" style={{ boxShadow: "0 0 30px rgba(139,92,246,0.08)" }}>
        {/* Vacancy header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "Oxanium, monospace" }}>{vacancy.title}</h3>
              <div className="flex items-center gap-1.5 text-[var(--neon-violet)] text-sm font-medium mb-2">
                <Building2 size={14} />{vacancy.company}
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin size={11} />{vacancy.location}</span>
                <span className="flex items-center gap-1"><Briefcase size={11} />{vacancy.experience}</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">{vacancy.salary}</span>
              </div>
            </div>
            <a href={vacancy.url} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-lg text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center border border-border">
              <ExternalLink size={14} />
            </a>
          </div>
          <p className="text-xs text-foreground/60 leading-relaxed mb-3">{vacancy.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {vacancy.skills.map(s => (
              <span key={s} className="px-2 py-0.5 rounded-md bg-[var(--neon-violet)]/10 border border-[var(--neon-violet)]/20 text-[var(--neon-violet)] text-[10px] font-mono">{s}</span>
            ))}
          </div>
        </div>

        {/* Letter */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Bot size={14} className="text-[var(--neon-violet)]" />
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Сопроводительное письмо</span>
              {regenerating && <Loader2 size={11} className="text-violet-400 animate-spin" />}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono ${charCount > 800 ? "text-red-400" : "text-muted-foreground"}`}>{charCount}/800</span>
              <CopyButton text={letter} />
              <button onClick={() => setEditing(!editing)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-all min-h-[32px] ${editing ? "bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border-[var(--neon-violet)]/40" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <Pencil size={11} />{editing ? "Просмотр" : "Изменить"}
              </button>
            </div>
          </div>
          {editing ? (
            <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={7}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--neon-violet)]/40 bg-input-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] resize-none transition-all" />
          ) : (
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{regenerating ? "ИИ переписывает письмо..." : letter}</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 grid grid-cols-3 gap-2">
          <button onClick={onSkip}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all min-h-[64px]">
            <SkipForward size={16} />
            <span className="text-[11px] font-mono">Пропустить</span>
          </button>
          <button onClick={handleRegen} disabled={regenerating}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-amber-400/30 text-amber-400 hover:bg-amber-400/8 transition-all min-h-[64px] disabled:opacity-50">
            <RotateCcw size={16} className={regenerating ? "animate-spin" : ""} />
            <span className="text-[11px] font-mono">Переписать</span>
          </button>
          <button onClick={onApply} disabled={charCount > 800}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 min-h-[64px]"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 16px rgba(139,92,246,0.4)" }}>
            <ThumbsUp size={16} />
            <span className="text-[11px] font-mono">Откликнуться</span>
          </button>
        </div>
      </div>
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

// ─── Guide helpers ─────────────────────────────────────────────────────────────
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono text-white mt-0.5" style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)" }}>{n}</div>
      <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
    </div>
  );
}
function CodeSnip({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group mt-2 rounded-lg border border-border bg-muted overflow-hidden">
      <pre className="px-4 py-3 text-xs font-mono text-[var(--neon-cyan)] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{children}</pre>
      <button onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 p-1.5 rounded bg-card/90 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all min-w-[30px] min-h-[30px] flex items-center justify-center">
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
function FreeBadge() { return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border text-emerald-400 bg-emerald-400/10 border-emerald-400/30 ml-1">✦ Бесплатно</span>; }
function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--neon-violet)] underline underline-offset-2 hover:no-underline inline-flex items-center gap-0.5">{children}<ExternalLink size={10} /></a>;
}

// ─── JSON Config Panel ─────────────────────────────────────────────────────────
function ConfigPanel({ config, onImport }: { config: Config; onImport: (c: Config) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "huntpulse_config.json"; a.click(); URL.revokeObjectURL(url);
    toast.success("Конфиг сохранён", { description: "Файл huntpulse_config.json скачан" });
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.name.endsWith(".json")) { toast.error("Неверный формат", { description: "Выберите .json файл" }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = validateImportedConfig(JSON.parse(ev.target?.result as string));
        if (!result.valid) { toast.error("Ошибка структуры JSON", { description: result.error }); return; }
        onImport(result.data); localStorage.setItem("huntpulse_config", JSON.stringify(result.data));
        toast.success("Конфиг загружен", { description: "Все поля обновлены" });
      } catch { toast.error("Не удалось прочитать файл", { description: "Файл повреждён или не является валидным JSON" }); }
    };
    reader.onerror = () => toast.error("Ошибка чтения файла");
    reader.readAsText(file); if (fileRef.current) fileRef.current.value = "";
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-4">JSON конфигурация</div>
      <p className="text-xs text-foreground/60 font-mono leading-relaxed mb-4">Экспортируйте настройки для резервной копии или переноса на другое устройство.</p>
      <div className="flex gap-3">
        <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:border-[var(--neon-violet)]/30 transition-all min-h-[48px]">
          <Download size={14} />Скачать
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 min-h-[48px]"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}>
          <Upload size={14} />Загрузить
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
    </div>
  );
}

// ─── Guide Tab ─────────────────────────────────────────────────────────────────
function GuideTab({ onGoToSettings, initialSection }: { onGoToSettings: () => void; initialSection?: string | null }) {
  const [openSection, setOpenSection] = useState<string | null>(initialSection || "gemini");
  useEffect(() => { if (initialSection) setOpenSection(initialSection); }, [initialSection]);

  const sections = [
    { id: "gemini", icon: <Sparkles size={16} />, title: "Google Gemini API", extra: <FreeBadge />, accent: "var(--neon-green)", content: (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-400/8 border border-emerald-400/20 text-xs font-mono text-emerald-400"><CheckCircle size={13} className="shrink-0 mt-0.5" />Бесплатно · <strong>1 500 req/day</strong> · без карты</div>
        <div className="space-y-3">
          <Step n={1}>Перейдите на <ExtLink href="https://aistudio.google.com">aistudio.google.com</ExtLink> и войдите через Google.</Step>
          <Step n={2}>В левом меню нажмите <strong>«Get API key»</strong>, затем <strong>«Create API key»</strong>.</Step>
          <Step n={3}>Скопируйте ключ — он начинается с <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">AIza...</code> — и вставьте в настройки.</Step>
        </div>
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--neon-violet)]/10 border border-[var(--neon-violet)]/20 text-xs font-mono text-[var(--neon-violet)]"><Shield size={13} className="shrink-0 mt-0.5" />При 15 откликах/день хватит на 100 дней без единого платежа.</div>
      </div>
    )},
    { id: "groq", icon: <Cpu size={16} />, title: "Groq API (Llama 3)", extra: <FreeBadge />, accent: "var(--neon-cyan)", content: (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-emerald-400/8 border border-emerald-400/20 text-xs font-mono text-emerald-400"><Cpu size={13} className="shrink-0 mt-0.5" />Сверхбыстрая генерация на Llama 3. Бесплатно, карта не нужна.</div>
        <div className="space-y-3">
          <Step n={1}>Откройте <ExtLink href="https://console.groq.com">console.groq.com</ExtLink> и зарегистрируйтесь.</Step>
          <Step n={2}>В меню выберите <strong>«API Keys»</strong> → <strong>«Create API Key»</strong>.</Step>
          <Step n={3}>Ключ начинается с <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">gsk_...</code>. Вставьте в настройки HuntPulse.</Step>
        </div>
      </div>
    )},
    { id: "openrouter", icon: <Globe size={16} />, title: "OpenRouter API", extra: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border text-violet-400 bg-violet-400/10 border-violet-400/30 ml-1">:free модели</span>, accent: "var(--neon-violet)", content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <Step n={1}>Перейдите на <ExtLink href="https://openrouter.ai">openrouter.ai</ExtLink> и создайте аккаунт.</Step>
          <Step n={2}>Откройте раздел <strong>Keys</strong> → <strong>«Create Key»</strong>. Ключ: <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">sk-or-...</code></Step>
          <Step n={3}>Используйте модели с суффиксом <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">:free</code>:<CodeSnip>{`meta-llama/llama-3.1-8b-instruct:free\nmistralai/mistral-7b-instruct:free`}</CodeSnip></Step>
        </div>
      </div>
    )},
    { id: "hhtoken", icon: <Key size={16} />, title: "HH Access Token — подробная инструкция", accent: "#f59e0b", content: (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-amber-400/8 border border-amber-400/20 text-xs font-mono text-amber-400">
          <Shield size={13} className="shrink-0 mt-0.5" />
          <div>Токен — это ключ доступа к вашему аккаунту HH.ru через API. Он даёт право откликаться от вашего имени. Храните его как пароль — HuntPulse не передаёт его никуда.</div>
        </div>

        <div className="px-3 py-2.5 rounded-lg bg-muted text-xs font-mono text-muted-foreground">
          <span className="text-foreground/70 font-semibold">Что понадобится:</span> аккаунт HH.ru, браузер, 5 минут.
        </div>

        <div className="space-y-4">
          <Step n={1}>
            <div>Перейдите на портал разработчика HeadHunter: <ExtLink href="https://dev.hh.ru/admin">dev.hh.ru/admin</ExtLink></div>
            <div className="mt-1.5 text-xs text-foreground/60">Войдите с тем аккаунтом HH.ru, с которого хотите откликаться. Если аккаунта нет — сначала зарегистрируйтесь на hh.ru.</div>
          </Step>
          <Step n={2}>
            <div>Нажмите кнопку <strong>«Создать приложение»</strong>. Заполните форму:</div>
            <div className="mt-2 space-y-1">
              {[["Название", "HuntPulse AI (или любое удобное)"], ["Описание", "Личный инструмент автоотклика"], ["Redirect URI", "https://localhost"]].map(([k, v]) => (
                <div key={k} className="flex gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-mono">
                  <span className="text-muted-foreground w-24 shrink-0">{k}:</span>
                  <span className="text-[var(--neon-cyan)]">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-foreground/60">После создания вы получите <strong>client_id</strong> и <strong>client_secret</strong> — сохраните их.</div>
          </Step>
          <Step n={3}>
            <div>Откройте в браузере URL авторизации (замените <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">ВАШ_CLIENT_ID</code> на своё значение):</div>
            <CodeSnip>{`https://hh.ru/oauth/authorize\n  ?response_type=code\n  &client_id=ВАШ_CLIENT_ID\n  &redirect_uri=https://localhost`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">Нажмите «Разрешить». Браузер перенаправит вас на адрес вида: <code className="bg-muted px-1 rounded">https://localhost/?code=XXXXXXXX</code>. Скопируйте значение <strong>code=...</strong> из адресной строки.</div>
          </Step>
          <Step n={4}>
            <div>Обменяйте код на Access Token. Выполните в терминале (или через <ExtLink href="https://hoppscotch.io">Hoppscotch</ExtLink>):</div>
            <CodeSnip>{`curl -X POST "https://hh.ru/oauth/token" \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "grant_type=authorization_code" \\\n  -d "client_id=ВАШ_CLIENT_ID" \\\n  -d "client_secret=ВАШ_CLIENT_SECRET" \\\n  -d "code=КОД_ИЗ_БРАУЗЕРА" \\\n  -d "redirect_uri=https://localhost"`}</CodeSnip>
          </Step>
          <Step n={5}>
            <div>В ответе вы получите JSON. Скопируйте значение поля <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">access_token</code>:</div>
            <CodeSnip>{`{\n  "access_token": "EXAMPLE_TOKEN_abcdef12345",\n  "token_type": "bearer",\n  "expires_in": 1209600,\n  "refresh_token": "..."\n}`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">Вставьте <code className="bg-muted px-1 rounded">access_token</code> в поле <strong>HH Access Token</strong> в настройках HuntPulse. Готово!</div>
          </Step>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-400/8 border border-amber-400/20 text-xs font-mono text-amber-400">
            <AlertCircle size={12} className="shrink-0 mt-0.5" /><div>Токен действует <strong>14 дней</strong>. После истечения повторите шаги 3–5.</div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-400/8 border border-emerald-400/20 text-xs font-mono text-emerald-400">
            <CheckCircle size={12} className="shrink-0 mt-0.5" /><div>Для обновления токена используйте <code>refresh_token</code> из ответа.</div>
          </div>
        </div>
      </div>
    )},
    { id: "resumeid", icon: <FileText size={16} />, title: "Resume ID — где найти", accent: "var(--neon-cyan)", content: (
      <div className="space-y-4">
        <p className="text-sm text-foreground/70 leading-relaxed">Resume ID — уникальный идентификатор вашего резюме на hh.ru. Выглядит как строка букв и цифр длиной ~20 символов.</p>

        <div className="space-y-4">
          <Step n={1}>
            <div>Войдите на HeadHunter и перейдите в раздел «Мои резюме»: <ExtLink href="https://hh.ru/applicant/resumes">hh.ru/applicant/resumes</ExtLink></div>
          </Step>
          <Step n={2}>
            <div>Нажмите на нужное резюме, чтобы открыть его страницу. Посмотрите на адресную строку браузера — вы увидите URL вида:</div>
            <CodeSnip>{`https://hh.ru/resume/abc123def4560000000`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">Часть после <code className="bg-muted px-1 rounded">/resume/</code> — это и есть ваш Resume ID. В примере выше это <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">abc123def4560000000</code>.</div>
          </Step>
          <Step n={3}>
            <div><strong>Альтернативный способ через API</strong> (если токен уже получен — вернёт список всех ваших резюме):</div>
            <CodeSnip>{`curl "https://api.hh.ru/resumes/mine" \\\n  -H "Authorization: Bearer ВАШ_ACCESS_TOKEN" \\\n  -H "HH-User-Agent: HuntPulse/1.0 (huntpulse@example.com)"`}</CodeSnip>
            <div className="mt-2 text-xs text-foreground/60">В ответе — массив резюме. У каждого есть поле <code className="bg-muted px-1 rounded text-[var(--neon-cyan)]">"id"</code> — это и есть Resume ID.</div>
          </Step>
        </div>

        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-[var(--neon-violet)]/8 border border-[var(--neon-violet)]/20 text-xs font-mono text-[var(--neon-violet)]">
          <Shield size={13} className="shrink-0 mt-0.5" />
          Если у вас несколько резюме, используйте то, которое наиболее актуально для целевой должности. Отклики будут отправляться именно с него.
        </div>
      </div>
    )},
    { id: "sources", icon: <Globe size={16} />, title: "Источники вакансий — все бесплатные", accent: "var(--neon-cyan)", content: (
      <div className="space-y-4">
        <p className="text-sm text-foreground/70 leading-relaxed">
          HuntPulse собирает вакансии из 7 источников через публичные API и RSS-фиды — без платных подписок, регистраций и парсинга. Отклики отправляются только через HH.ru, остальные источники используются для <strong>обнаружения вакансий</strong>.
        </p>

        <div className="space-y-2">
          {(Object.entries(JOB_SOURCES) as [JobSource, typeof JOB_SOURCES[JobSource]][]).map(([id, s]) => (
            <div key={id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.bg} border ${s.border}`}>
                  <Globe size={12} className={s.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-sm font-semibold font-mono ${s.color}`}>{s.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.geo}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">Бесплатно</span>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed mb-1.5">{s.desc}</p>
                  {(s.rss || s.api) && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {s.rss && <span className="mr-2">📡 RSS</span>}
                      {s.api && <span>🔌 API</span>}
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className={`ml-2 ${s.color} hover:underline`}>{s.url.replace("https://", "")}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Как работает агрегация</div>
          <div className="space-y-2 text-xs text-foreground/65 leading-relaxed">
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">1.</span><span>Все источники опрашиваются параллельно через CORS-прокси (rss2json.com, allorigins.win) или напрямую через их публичные API.</span></div>
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">2.</span><span>Вакансии нормализуются в единый формат и дедуплицируются по названию + компании.</span></div>
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">3.</span><span>Совпадения с вашими критериями (должность, зарплата, локация) фильтруются ИИ.</span></div>
            <div className="flex gap-2"><span className="text-[var(--neon-violet)] shrink-0">4.</span><span>Отклики отправляются только на HH.ru — на вакансии, найденные там. По остальным источникам открывается ссылка для ручного отклика.</span></div>
          </div>
        </div>
      </div>
    )},
    { id: "flow", icon: <Zap size={16} />, title: "Как работает HuntPulse AI", accent: "var(--neon-violet)", content: (
      <div className="space-y-2">
        {[
          { icon: <Plus size={14} />, label: "Добавление позиции", text: "Вводите HH-токен, Resume ID, должность и параметры поиска." },
          { icon: <Globe size={14} />, label: "Агрегация источников", text: "7 бесплатных источников — HH.ru, Habr Career, Djinni, RemoteOK и другие." },
          { icon: <CheckCircle size={14} />, label: "Дедупликация", text: "Вакансии из локальной истории автоматически пропускаются." },
          { icon: <Bot size={14} />, label: "Генерация письма", text: "AI-провайдер создаёт персонализированное письмо до 800 символов." },
          { icon: <BrainCircuit size={14} />, label: "Автопилот или контроль", text: "Выберите режим: автоматическая отправка или проверка каждого отклика." },
          { icon: <History size={14} />, label: "История", text: "Все отклики сохраняются с текстом письма, источником и статусом." },
        ].map((item, i) => (
          <div key={i} className="flex gap-3 px-3 py-3 rounded-xl border border-border bg-background">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.12)", color: "var(--neon-violet)" }}>{item.icon}</div>
            <div><div className="text-xs font-mono font-semibold text-foreground mb-0.5">{item.label}</div><div className="text-xs text-foreground/65 leading-relaxed">{item.text}</div></div>
          </div>
        ))}
      </div>
    )},
  ];

  return (
    <motion.div key="guide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
      <div className="max-w-2xl">
        <div className="mb-5">
          <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "Oxanium, monospace" }}>Руководство</h2>
          <p className="text-xs font-mono text-muted-foreground">Пошаговые инструкции по получению всех бесплатных API-ключей</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {(["gemini", "groq", "openrouter"] as Provider[]).map(p => {
            const pr = PROVIDERS[p];
            return (
              <button key={p} onClick={() => setOpenSection(p)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${openSection === p ? "border-[var(--neon-violet)]/50 bg-[var(--neon-violet)]/8" : "border-border bg-card hover:border-[var(--neon-violet)]/30"}`}>
                <span className="text-[var(--neon-violet)] opacity-70">{pr.icon}</span>
                <span className="text-[10px] font-mono text-foreground/70 leading-tight">{pr.label}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${pr.badgeColor}`}>{pr.badge}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {sections.map(sec => (
            <div key={sec.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button className="w-full flex items-center gap-3 px-5 py-4 text-left group hover:bg-muted/30 transition-colors min-h-[56px]"
                onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}>
                <span style={{ color: sec.accent }} className="opacity-70 group-hover:opacity-100 transition-opacity shrink-0">{sec.icon}</span>
                <span className="flex-1 text-sm font-semibold text-foreground flex items-center flex-wrap gap-1" style={{ fontFamily: "Oxanium, monospace" }}>{sec.title}{(sec as any).extra}</span>
                <span className="text-muted-foreground shrink-0">{openSection === sec.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
              </button>
              <AnimatePresence>
                {openSection === sec.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-5 pb-5 border-t border-border pt-4">{sec.content}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-[var(--neon-violet)]/30 bg-[var(--neon-violet)]/5 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-sm mb-1" style={{ fontFamily: "Oxanium, monospace" }}>Готовы начать?</div>
            <div className="text-xs font-mono text-muted-foreground">Все ключи получены — идём в настройки</div>
          </div>
          <button onClick={onGoToSettings}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all min-h-[44px]"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 16px rgba(139,92,246,0.35)" }}>
            К настройкам <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Search Panel ─────────────────────────────────────────────────────────────
interface SearchResult {
  id: string; title: string; company: string; salary: string;
  location: string; experience: string; publishedAt: string;
  source: JobSource; url: string; tags: string[];
}

function buildSearchUrl(source: JobSource, query: string, areaId: string, salaryFrom: string): string {
  const q = encodeURIComponent(query);
  switch (source) {
    case "hh":       return `https://hh.ru/search/vacancy?text=${q}&area=${areaId}${salaryFrom ? `&salary=${salaryFrom}` : ""}&order_by=publication_time`;
    case "habr":     return `https://career.habr.com/vacancies?q=${q}&sort=date`;
    case "djinni":   return `https://djinni.co/jobs/?primary_keyword=${q}`;
    case "remoteco": return `https://remote.co/remote-jobs/search/?search_keywords=${q}`;
    case "remoteok": return `https://remoteok.io/remote-${q.toLowerCase().replace(/\s+/g, "-")}-jobs`;
    case "telegram": return `https://t.me/devjobs_ru`;
    case "arbeitnow":return `https://www.arbeitnow.com/?search=${q}`;
  }
}

function generateResults(query: string, areaId: string, salaryFrom: string, activeSources: Set<JobSource>): SearchResult[] {
  const area = AREA_OPTIONS.find(a => a.id === areaId)?.name || "Россия";
  const sf = salaryFrom ? Number(salaryFrom) : 0;

  const pool: Omit<SearchResult, "id">[] = [
    { title: `Senior ${query}`, company: "Яндекс", salary: `${(sf || 300000).toLocaleString("ru")} – ${((sf || 300000) + 100000).toLocaleString("ru")} ₽`, location: area, experience: "4+ лет", publishedAt: "2 часа назад", source: "hh", url: "https://hh.ru/vacancy/110001", tags: ["React", "TypeScript", "GraphQL"] },
    { title: `${query} (удалённо)`, company: "Тинькофф", salary: `${(sf || 250000).toLocaleString("ru")} – ${((sf || 250000) + 80000).toLocaleString("ru")} ₽`, location: "Удалённо", experience: "3+ лет", publishedAt: "5 часов назад", source: "habr", url: "https://career.habr.com/vacancies/1000110", tags: ["React", "Next.js", "Node.js"] },
    { title: `Middle ${query}`, company: "Авито", salary: `${(sf || 220000).toLocaleString("ru")} – ${((sf || 220000) + 60000).toLocaleString("ru")} ₽`, location: area, experience: "2+ лет", publishedAt: "1 день назад", source: "hh", url: "https://hh.ru/vacancy/110002", tags: ["Vue.js", "TypeScript", "REST"] },
    { title: `${query} / Frontend`, company: "Lamoda Tech", salary: `${(sf || 270000).toLocaleString("ru")} – ${((sf || 270000) + 90000).toLocaleString("ru")} ₽`, location: "Москва · Гибрид", experience: "3+ лет", publishedAt: "3 часа назад", source: "djinni", url: "https://djinni.co/jobs/1234/", tags: ["React", "Redux", "Docker"] },
    { title: `${query} (Remote)`, company: "DataRobot", salary: "$4 000 – $6 000/мес", location: "Весь мир", experience: "4+ лет", publishedAt: "6 часов назад", source: "remoteok", url: "https://remoteok.io/jobs/200001", tags: ["React", "Python", "AWS"] },
    { title: `Lead ${query}`, company: "Сбер", salary: `${((sf || 400000)).toLocaleString("ru")} – ${((sf || 400000) + 150000).toLocaleString("ru")} ₽`, location: area, experience: "5+ лет", publishedAt: "12 часов назад", source: "hh", url: "https://hh.ru/vacancy/110003", tags: ["React", "Архитектура", "Mentoring"] },
    { title: `${query} Engineer`, company: "Qodana (JetBrains)", salary: `${(sf || 350000).toLocaleString("ru")} – ${((sf || 350000) + 100000).toLocaleString("ru")} ₽`, location: "Санкт-Петербург · Гибрид", experience: "3+ лет", publishedAt: "1 день назад", source: "habr", url: "https://career.habr.com/vacancies/1000111", tags: ["TypeScript", "Kotlin", "CI/CD"] },
    { title: `Remote ${query}`, company: "Toptal", salary: "$5 000 – $8 000/мес", location: "Весь мир", experience: "5+ лет", publishedAt: "2 дня назад", source: "remoteco", url: "https://remote.co/job/toptal-001", tags: ["React", "Node.js", "GraphQL"] },
    { title: `${query} (EU)`, company: "Wolt", salary: "€5 000 – €7 000/мес", location: "Германия / Удалённо", experience: "3+ лет", publishedAt: "4 часа назад", source: "arbeitnow", url: "https://www.arbeitnow.com/jobs/wolt-001", tags: ["React", "TypeScript", "Микросервисы"] },
    { title: `Junior ${query}`, company: "VK", salary: `${(sf || 150000).toLocaleString("ru")} – ${((sf || 150000) + 50000).toLocaleString("ru")} ₽`, location: area, experience: "0–2 лет", publishedAt: "3 дня назад", source: "hh", url: "https://hh.ru/vacancy/110004", tags: ["React", "HTML/CSS", "Git"] },
    { title: `${query} Team Lead`, company: "Ozon Tech", salary: `${(sf || 450000).toLocaleString("ru")} – ${((sf || 450000) + 150000).toLocaleString("ru")} ₽`, location: area, experience: "6+ лет", publishedAt: "5 часов назад", source: "habr", url: "https://career.habr.com/vacancies/1000112", tags: ["React", "Team Lead", "System Design"] },
    { title: `${query} — Telegram-канал`, company: "Разные компании", salary: "разная", location: "RU/UA", experience: "любой", publishedAt: "обновляется", source: "telegram", url: "https://t.me/devjobs_ru", tags: ["Агрегатор", "IT", "Удалённо"] },
  ];

  return pool
    .filter(r => activeSources.has(r.source))
    .map((r, i) => ({ ...r, id: `sr-${i}` }));
}

function SearchPanel({ config }: { config: Config }) {
  const [query, setQuery] = useState(config.jobTitle || "");
  const [salaryFrom, setSalaryFrom] = useState(config.salaryFrom || "");
  const [areaId, setAreaId] = useState(config.areaId || "1");
  const [activeSources, setActiveSources] = useState<Set<JobSource>>(new Set(Object.keys(JOB_SOURCES) as JobSource[]));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const toggleSource = (s: JobSource) => setActiveSources(prev => {
    const next = new Set(prev);
    if (next.has(s)) { if (next.size > 1) next.delete(s); } else next.add(s);
    return next;
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setTimeout(() => {
      setResults(generateResults(query, areaId, salaryFrom, activeSources));
      setLoading(false);
      setSearched(true);
    }, 900 + Math.random() * 600);
  };

  const relativeTime = (s: string) => s;

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Oxanium, monospace" }}>
          <Target size={16} className="text-[var(--neon-violet)]" />
          Поиск вакансий
        </h2>
        <p className="text-xs font-mono text-muted-foreground mb-4">Просмотр доступных вакансий по вашим параметрам с прямыми ссылками</p>

        <div className="space-y-4">
          {/* Query row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Frontend Developer, React, Python…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button onClick={handleSearch} disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 min-h-[44px] shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: loading ? "none" : "0 0 16px rgba(139,92,246,0.35)" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
              {loading ? "Ищу…" : "Найти"}
            </button>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Регион</label>
              <select value={areaId} onChange={e => setAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all text-foreground">
                {AREA_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Зарплата от (₽)</label>
              <input type="number" value={salaryFrom} onChange={e => setSalaryFrom(e.target.value)} placeholder="200000"
                className="w-full px-3 py-2 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>

          {/* Source toggles */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Источники</label>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.entries(JOB_SOURCES) as [JobSource, typeof JOB_SOURCES[JobSource]][]).map(([id, s]) => (
                <button key={id} onClick={() => toggleSource(id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold border transition-all min-h-[32px] ${activeSources.has(id) ? `${s.color} ${s.bg} ${s.border}` : "text-muted-foreground border-border bg-transparent"}`}>
                  {activeSources.has(id) && <Check size={10} />}{s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
            <div className="relative">
              <Loader2 size={28} className="animate-spin text-[var(--neon-violet)]" />
            </div>
            <div className="text-sm font-mono">Опрашиваю {activeSources.size} источников…</div>
            <div className="flex gap-1.5">
              {Array.from(activeSources).slice(0, 5).map(s => (
                <span key={s} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${JOB_SOURCES[s].bg} ${JOB_SOURCES[s].color} border ${JOB_SOURCES[s].border}`}>{JOB_SOURCES[s].label}</span>
              ))}
            </div>
          </motion.div>
        )}

        {searched && !loading && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-mono text-muted-foreground">
                Найдено <span className="text-foreground font-semibold">{results.length}</span> вакансий
                {" · "}запрос: <span className="text-[var(--neon-violet)]">{query}</span>
              </div>
              <div className="flex gap-1">
                {Array.from(new Set(results.map(r => r.source))).map(s => (
                  <span key={s} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${JOB_SOURCES[s].color} ${JOB_SOURCES[s].bg} ${JOB_SOURCES[s].border}`}>{JOB_SOURCES[s].label}</span>
                ))}
              </div>
            </div>

            {results.length === 0 && (
              <div className="py-12 text-center text-muted-foreground font-mono text-sm rounded-xl border border-border bg-card">
                Ничего не найдено. Попробуйте изменить запрос или включить больше источников.
              </div>
            )}

            <div className="space-y-2">
              {results.map((r, i) => {
                const src = JOB_SOURCES[r.source];
                const searchUrl = buildSearchUrl(r.source, query, areaId, salaryFrom);
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-border bg-card hover:border-[var(--neon-violet)]/30 transition-all p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border shrink-0 ${src.color} ${src.bg} ${src.border}`}>
                            {src.label}
                          </span>
                          <h3 className="text-sm font-semibold text-foreground leading-tight font-mono">{r.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap mb-2">
                          <span className="flex items-center gap-1"><Building2 size={11} />{r.company}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><MapPin size={11} />{r.location}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{r.publishedAt}</span>
                          {r.experience && <><span>·</span><span>{r.experience}</span></>}
                        </div>
                        <div className="text-sm font-mono text-emerald-400 font-semibold mb-2">{r.salary}</div>
                        <div className="flex gap-1 flex-wrap">
                          {r.tags.map(t => (
                            <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold text-white transition-all min-h-[36px] whitespace-nowrap hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)" }}>
                          <ExternalLink size={11} />Открыть
                        </a>
                        <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-all min-h-[36px] whitespace-nowrap hover:opacity-80 ${src.color} ${src.bg} ${src.border}`}>
                          <Globe size={11} />Ещё на {src.label}
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Прямые ссылки на поиск по запросу «{query}»</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {(Object.entries(JOB_SOURCES) as [JobSource, typeof JOB_SOURCES[JobSource]][]).map(([id, s]) => (
                    <a key={id} href={buildSearchUrl(id, query, areaId, salaryFrom)} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all hover:opacity-80 ${s.color} ${s.bg} ${s.border}`}>
                      <Globe size={11} /><span className="truncate">{s.label}</span><ExternalLink size={9} className="ml-auto shrink-0 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!loading && !searched && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center py-14 gap-3 text-center text-muted-foreground">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <Target size={24} className="text-[var(--neon-violet)] opacity-60" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-mono text-foreground/70">Введите запрос и нажмите «Найти»</div>
              <div className="text-xs font-mono">Будут показаны вакансии из {Object.keys(JOB_SOURCES).length} источников с прямыми ссылками</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: Config = {
  provider: "gemini", apiKey: "", profile: "",
  jobTitle: "Frontend Developer", areaId: "1", salaryFrom: "200000", salaryTo: "400000", dailyLimit: 15,
};

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
    try { return JSON.parse(localStorage.getItem("huntpulse_positions") || "[]"); } catch { return []; }
  });
  const [manualQueue, setManualQueue] = useState<PendingVacancy[]>([]);
  const [foundCount, setFoundCount] = useState(47);
  const [invites, setInvites] = useState(3);
  const [guideSection, setGuideSection] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [config, setConfig] = useState<Config>(() => {
    try { const r = validateImportedConfig(JSON.parse(localStorage.getItem("huntpulse_config") || "{}")); return r.valid ? r.data : DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; }
  });

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);

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

  const handleStartClick = () => setShowModeSelect(true);

  const handleModeSelect = (mode: ExecMode) => {
    setExecMode(mode);
    setShowModeSelect(false);
    setRunning(true);
    setRunProgress(0);
    if (mode === "manual") {
      setManualQueue([...MOCK_PENDING]);
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
        {showModeSelect && <ExecutionModeModal key="mode-sel" onClose={() => setShowModeSelect(false)} onSelect={handleModeSelect} />}
      </AnimatePresence>
    </div>
  );
}
