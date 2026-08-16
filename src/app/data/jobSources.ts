import type { JobSource } from "../domain/types";

export type SourceAccess = "public-api" | "rss" | "external-search";
export type SourceAudience = "general" | "tech" | "creative" | "freelance" | "remote" | "government";

export interface JobSourceDefinition {
  label: string;
  homeUrl: string;
  color: string;
  bg: string;
  border: string;
  geo: string;
  description: string;
  access: SourceAccess;
  audience: SourceAudience;
  buildSearchUrl: (query: string, areaId: string, salaryFrom: string) => string;
}

const encoded = (query: string) => encodeURIComponent(query.trim());
const external = (template: string) => (query: string) => template.replace("{q}", encoded(query));
const styles = {
  red: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  sky: { color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30" },
  violet: { color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/30" },
  cyan: { color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
  emerald: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  orange: { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  amber: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  blue: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  indigo: { color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/30" },
  green: { color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  slate: { color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30" },
  purple: { color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  pink: { color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/30" },
} as const;
const style = (color: keyof typeof styles) => styles[color];

export const JOB_SOURCES: Record<JobSource, JobSourceDefinition> = {
  hh: { label: "HH.ru", homeUrl: "https://hh.ru", ...style("red"), geo: "RU/CIS", description: "Универсальные вакансии и резюме.", access: "public-api", audience: "general", buildSearchUrl: (q, area, salary) => `https://hh.ru/search/vacancy?text=${encoded(q)}&area=${area}${salary ? `&salary=${encodeURIComponent(salary)}` : ""}` },
  habr: { label: "Habr Career", homeUrl: "https://career.habr.com", ...style("sky"), geo: "RU", description: "IT и digital.", access: "external-search", audience: "tech", buildSearchUrl: external("https://career.habr.com/vacancies?q={q}") },
  geekjob: { label: "GeekJob", homeUrl: "https://geekjob.ru", ...style("violet"), geo: "RU", description: "IT и digital-вакансии.", access: "external-search", audience: "tech", buildSearchUrl: external("https://geekjob.ru/vacancies?qs={q}") },
  finder: { label: "Finder.work", homeUrl: "https://finder.work", ...style("cyan"), geo: "RU/Remote", description: "Digital и удалённая работа.", access: "external-search", audience: "tech", buildSearchUrl: external("https://finder.work/vacancies?search={q}") },
  superjob: { label: "SuperJob", homeUrl: "https://superjob.ru", ...style("emerald"), geo: "RU", description: "Универсальный российский поиск.", access: "external-search", audience: "general", buildSearchUrl: external("https://www.superjob.ru/vakansii/?keywords={q}") },
  rabota: { label: "Работа.ру", homeUrl: "https://rabota.ru", ...style("orange"), geo: "RU", description: "Универсальные вакансии.", access: "external-search", audience: "general", buildSearchUrl: external("https://www.rabota.ru/vacancy/?query={q}") },
  zarplata: { label: "Зарплата.ру", homeUrl: "https://zarplata.ru", ...style("amber"), geo: "RU", description: "Универсальные вакансии по России.", access: "external-search", audience: "general", buildSearchUrl: external("https://zarplata.ru/vacancy?text={q}") },
  trudvsem: { label: "Работа России", homeUrl: "https://trudvsem.ru", ...style("blue"), geo: "RU", description: "Государственная база вакансий.", access: "external-search", audience: "government", buildSearchUrl: external("https://trudvsem.ru/vacancy/search?_title={q}") },
  linkedin: { label: "LinkedIn Jobs", homeUrl: "https://linkedin.com/jobs", ...style("blue"), geo: "World", description: "Международные вакансии.", access: "external-search", audience: "general", buildSearchUrl: external("https://www.linkedin.com/jobs/search/?keywords={q}") },
  indeed: { label: "Indeed", homeUrl: "https://indeed.com", ...style("indigo"), geo: "World", description: "Международный агрегатор.", access: "external-search", audience: "general", buildSearchUrl: external("https://www.indeed.com/jobs?q={q}") },
  glassdoor: { label: "Glassdoor", homeUrl: "https://glassdoor.com", ...style("green"), geo: "World", description: "Вакансии и сведения о работодателях.", access: "external-search", audience: "general", buildSearchUrl: external("https://www.glassdoor.com/Job/jobs.htm?sc.keyword={q}") },
  wellfound: { label: "Wellfound", homeUrl: "https://wellfound.com/jobs", ...style("slate"), geo: "World", description: "Стартапы и технологические команды.", access: "external-search", audience: "tech", buildSearchUrl: external("https://wellfound.com/jobs?query={q}") },
  usajobs: { label: "USAJOBS", homeUrl: "https://usajobs.gov", ...style("blue"), geo: "USA", description: "Государственные вакансии США.", access: "external-search", audience: "government", buildSearchUrl: external("https://www.usajobs.gov/Search/Results?k={q}") },
  eures: { label: "EURES", homeUrl: "https://eures.europa.eu", ...style("blue"), geo: "EU", description: "Официальная сеть занятости ЕС.", access: "external-search", audience: "government", buildSearchUrl: external("https://eures.europa.eu/eures/portal/jv-se/search?page=1&resultsPerPage=10&keywords={q}") },
  jooble: { label: "Jooble", homeUrl: "https://jooble.org", ...style("purple"), geo: "World", description: "Международный агрегатор.", access: "external-search", audience: "general", buildSearchUrl: external("https://jooble.org/SearchResult?ukw={q}") },
  djinni: { label: "Djinni", homeUrl: "https://djinni.co", ...style("violet"), geo: "UA/EU/Remote", description: "IT и продуктовые вакансии.", access: "external-search", audience: "tech", buildSearchUrl: external("https://djinni.co/jobs/?primary_keyword={q}") },
  remoteco: { label: "Remote.co", homeUrl: "https://remote.co", ...style("emerald"), geo: "World", description: "Удалённая работа разных направлений.", access: "rss", audience: "remote", buildSearchUrl: external("https://remote.co/remote-jobs/search/?search_keywords={q}") },
  remoteok: { label: "Remote OK", homeUrl: "https://remoteok.com", ...style("amber"), geo: "World", description: "Международная удалённая работа.", access: "public-api", audience: "remote", buildSearchUrl: external("https://remoteok.com/remote-{q}-jobs") },
  remotive: { label: "Remotive", homeUrl: "https://remotive.com", ...style("violet"), geo: "World", description: "Удалённые вакансии.", access: "public-api", audience: "remote", buildSearchUrl: external("https://remotive.com/remote-jobs?search={q}") },
  weworkremotely: { label: "We Work Remotely", homeUrl: "https://weworkremotely.com", ...style("purple"), geo: "World", description: "Удалённая работа.", access: "rss", audience: "remote", buildSearchUrl: external("https://weworkremotely.com/remote-jobs/search?term={q}") },
  arbeitnow: { label: "Arbeitnow", homeUrl: "https://arbeitnow.com", ...style("pink"), geo: "EU/World", description: "Европейские и удалённые вакансии.", access: "public-api", audience: "general", buildSearchUrl: external("https://www.arbeitnow.com/?search={q}") },
  behance: { label: "Behance Jobs", homeUrl: "https://behance.net/joblist", ...style("blue"), geo: "World", description: "Дизайн и креативные профессии.", access: "external-search", audience: "creative", buildSearchUrl: external("https://www.behance.net/joblist?search={q}") },
  dribbble: { label: "Dribbble Jobs", homeUrl: "https://dribbble.com/jobs", ...style("pink"), geo: "World", description: "Дизайн и creative tech.", access: "external-search", audience: "creative", buildSearchUrl: external("https://dribbble.com/jobs?search={q}") },
  artstation: { label: "ArtStation Jobs", homeUrl: "https://artstation.com/jobs", ...style("cyan"), geo: "World", description: "2D/3D, game art и иллюстрация.", access: "external-search", audience: "creative", buildSearchUrl: () => "https://www.artstation.com/jobs" },
  upwork: { label: "Upwork", homeUrl: "https://upwork.com", ...style("green"), geo: "World", description: "Международный фриланс.", access: "external-search", audience: "freelance", buildSearchUrl: external("https://www.upwork.com/nx/search/jobs/?q={q}") },
  freelancer: { label: "Freelancer", homeUrl: "https://freelancer.com", ...style("sky"), geo: "World", description: "Фриланс-проекты разных направлений.", access: "external-search", audience: "freelance", buildSearchUrl: external("https://www.freelancer.com/jobs/?keyword={q}") },
  kwork: { label: "Kwork", homeUrl: "https://kwork.ru", ...style("emerald"), geo: "RU/CIS", description: "Фриланс и проектная работа.", access: "external-search", audience: "freelance", buildSearchUrl: external("https://kwork.ru/projects?keyword={q}") },
  telegram: { label: "Telegram", homeUrl: "https://t.me", ...style("cyan"), geo: "World", description: "Ручной поиск по публичным каналам.", access: "external-search", audience: "general", buildSearchUrl: external("https://www.google.com/search?q=site%3At.me+{q}+вакансия") },
};

export const SOURCE_GROUP_LABELS: Record<SourceAudience, string> = {
  general: "Универсальные", tech: "IT и digital", creative: "Дизайн и искусство",
  freelance: "Фриланс", remote: "Удалённая работа", government: "Государственные",
};
