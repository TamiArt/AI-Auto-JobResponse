import { useCallback, useEffect, useState, type JSX } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, BriefcaseBusiness, Bot, Moon, Settings, Sun, Target, UserRound, Zap, Sparkles } from "lucide-react";
import { Toaster } from "sonner";
import type { CareerProfile, Config, ExperienceFilter, Theme } from "./domain/types";
import { AREA_OPTIONS } from "./data/catalog";
import { SearchPanel } from "./features/search/SearchPanel";
import { GuideTab } from "./features/guide/GuideTab";
import { ConfigPanel } from "./features/settings/ConfigPanel";
import { CareerPanel } from "./features/career/CareerPanel";
import { AiPanel } from "./features/ai/AiPanel";
import { MatchingPanel } from "./features/matching/MatchingPanel";
import { Field } from "./shared/components";
import { loadConfig, persistConfig } from "./lib/storage";
import { EMPTY_CAREER_PROFILE, loadCareerProfile, persistCareerProfile } from "./lib/careerStorage";

type ActiveTab = "search" | "matching" | "career" | "ai" | "guide" | "settings";

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceFilter; label: string }> = [
  { value: "any", label: "Любой опыт" },
  { value: "noExperience", label: "Без опыта" },
  { value: "between1And3", label: "1–3 года" },
  { value: "between3And6", label: "3–6 лет" },
  { value: "moreThan6", label: "Более 6 лет" },
];

function AppIcon({ className = "h-7 w-7" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={`${className} flex items-center justify-center rounded-lg`} style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)" }} aria-hidden="true"><Zap size={14} className="text-white" /></span>;
  return <img src="/icon.png" alt="" className={`${className} rounded-lg object-cover`} onError={() => setFailed(true)} aria-hidden="true" />;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>("light");
  const [tab, setTab] = useState<ActiveTab>("search");
  const [guideSection, setGuideSection] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>(loadConfig);
  const [career, setCareer] = useState<CareerProfile>(loadCareerProfile);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  const saveConfig = useCallback((next: Config) => { setConfig(next); persistConfig(next); }, []);
  const saveCareer = useCallback((next: CareerProfile) => { setCareer(next); persistCareerProfile(next); }, []);
  const updateConfig = (partial: Partial<Config>) => saveConfig({ ...config, ...partial });
  const openHelp = (sectionId: string) => { setGuideSection(sectionId); setTab("guide"); };
  const navItems: { id: ActiveTab; label: string; icon: JSX.Element }[] = [
    { id: "search", label: "Поиск", icon: <Target size={16} /> },
    { id: "matching", label: "Подбор", icon: <Sparkles size={16} /> },
    { id: "career", label: "Career Graph", icon: <UserRound size={16} /> },
    { id: "ai", label: "AI Studio", icon: <Bot size={16} /> },
    { id: "guide", label: "Руководство", icon: <BookOpen size={16} /> },
    { id: "settings", label: "Настройки", icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <Toaster position="top-right" theme={theme} richColors toastOptions={{ style: { fontFamily: "JetBrains Mono, monospace", fontSize: "13px" } }} />
      <header className="relative z-10 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button type="button" onClick={() => setTab("search")} className="flex items-center gap-2.5"><AppIcon /><span className="font-bold tracking-tight" style={{ fontFamily: "Oxanium, monospace", fontSize: "1.1rem" }}>JOBOS<span className="text-[var(--neon-violet)]">_</span>AI</span></button>
          <nav className="hidden md:flex items-center gap-1" aria-label="Основная навигация">{navItems.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? "bg-secondary text-secondary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>{item.icon}{item.label}</button>)}</nav>
          <button onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground min-w-[36px] min-h-[36px] flex items-center justify-center" aria-label="Переключить тему">{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
        </div>
        <div className="md:hidden flex border-t border-border overflow-x-auto">{navItems.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`min-w-[82px] flex-1 flex flex-col items-center gap-0.5 py-2 px-2 text-[10px] font-medium ${tab === item.id ? "text-primary" : "text-muted-foreground"}`}>{item.icon}{item.label}</button>)}</div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          {tab === "search" && <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><SearchPanel config={config} /></motion.div>}
          {tab === "matching" && <motion.div key="matching" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><MatchingPanel profile={career} config={config} /></motion.div>}
          {tab === "career" && <motion.div key="career" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><CareerPanel profile={career} onChange={saveCareer} /></motion.div>}
          {tab === "ai" && <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><AiPanel profile={career} /></motion.div>}
          {tab === "guide" && <GuideTab key="guide" onGoToSettings={() => setTab("settings")} initialSection={guideSection} />}
          {tab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="max-w-3xl space-y-6">
                <div><h1 className="text-2xl font-semibold tracking-tight">Настройки поиска</h1><p className="text-sm text-muted-foreground mt-1.5 leading-6">Параметры поиска и публичные источники. Секреты не сохраняются в настройках.</p></div>
                <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
                  <Field label="Профессия по умолчанию" value={config.jobTitle} onChange={(value) => updateConfig({ jobTitle: value })} placeholder="QA-инженер, дизайнер, разработчик…" icon={<BriefcaseBusiness size={12} />} />
                  <Field label="Минимальная зарплата (₽)" value={config.salaryFrom} onChange={(value) => updateConfig({ salaryFrom: value })} placeholder="200000" type="number" />
                  <label className="block space-y-1.5"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Опыт по умолчанию</span><select value={config.experience} onChange={(event) => updateConfig({ experience: event.target.value as ExperienceFilter })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono">{EXPERIENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label className="block space-y-1.5"><span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Регион по умолчанию</span><select value={config.areaId} onChange={(event) => updateConfig({ areaId: event.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono">{AREA_OPTIONS.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
                  <label className="block space-y-1.5"><span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Публичные Telegram-каналы</span><textarea value={config.telegramChannels.join("\n")} onChange={(event) => updateConfig({ telegramChannels: event.target.value.split(/\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 10) })} rows={4} placeholder={'@channel_jobs\nhttps://t.me/another_jobs'} className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground" /><span className="block text-[10px] text-muted-foreground">До 10 публичных каналов. Это настройки источников, не авторизация Telegram.</span></label>
                </section>
                <ConfigPanel config={config} onImport={saveConfig} />
                <button type="button" onClick={() => openHelp("privacy")} className="text-xs font-mono text-muted-foreground hover:text-[var(--neon-violet)]">Как хранятся данные?</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="relative z-10 border-t border-border py-4 px-4 bg-card/60"><div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] font-mono text-muted-foreground"><span>JOBOS AI · Career Operating System</span><span>Web + Telegram Mini App ready</span></div></footer>
    </div>
  );
}
