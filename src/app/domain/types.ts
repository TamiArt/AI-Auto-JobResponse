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

export interface CareerSkill {
  id: string;
  name: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  confidence: "confirmed" | "inferred" | "unknown";
}

export interface CareerExperience {
  id: string;
  company: string;
  role: string;
  period: string;
  summary: string;
  technologies: string[];
}

export interface CareerProject {
  id: string;
  name: string;
  description: string;
  url?: string;
  technologies: string[];
}

export interface CareerProfile {
  name: string;
  headline: string;
  targetRoles: string[];
  location: string;
  workMode: "remote" | "hybrid" | "onsite" | "any";
  salary: string;
  languages: string[];
  skills: CareerSkill[];
  experience: CareerExperience[];
  projects: CareerProject[];
  goals: string[];
  constraints: string[];
  updatedAt: string;
}

export type AiTask =
  | "analyze-job"
  | "tailor-resume"
  | "cover-letter"
  | "skill-gap"
  | "interview";

export type AiMode = "gemini-api" | "open-chat";

export interface AiPackage {
  task: AiTask;
  profile: CareerProfile;
  job: {
    title: string;
    company?: string;
    description: string;
    url?: string;
  };
  instructions: string;
}
