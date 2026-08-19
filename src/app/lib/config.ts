import type { Config, ExperienceFilter } from "../domain/types";

const EXPERIENCE_VALUES = new Set<ExperienceFilter>(["any", "noExperience", "between1And3", "between3And6", "moreThan6"]);

export function validateImportedConfig(raw: unknown): { valid: true; data: Config } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "Файл должен содержать JSON-объект" };
  }

  const value = raw as Record<string, unknown>;
  const areaId = String(value.areaId ?? "1");
  const salaryFrom = String(value.salaryFrom ?? "");
  const experience = String(value.experience ?? "any") as ExperienceFilter;
  const rawChannels = Array.isArray(value.telegramChannels) ? value.telegramChannels : [];

  if (!/^\d+$/.test(areaId)) return { valid: false, error: "Некорректный идентификатор региона" };
  if (salaryFrom && (!/^\d+$/.test(salaryFrom) || Number(salaryFrom) < 0)) {
    return { valid: false, error: "Минимальная зарплата должна быть неотрицательным числом" };
  }
  if (!EXPERIENCE_VALUES.has(experience)) return { valid: false, error: "Некорректный фильтр опыта" };

  return {
    valid: true,
    data: {
      jobTitle: String(value.jobTitle ?? "").trim(),
      areaId,
      salaryFrom,
      experience,
      telegramChannels: Array.from(new Set(rawChannels.map((item) => String(item).trim()).filter(Boolean))).slice(0, 10),
    },
  };
}
