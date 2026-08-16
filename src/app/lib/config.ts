import type { Config, Provider } from "../domain/types";

export function validateImportedConfig(raw: unknown): { valid: true; data: Config } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { valid: false, error: "Файл должен содержать JSON-объект" };
  const r = raw as Record<string, unknown>;
  const validProviders: Provider[] = ["gemini", "groq", "openrouter"];
  if (r.provider && !validProviders.includes(r.provider as Provider)) return { valid: false, error: `Неизвестный провайдер: "${r.provider}"` };
  const dailyLimit = Number(r.dailyLimit ?? 15);
  if (!Number.isFinite(dailyLimit) || dailyLimit < 5 || dailyLimit > 50) {
    return { valid: false, error: "dailyLimit должен быть числом от 5 до 50" };
  }
  return {
    valid: true,
    data: {
      provider: (r.provider as Provider) || "gemini", apiKey: String(r.apiKey ?? ""),
      profile: String(r.profile ?? ""), jobTitle: String(r.jobTitle ?? ""),
      areaId: String(r.areaId ?? "1"), salaryFrom: String(r.salaryFrom ?? ""),
      salaryTo: String(r.salaryTo ?? ""), dailyLimit,
    }
  };
}
