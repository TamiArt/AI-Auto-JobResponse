export type Theme = "dark" | "light";

export type JobSource =
  | "hh" | "habr" | "geekjob" | "finder" | "superjob" | "rabota" | "zarplata" | "trudvsem"
  | "linkedin" | "indeed" | "glassdoor" | "wellfound" | "usajobs" | "eures" | "jooble"
  | "djinni" | "remoteco" | "remoteok" | "remotive" | "weworkremotely" | "arbeitnow"
  | "behance" | "dribbble" | "artstation" | "upwork" | "freelancer" | "kwork" | "telegram";

export type ExperienceFilter = "any" | "noExperience" | "between1And3" | "between3And6" | "moreThan6";

export interface Config {
  jobTitle: string;
  areaId: string;
  salaryFrom: string;
  experience: ExperienceFilter;
  telegramChannels: string[];
}
