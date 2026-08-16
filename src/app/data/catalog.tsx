import type { JSX } from "react";
import { Sparkles, Cpu, Globe } from "lucide-react";
import type { AppRecord, PendingVacancy, Provider } from "../domain/types";
export { JOB_SOURCES } from "./jobSources";

// ─── Mock data ────────────────────────────────────────────────────────────────
export const MOCK_APPLICATIONS: AppRecord[] = [
  { id: "1", vacancyId: "v001", title: "QA-инженер", company: "Продуктовая команда", salary: "160 000 – 220 000 ₽", date: "2025-07-21T09:14:00", status: "Отправлено", source: "hh", letter: "Здравствуйте! У меня есть опыт функционального тестирования, подготовки тестовой документации и совместной работы с командой разработки.", url: "https://hh.ru/search/vacancy" },
  { id: "2", vacancyId: "v002", title: "Графический дизайнер", company: "Креативная студия", salary: "120 000 – 180 000 ₽", date: "2025-07-21T09:08:00", status: "Отправлено", source: "hh", letter: "Добрый день! В моём портфолио есть айдентика, рекламные материалы и дизайн для digital-продуктов. Буду рад обсудить задачу и показать релевантные проекты.", url: "https://hh.ru/search/vacancy" },
  { id: "3", vacancyId: "v003", title: "Frontend-разработчик", company: "Технологический сервис", salary: "250 000 – 320 000 ₽", date: "2025-07-21T08:55:00", status: "В процессе", source: "habr", letter: "Генерация письма...", url: "https://career.habr.com/vacancies" },
  { id: "4", vacancyId: "v004", title: "2D-иллюстратор", company: "Издательский проект", salary: "по договорённости", date: "2025-07-21T08:42:00", status: "Пропущено", source: "hh", letter: "Вакансия уже была в истории откликов.", url: "https://hh.ru/search/vacancy" },
  { id: "5", vacancyId: "v005", title: "Системный аналитик", company: "Финансовый сервис", salary: "не указана", date: "2025-07-21T08:30:00", status: "Ошибка", source: "hh", letter: "Демонстрационная ошибка источника.", url: "https://hh.ru/search/vacancy" },
];

export function createDemoQueue(jobTitle: string): PendingVacancy[] {
  const title = jobTitle.trim() || "Специалист";
  return [
    {
      id: "pv1", title, company: "Продуктовая команда", salary: "по результатам интервью",
      location: "Москва · Гибрид", experience: "3+ года", url: "https://hh.ru/search/vacancy",
      skills: ["Профильный опыт", "Командная работа", "Самостоятельность"],
      description: `Ищем специалиста на позицию «${title}». Важны релевантный опыт, ответственность, умение работать в команде и готовность показать примеры выполненных задач.`,
      letter: `Здравствуйте! Меня заинтересовала позиция «${title}». Мой профильный опыт соответствует описанию роли. Готов подробно рассказать о выполненных задачах и предоставить релевантные примеры работ.`,
    },
    {
      id: "pv2", title: `${title} · удалённо`, company: "Креативное агентство", salary: "по договорённости",
      location: "Удалённо", experience: "1–3 года", url: "https://hh.ru/search/vacancy",
      skills: ["Портфолио", "Коммуникация", "Удалённая работа"],
      description: `Удалённая позиция для специалиста «${title}». Нужны портфолио или примеры результатов, внимательность к требованиям и соблюдение сроков.`,
      letter: `Добрый день! Хочу откликнуться на позицию «${title}». Умею организовывать самостоятельную работу и соблюдать сроки. На встрече готов показать примеры, относящиеся именно к вашим задачам.`,
    },
    {
      id: "pv3", title: `Начинающий ${title}`, company: "Образовательный проект", salary: "от 70 000 ₽",
      location: "Санкт-Петербург · Удалённо", experience: "можно без опыта", url: "https://hh.ru/search/vacancy",
      skills: ["Обучаемость", "Мотивация", "Базовые навыки"],
      description: `Стартовая позиция «${title}» с наставничеством. Рассматриваем кандидатов с учебными, личными или коммерческими примерами работ.`,
      letter: `Здравствуйте! Мне интересна стартовая позиция «${title}». У меня есть базовая подготовка и высокая мотивация развиваться в этом направлении. Готов выполнить тестовое задание и показать имеющиеся работы.`,
    },
  ];
}

export const AREA_OPTIONS = [
  { id: "1", name: "Москва" }, { id: "2", name: "Санкт-Петербург" },
  { id: "113", name: "Россия (вся)" }, { id: "0", name: "Удалённо / Весь мир" },
];

export const PROVIDERS: Record<Provider, { label: string; badge: string; badgeColor: string; model: string; icon: JSX.Element; placeholder: string }> = {
  gemini: { label: "Google Gemini", badge: "Бесплатно", badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", model: "gemini-1.5-flash", icon: <Sparkles size={14} />, placeholder: "AIza..." },
  groq: { label: "Groq (Llama 3)", badge: "Бесплатно", badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", model: "llama-3.1-8b-instant", icon: <Cpu size={14} />, placeholder: "gsk_..." },
  openrouter: { label: "OpenRouter", badge: ":free модели", badgeColor: "text-violet-400 bg-violet-400/10 border-violet-400/30", model: "llama-3.1-8b:free", icon: <Globe size={14} />, placeholder: "sk-or-..." },
};
