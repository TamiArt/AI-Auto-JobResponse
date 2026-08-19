const PAGE_SIZE = 100;

export function salaryLabel(vacancy) {
  if (typeof vacancy?.salary === "string" && vacancy.salary.trim()) return vacancy.salary.trim();
  const min = Number(vacancy?.salary_min || 0);
  const max = Number(vacancy?.salary_max || 0);
  if (min && max) return `от ${min.toLocaleString("ru-RU")} до ${max.toLocaleString("ru-RU")} ₽`;
  if (min) return `от ${min.toLocaleString("ru-RU")} ₽`;
  if (max) return `до ${max.toLocaleString("ru-RU")} ₽`;
  return "Зарплата не указана";
}

export function normalizeTrudvsemVacancy(entry) {
  const vacancy = entry?.vacancy || entry;
  if (!vacancy || typeof vacancy !== "object") return null;

  const id = String(vacancy.id || "").trim();
  const title = String(vacancy["job-name"] || "").trim();
  const url = String(vacancy.vac_url || "").trim();
  if (!id || !title || !url) return null;

  const timestamp = Date.parse(String(vacancy["creation-date"] || ""));
  const experience = Number(vacancy.requirement?.experience);
  const tags = [
    vacancy.employment,
    vacancy.schedule,
    vacancy.category?.specialisation,
    Number.isFinite(experience) ? `${experience} г. опыта` : null,
  ].filter(Boolean).map(String).slice(0, 5);

  return {
    id: `trudvsem-${id}`,
    title,
    company: String(vacancy.company?.name || "Компания не указана"),
    salary: salaryLabel(vacancy),
    location: String(vacancy.region?.name || vacancy.addresses?.address?.[0]?.location || "Локация не указана"),
    experience: Number.isFinite(experience) ? `${experience} г. опыта` : "Опыт не указан",
    publishedTimestamp: Number.isFinite(timestamp) ? timestamp : 0,
    url,
    tags,
  };
}

export function normalizeTrudvsemPayload(payload, offset = 0) {
  const entries = Array.isArray(payload?.results?.vacancies) ? payload.results.vacancies : [];
  const results = entries.map(normalizeTrudvsemVacancy).filter(Boolean);
  const total = Number(payload?.meta?.total || 0);
  return {
    results,
    nextOffset: results.length > 0 && (offset + 1) * PAGE_SIZE < total ? offset + 1 : null,
  };
}

export function validateTrudvsemRequest(queryValue, offsetValue) {
  const query = String(queryValue || "").trim();
  const offset = Math.max(0, Number.parseInt(String(offsetValue || "0"), 10) || 0);
  if (!query) return { ok: false, status: 400, error: "query_required" };
  if (query.length > 160 || offset > 99) return { ok: false, status: 400, error: "invalid_parameters" };
  return { ok: true, query, offset };
}
