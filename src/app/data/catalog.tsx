import { JOB_SOURCES as BASE_JOB_SOURCES, type JobSourceDefinition } from "./jobSources";

const atsSource = (label: string, homeUrl: string, color: string): JobSourceDefinition => ({
  label,
  homeUrl,
  color,
  bg: "bg-slate-400/10",
  border: "border-slate-400/30",
  geo: "World",
  description: "Публичные вакансии работодателей через ATS career feeds.",
  access: "public-api",
  audience: "general",
  buildSearchUrl: () => homeUrl,
});

export const JOB_SOURCES: Record<string, JobSourceDefinition> = {
  ...BASE_JOB_SOURCES,
  greenhouse: atsSource("Greenhouse", "https://www.greenhouse.com", "text-emerald-400"),
  lever: atsSource("Lever", "https://www.lever.co", "text-cyan-400"),
  ashby: atsSource("Ashby", "https://www.ashbyhq.com", "text-violet-400"),
  smartrecruiters: atsSource("SmartRecruiters", "https://www.smartrecruiters.com", "text-blue-400"),
  recruitee: atsSource("Recruitee", "https://recruitee.com", "text-orange-400"),
  workable: atsSource("Workable", "https://www.workable.com", "text-sky-400"),
  jobicy: atsSource("Jobicy", "https://jobicy.com", "text-purple-400"),
};

export const AREA_OPTIONS = [
  { id: "1", name: "Москва" },
  { id: "2", name: "Санкт-Петербург" },
  { id: "113", name: "Россия (вся)" },
  { id: "0", name: "Удалённо / Весь мир" },
];
