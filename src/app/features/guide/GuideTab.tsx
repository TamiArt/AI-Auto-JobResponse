import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Globe, History, Search, Settings, Shield } from "lucide-react";

const GUIDE_ALIASES: Record<string, string> = {
  gemini: "status", groq: "status", openrouter: "status", hhtoken: "privacy",
  profile: "privacy", resumeid: "privacy", sources: "search", flow: "architecture",
};

function resolveSection(section?: string | null): string {
  if (!section) return "status";
  return GUIDE_ALIASES[section] ?? section;
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 p-3 text-xs font-mono text-amber-300">{children}</div>;
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
export function GuideTab({ onGoToSettings, initialSection }: { onGoToSettings: () => void; initialSection?: string | null }) {
  const [openSection, setOpenSection] = useState<string | null>(() => resolveSection(initialSection));

  useEffect(() => {
    if (initialSection) setOpenSection(resolveSection(initialSection));
  }, [initialSection]);

  const sections = [
    {
      id: "status",
      icon: <BookOpen size={16} />,
      title: "Что работает сейчас",
      content: (
        <div className="space-y-3 text-sm text-foreground/75 leading-relaxed">
          <p><strong>Основной продукт — реальный поиск вакансий.</strong> Приложение открывается сразу на поиске и не требует настройки AI, токенов или автоматических откликов.</p>
          <p>Можно искать вакансии, открывать оригинальные объявления, сохранять избранное, повторять последние запросы и загружать следующие страницы HH.</p>
          <Notice>Неработающие AI-генерация и автоматическая отправка откликов удалены из основного интерфейса и не участвуют в поисковом сценарии.</Notice>
        </div>
      ),
    },
    {
      id: "search",
      icon: <Search size={16} />,
      title: "Источники и поиск",
      content: (
        <div className="space-y-3 text-sm text-foreground/75 leading-relaxed">
          <p>Поиск объединяет «Работа России», HH.ru, Arbeitnow, Remote OK, We Work Remotely и прямые публичные career feeds работодателей.</p>
          <p>ATS-слой сейчас поддерживает Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee и Workable. Работодатели хранятся в отдельном реестре, поэтому новые компании можно добавлять без изменения React-компонентов.</p>
          <p>Каждая вакансия хранит оригинальную публичную ссылку конкретного объявления. Результат без безопасного `http/https` URL отбрасывается до UI.</p>
          <Notice>HH.ru может потребовать CAPTCHA для неавторизованных запросов. HuntPulse не обходит CAPTCHA и не зависит от одного HH.</Notice>
        </div>
      ),
    },
    {
      id: "privacy",
      icon: <Shield size={16} />,
      title: "Данные и приватность",
      content: (
        <div className="space-y-3 text-sm text-foreground/75 leading-relaxed">
          <p>Для поиска не нужны HH access token, Resume ID или AI API key. BFF обращается только к публичным источникам вакансий и не принимает пароли пользователя.</p>
          <p>Настройки поиска, история запросов и избранное хранятся локально в браузере. JSON-экспорт не переносит API-ключи.</p>
          <Notice>Не вводите секреты сторонних сервисов: текущему поисковому приложению они не нужны.</Notice>
        </div>
      ),
    },
    {
      id: "architecture",
      icon: <Globe size={16} />,
      title: "Надёжность и архитектура",
      content: (
        <div className="space-y-3 text-sm text-foreground/75 leading-relaxed">
          <p>Источники подключены отдельными adapters, BFF-нормализация вынесена в pure-модули, а frontend проверяет runtime-контракт каждой вакансии.</p>
          <p>ATS работодателей опрашиваются с ограничением параллелизма и отдельным cache на каждый board. Ошибка одного работодателя не должна ломать общий поиск.</p>
          <p>Контрактные тесты запускаются встроенным `node:test`, поэтому не требуют новых npm-библиотек или платных сервисов.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            <div className="rounded-lg border border-border bg-muted/40 p-3"><Search size={13} className="mb-2" />Источники независимо</div>
            <div className="rounded-lg border border-border bg-muted/40 p-3"><History size={13} className="mb-2" />История локально</div>
            <div className="rounded-lg border border-border bg-muted/40 p-3"><Settings size={13} className="mb-2" />BFF без зависимостей</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <motion.div key="guide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <div className="max-w-2xl">
        <div className="mb-5">
          <h1 className="text-lg font-bold mb-1" style={{ fontFamily: "Oxanium, monospace" }}>Руководство</h1>
          <p className="text-xs font-mono text-muted-foreground">Только фактически работающие возможности текущей версии.</p>
        </div>

        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors min-h-[56px]">
                <span className="text-[var(--neon-violet)]">{section.icon}</span>
                <span className="flex-1 text-sm font-semibold" style={{ fontFamily: "Oxanium, monospace" }}>{section.title}</span>
                {openSection === section.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              <AnimatePresence>
                {openSection === section.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-5 pb-5 border-t border-border pt-4">{section.content}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-[var(--neon-violet)]/30 bg-[var(--neon-violet)]/5 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-sm mb-1" style={{ fontFamily: "Oxanium, monospace" }}>Параметры поиска</div>
            <div className="text-xs font-mono text-muted-foreground">Сохраните профессию, зарплату и регион по умолчанию.</div>
          </div>
          <button onClick={onGoToSettings}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all min-h-[44px]"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)" }}>
            К настройкам <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
