import { useCallback, useEffect, useState, type JSX } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Moon, Settings, Sun, Target, Zap } from "lucide-react";
import { Toaster } from "sonner";
import type { Config, Theme } from "./domain/types";
import { AREA_OPTIONS } from "./data/catalog";
import { SearchPanel } from "./features/search/SearchPanel";
import { GuideTab } from "./features/guide/GuideTab";
import { ConfigPanel } from "./features/settings/ConfigPanel";
import { Field } from "./shared/components";
import { loadConfig, persistConfig } from "./lib/storage";

type ActiveTab = "search" | "guide" | "settings";

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

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [tab, setTab] = useState<ActiveTab>("search");
  const [guideSection, setGuideSection] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>(loadConfig);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const saveConfig = useCallback((next: Config) => {
    setConfig(next);
    persistConfig(next);
  }, []);

  const updateConfig = (partial: Partial<Config>) => saveConfig({ ...config, ...partial });

  const openHelp = (sectionId: string) => {
    setGuideSection(sectionId);
    setTab("guide");
  };

  const navItems: { id: ActiveTab; label: string; icon: JSX.Element }[] = [
    { id: "search", label: "Поиск", icon: <Target size={16} /> },
    { id: "guide", label: "Руководство", icon: <BookOpen size={16} /> },
    { id: "settings", label: "Настройки", icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <Toaster
        position="top-right"
        theme={theme}
        richColors
        toastOptions={{ style: { fontFamily: "JetBrains Mono, monospace", fontSize: "13px" } }}
      />

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--neon-violet) 1px, transparent 1px), linear-gradient(90deg, var(--neon-violet) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <header className="relative z-10 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button type="button" onClick={() => setTab("search")} className="flex items-center gap-2.5">
            <AppIcon />
            <span className="font-bold tracking-tight" style={{ fontFamily: "Oxanium, monospace", fontSize: "1.1rem" }}>
              HuntPulse<span className="text-[var(--neon-violet)]">_</span>AI
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1" aria-label="Основная навигация">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${tab === item.id ? "bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border border-[var(--neon-violet)]/30" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                {item.icon}{item.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-[var(--neon-violet)]/40 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Переключить тему"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div className="md:hidden flex border-t border-border">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-2 text-[10px] font-mono ${tab === item.id ? "text-[var(--neon-violet)]" : "text-muted-foreground"}`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          {tab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <SearchPanel config={config} />
            </motion.div>
          )}

          {tab === "guide" && (
            <GuideTab
              key="guide"
              onGoToSettings={() => setTab("settings")}
              initialSection={guideSection}
            />
          )}

          {tab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="max-w-2xl space-y-4">
                <div>
                  <h1 className="text-lg font-bold" style={{ fontFamily: "Oxanium, monospace" }}>Настройки поиска</h1>
                  <p className="text-xs font-mono text-muted-foreground mt-1">Здесь хранятся только локальные параметры поиска. API-ключи приложению не нужны.</p>
                </div>

                <section className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <Field
                    label="Профессия по умолчанию"
                    value={config.jobTitle}
                    onChange={(value) => updateConfig({ jobTitle: value })}
                    placeholder="QA-инженер, дизайнер, разработчик…"
                    icon={<Target size={12} />}
                  />
                  <Field
                    label="Минимальная зарплата (₽)"
                    value={config.salaryFrom}
                    onChange={(value) => updateConfig({ salaryFrom: value })}
                    placeholder="200000"
                    type="number"
                  />
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Регион по умолчанию</span>
                    <select
                      value={config.areaId}
                      onChange={(event) => updateConfig({ areaId: event.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono"
                    >
                      {AREA_OPTIONS.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                    </select>
                  </label>
                </section>

                <ConfigPanel config={config} onImport={saveConfig} />

                <button
                  type="button"
                  onClick={() => openHelp("privacy")}
                  className="text-xs font-mono text-muted-foreground hover:text-[var(--neon-violet)]"
                >
                  Как хранятся данные?
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-border py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>HuntPulse AI · поиск вакансий</span>
          <span>без платных API</span>
        </div>
      </footer>
    </div>
  );
}
