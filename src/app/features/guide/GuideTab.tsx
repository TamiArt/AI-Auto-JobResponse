import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, ChevronDown, ChevronUp, Globe, History, Hourglass, Search, Settings, Shield } from "lucide-react";

const GUIDE_ALIASES: Record<string, string> = {
  gemini: "later", groq: "later", openrouter: "later", hhtoken: "later",
  profile: "privacy", resumeid: "later", sources: "search", flow: "architecture",
};

function resolveSection(section?: string | null): string {
  if (!section) return "status";
  return GUIDE_ALIASES[section] ?? section;
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 p-3 text-xs font-mono text-amber-300">{children}</div>;
}

function DeferredItem({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-[11px] font-mono text-amber-300">Будет реализовано позже</div>
    </div>
  );
}

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
          <p>Можно искать вакансии, открывать объявления, сохранять избранное, повторять последние запросы и загружать следующие страницы HH.</p>
          <Notice>Функции AI, HH-аккаунта и трекера откликов не имитируют работу: они сохранены в техническом backlog и будут реализованы позже.</Notice>
        </div>
      ),
    },
    {
      id: "search",
      icon: <Search size={16} />,
      title: "Источники и поиск",
      content: (
        <div className="space-y-3 text-sm text-foreground/75 leading-relaxed">
          <p>Поиск объединяет «Работа России», HH.ru, Arbeitnow, Remote OK, We Work Remotely, Jobicy, Remotive и публичные career ATS работодателей.</p>
          <p>ATS-слой поддерживает Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee и Workable. Работодатели хранятся в отдельном реестре.</p>
          <p>Remote feeds и ATS на Vercel получают query-независимый snapshot, а фильтрация поискового текста выполняется после получения snapshot. Это не создаёт отдельное upstream-refresh окно для каждого запроса.</p>
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
          <p>Для текущего поиска не нужны HH access token, Resume ID или AI API key. BFF обращается только к публичным источникам вакансий и не принимает пароли пользователя.</p>
          <p>Настройки поиска, история запросов и избранное хранятся локально в браузере.</p>
          <Notice>Не вводите секреты сторонних сервисов: текущему поисковому приложению они не нужны.</Notice>
        </div>
      ),
    },
    {
      id: "later",
      icon: <Hourglass size={16} />,
      title: "Будет реализовано позже",
      content: (
        <div className="space-y-3 text-sm text-foreground/75 leading-relaxed">
          <p>Эти функции не удалены из технического плана, но сейчас отключены, чтобы не показывать пользователю фиктивное поведение.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DeferredItem title="AI-помощник для черновика отклика" />
            <DeferredItem title="HH OAuth и выбор резюме" />
            <DeferredItem title="Трекер откликов и интервью" />
            <DeferredItem title="Сохранённые поиски и мониторинг" />
          </div>
          <Notice>Автоматическая отправка отклика появится только после отдельного проектирования безопасного официального flow.</Notice>
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
          <p>ATS работодателей опрашиваются с ограничением параллелизма. Ошибка одного работодателя не должна ломать общий поиск.</p>
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
          <p className="text-xs font-mono text-muted-foreground">Рабочие возможности и честный статус отложенных функций.</p>
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
