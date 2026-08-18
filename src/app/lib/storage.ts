import type { Config, Position } from "../domain/types";

const CONFIG_STORAGE_KEY = "huntpulse_config";
const API_KEY_SESSION_KEY = "huntpulse_api_key";
const POSITIONS_SESSION_KEY = "huntpulse_positions";

export const DEFAULT_CONFIG: Config = {
  provider: "gemini",
  apiKey: "",
  profile: "",
  jobTitle: "",
  areaId: "1",
  salaryFrom: "",
  salaryTo: "",
  dailyLimit: 15,
};

export function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<Config>) : {};
    return {
      ...DEFAULT_CONFIG,
      ...stored,
      apiKey: sessionStorage.getItem(API_KEY_SESSION_KEY) ?? "",
    };
  } catch {
    return {
      ...DEFAULT_CONFIG,
      apiKey: sessionStorage.getItem(API_KEY_SESSION_KEY) ?? "",
    };
  }
}

export function persistConfig(config: Config): void {
  const { apiKey, ...nonSensitiveConfig } = config;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nonSensitiveConfig));

  if (apiKey) sessionStorage.setItem(API_KEY_SESSION_KEY, apiKey);
  else sessionStorage.removeItem(API_KEY_SESSION_KEY);
}

export function loadPositions(): Position[] {
  try {
    const raw = sessionStorage.getItem(POSITIONS_SESSION_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Position[]) : [];
  } catch {
    return [];
  }
}

export function persistPositions(positions: Position[]): void {
  sessionStorage.setItem(POSITIONS_SESSION_KEY, JSON.stringify(positions));
}
