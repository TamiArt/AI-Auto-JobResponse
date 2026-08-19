/**
 * Legacy compatibility model.
 * Эти контракты сохранены намеренно: связанные продуктовые функции отложены,
 * а не удалены. Рабочий search-flow использует `domain/types.ts`.
 */
export const DEFERRED_FEATURES = {
  aiAssistant: "Будет реализовано позже",
  hhAccountIntegration: "Будет реализовано позже",
  applicationTracker: "Будет реализовано позже",
  automaticResponses: "Будет реализовано позже",
} as const;

export type Theme = "dark" | "light";
export type Tab = "dashboard" | "config" | "history" | "settings" | "guide";
export type AppStatus = "Отправлено" | "В процессе" | "Ошибка" | "Пропущено";
export type Provider = "gemini" | "groq" | "openrouter";
export type JobSource = "hh" | "habr" | "djinni" | "remoteco" | "remoteok" | "telegram" | "arbeitnow";

/** @deprecated HH account integration будет реализована позже. */
export interface Position {
  id: string;
  hhToken: string;
  resumeId: string;
  jobTitle: string;
  salaryFrom: string;
  areaId: string;
  areaName: string;
  createdAt: string;
}

/** @deprecated Job application tracker будет реализован позже. */
export interface AppRecord {
  id: string;
  vacancyId: string;
  title: string;
  company: string;
  salary: string;
  date: string;
  status: AppStatus;
  letter: string;
  url: string;
  source?: JobSource;
}

/** @deprecated AI/auto-response settings будут реализованы позже. */
export interface Config {
  provider: Provider;
  apiKey: string;
  profile: string;
  jobTitle: string;
  areaId: string;
  salaryFrom: string;
  salaryTo: string;
  dailyLimit: number;
}

export const DEFAULT_CONFIG: Config = {
  provider: "gemini",
  apiKey: "",
  profile: "",
  jobTitle: "Тестировщик QA",
  areaId: "1",
  salaryFrom: "",
  salaryTo: "",
  dailyLimit: 15,
};

export const AREA_OPTIONS = [
  { id: "1", name: "Москва" },
  { id: "2", name: "Санкт-Петербург" },
  { id: "113", name: "Россия (вся)" },
  { id: "0", name: "Удалённо / Весь мир" },
];

export const JOB_SOURCES: Record<JobSource, {
  label: string;
  url: string;
  color: string;
  bg: string;
  border: string;
  free: boolean;
  geo: string;
  desc: string;
  rss?: string;
  api?: string;
}> = {
  hh: { label: "HH.ru", url: "https://hh.ru", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", free: true, geo: "RU", desc: "Крупнейший job-сайт РФ. Бесплатный публичный API.", rss: "https://hh.ru/search/vacancy/rss?text={q}&area={area}" },
  habr: { label: "Habr Career", url: "https://career.habr.com", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30", free: true, geo: "RU", desc: "IT-вакансии от Хабра.", api: "https://career.habr.com/api/frontend/vacancies?q={q}&sort=date" },
  djinni: { label: "Djinni.co", url: "https://djinni.co", color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/30", free: true, geo: "RU/UA", desc: "IT-платформа с публичным поиском.", rss: "https://djinni.co/jobs/rss/?primary_keyword={q}" },
  remoteco: { label: "Remote.co", url: "https://remote.co", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", free: true, geo: "World", desc: "Удалённая работа по всему миру.", rss: "https://remote.co/remote-jobs/feed/" },
  remoteok: { label: "RemoteOK", url: "https://remoteok.com", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", free: true, geo: "World", desc: "Открытый JSON API удалённых вакансий.", api: "https://remoteok.com/api" },
  telegram: { label: "Telegram", url: "https://t.me", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30", free: true, geo: "RU", desc: "Публичные Telegram-каналы с вакансиями." },
  arbeitnow: { label: "Arbeitnow", url: "https://www.arbeitnow.com", color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/30", free: true, geo: "EU/World", desc: "Открытый API международных вакансий.", api: "https://www.arbeitnow.com/api/job-board-api" },
};

/**
 * @deprecated Legacy import format сохранён для будущей миграции настроек.
 * Никакие секреты из этой модели не используются рабочим поиском.
 */
export function validateImportedConfig(raw: unknown): { valid: true; data: Config } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { valid: false, error: "Файл должен содержать JSON-объект" };
  const value = raw as Record<string, unknown>;
  const providers: Provider[] = ["gemini", "groq", "openrouter"];
  if (value.provider && !providers.includes(value.provider as Provider)) return { valid: false, error: `Неизвестный провайдер: "${value.provider}"` };
  return {
    valid: true,
    data: {
      provider: (value.provider as Provider) || DEFAULT_CONFIG.provider,
      apiKey: String(value.apiKey ?? ""),
      profile: String(value.profile ?? ""),
      jobTitle: String(value.jobTitle ?? DEFAULT_CONFIG.jobTitle),
      areaId: String(value.areaId ?? DEFAULT_CONFIG.areaId),
      salaryFrom: String(value.salaryFrom ?? ""),
      salaryTo: String(value.salaryTo ?? ""),
      dailyLimit: Number(value.dailyLimit ?? DEFAULT_CONFIG.dailyLimit),
    },
  };
}
