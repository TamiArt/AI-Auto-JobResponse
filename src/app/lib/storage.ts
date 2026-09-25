import type { Config, EmploymentTypeFilter, ExperienceFilter, SalaryCurrency, WorkModeFilter } from "../domain/types";

const CONFIG_STORAGE_KEY = "huntpulse_config";
const EXPERIENCE_VALUES = new Set<ExperienceFilter>(["any", "noExperience", "between1And3", "between3And6", "moreThan6"]);
const WORK_MODE_VALUES = new Set<WorkModeFilter>(["any", "remote", "hybrid", "onsite"]);
const EMPLOYMENT_VALUES = new Set<EmploymentTypeFilter>(["any", "fullTime", "partTime", "contract", "internship"]);
const SALARY_CURRENCIES = new Set<SalaryCurrency>(["RUB", "USD", "EUR", "GBP"]);

export const DEFAULT_CONFIG: Config = {
  jobTitle: "",
  areaId: "1",
  salaryFrom: "",
  salaryTo: "",
  salaryCurrency: "RUB",
  workMode: "any",
  location: "",
  employmentType: "any",
  experience: "any",
  telegramChannels: [],
};

function normalizeChannels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean))).slice(0, 10);
}

function normalizeStoredConfig(value: unknown): Config {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_CONFIG;
  const stored = value as Record<string, unknown>;
  const experience = String(stored.experience ?? "any") as ExperienceFilter;
  const workMode = String(stored.workMode ?? "any") as WorkModeFilter;
  const employmentType = String(stored.employmentType ?? "any") as EmploymentTypeFilter;
  const salaryCurrency = String(stored.salaryCurrency ?? "RUB") as SalaryCurrency;
  return {
    jobTitle: String(stored.jobTitle ?? ""),
    areaId: String(stored.areaId ?? "1"),
    salaryFrom: String(stored.salaryFrom ?? ""),
    salaryTo: String(stored.salaryTo ?? ""),
    salaryCurrency: SALARY_CURRENCIES.has(salaryCurrency) ? salaryCurrency : "RUB",
    workMode: WORK_MODE_VALUES.has(workMode) ? workMode : "any",
    location: String(stored.location ?? ""),
    employmentType: EMPLOYMENT_VALUES.has(employmentType) ? employmentType : "any",
    experience: EXPERIENCE_VALUES.has(experience) ? experience : "any",
    telegramChannels: normalizeChannels(stored.telegramChannels),
  };
}

export function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return normalizeStoredConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function persistConfig(config: Config): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage may be unavailable in restricted/private browser contexts.
  }
}
