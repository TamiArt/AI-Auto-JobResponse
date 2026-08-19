import type { Config } from "../domain/types";

export function validateImportedConfig(raw: unknown): { valid: true; data: Config } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "Файл должен содержать JSON-объект" };
  }

  const value = raw as Record<string, unknown>;
  const areaId = String(value.areaId ?? "1");
  const salaryFrom = String(value.salaryFrom ?? "");

  if (!/^\d+$/.test(areaId)) return { valid: false, error: "Некорректный идентификатор региона" };
  if (salaryFrom && (!/^\d+$/.test(salaryFrom) || Number(salaryFrom) < 0)) {
    return { valid: false, error: "Минимальная зарплата должна быть неотрицательным числом" };
  }

  return {
    valid: true,
    data: {
      jobTitle: String(value.jobTitle ?? "").trim(),
      areaId,
      salaryFrom,
    },
  };
}
