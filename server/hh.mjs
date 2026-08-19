export const HH_API = "https://api.hh.ru/vacancies";
export const HH_PAGE_SIZE = 50;
export const HH_USER_AGENT = "HuntPulse/0.1 (https://github.com/TamiArt/AI-Auto-JobResponse)";
const EXPERIENCE_IDS = new Set(["noExperience", "between1And3", "between3And6", "moreThan6"]);

export function validateHhRequest(searchParams) {
  const query = String(searchParams.get("q") || "").trim();
  const areaId = String(searchParams.get("area") || "0").trim();
  const salaryFrom = String(searchParams.get("salary") || "").trim();
  const experience = String(searchParams.get("experience") || "").trim();
  const page = Math.max(0, Number.parseInt(String(searchParams.get("page") || "0"), 10) || 0);

  if (!query) return { ok: false, status: 400, error: "query_required" };
  if (query.length > 160 || !/^\d+$/.test(areaId) || page > 39 || (experience && !EXPERIENCE_IDS.has(experience))) {
    return { ok: false, status: 400, error: "invalid_parameters" };
  }
  if (salaryFrom && (!/^\d+$/.test(salaryFrom) || Number(salaryFrom) > 100_000_000)) {
    return { ok: false, status: 400, error: "invalid_parameters" };
  }
  return { ok: true, query, areaId, salaryFrom, experience, page };
}

export function buildHhUrl(validation) {
  const params = new URLSearchParams({ text: validation.query, per_page: String(HH_PAGE_SIZE), page: String(validation.page), order_by: "publication_time" });
  if (validation.areaId !== "0") params.set("area", validation.areaId);
  if (validation.salaryFrom) { params.set("salary", validation.salaryFrom); params.set("only_with_salary", "true"); }
  if (validation.experience) params.set("experience", validation.experience);
  return `${HH_API}?${params}`;
}

export function hhHeaders() {
  return { Accept: "application/json", "User-Agent": HH_USER_AGENT, "HH-User-Agent": HH_USER_AGENT };
}
