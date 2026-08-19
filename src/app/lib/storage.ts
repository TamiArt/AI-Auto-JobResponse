import type { Config, ExperienceFilter } from "../domain/types";

const CONFIG_STORAGE_KEY = "huntpulse_config";
const EXPERIENCE_VALUES = new Set<ExperienceFilter>(["any", "noExperience", "between1And3", "between3And6", "moreThan6"]);

export const DEFAULT_CONFIG: Config = {
  jobTitle: "",
  areaId: "1",
  salaryFrom: "",
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
  return {
    jobTitle: String(stored.jobTitle ?? ""),
    areaId: String(stored.areaId ?? "1"),
    salaryFrom: String(stored.salaryFrom ?? ""),
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
