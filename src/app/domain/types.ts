export type Theme = "dark" | "light";
export type Tab = "dashboard" | "config" | "history" | "settings" | "guide";
export type AppStatus = "Отправлено" | "В процессе" | "Ошибка" | "Пропущено";
export type Provider = "gemini" | "groq" | "openrouter";
export type ExecMode = "auto" | "manual";

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

export type JobSource =
  | "hh" | "habr" | "geekjob" | "finder" | "superjob" | "rabota" | "zarplata" | "trudvsem"
  | "linkedin" | "indeed" | "glassdoor" | "wellfound" | "usajobs" | "eures" | "jooble"
  | "djinni" | "remoteco" | "remoteok" | "remotive" | "weworkremotely" | "arbeitnow"
  | "behance" | "dribbble" | "artstation" | "upwork" | "freelancer" | "kwork" | "telegram";

export interface AppRecord {
  id: string; vacancyId: string; title: string; company: string;
  salary: string; date: string; status: AppStatus; letter: string; url: string;
  source?: JobSource;
}

export interface PendingVacancy {
  id: string; title: string; company: string; salary: string;
  location: string; experience: string; description: string;
  skills: string[]; letter: string; url: string;
}

export interface Config {
  provider: Provider; apiKey: string; profile: string;
  jobTitle: string; areaId: string; salaryFrom: string; salaryTo: string; dailyLimit: number;
}
