import type { Config } from "../domain/types";

const CONFIG_STORAGE_KEY = "huntpulse_config";

export const DEFAULT_CONFIG: Config = {
  jobTitle: "",
  areaId: "1",
  salaryFrom: "",
  telegramChannels: "",
};

function normalizeStoredConfig(value: unknown): Config {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_CONFIG;
  const stored = value as Record<string, unknown>;
  return {
    jobTitle: String(stored.jobTitle ?? ""),
    areaId: String(stored.areaId ?? "1"),
    salaryFrom: String(stored.salaryFrom ?? ""),
    telegramChannels: String(stored.telegramChannels ?? ""),
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
