function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function validateTrudvsemViewRequest(companyValue, idValue) {
  const company = String(companyValue || "").trim();
  const id = String(idValue || "").trim();
  const safe = /^[a-zA-Z0-9-]+$/;
  if (!company || !id) return { ok: false, status: 400, error: "vacancy_identity_required" };
  if (company.length > 64 || id.length > 80 || !safe.test(company) || !safe.test(id)) {
    return { ok: false, status: 400, error: "invalid_vacancy_identity" };
  }
  return { ok: true, company, id };
}

export function extractTrudvsemVacancy(payload) {
  const list = payload?.results?.vacancies;
  if (Array.isArray(list) && list.length) return list[0]?.vacancy || list[0] || null;
  return payload?.results?.vacancy || payload?.vacancy || payload?.results || payload || null;
}

export function renderTrudvsemVacancyPage(payload, sourceUrl) {
  const vacancy = extractTrudvsemVacancy(payload);
  if (!vacancy || typeof vacancy !== "object") return null;

  const title = String(vacancy["job-name"] || vacancy.title || "Вакансия").trim();
  const company = String(vacancy.company?.name || "Компания не указана").trim();
  const location = String(vacancy.region?.name || vacancy.addresses?.address?.[0]?.location || "Локация не указана").trim();
  const duty = String(vacancy.duty || vacancy.description || "Описание не указано").trim();
  const qualification = String(vacancy.requirement?.qualification || "").trim();
  const schedule = String(vacancy.schedule || "").trim();
  const employment = String(vacancy.employment || "").trim();
  const salaryMin = Number(vacancy.salary_min || 0);
  const salaryMax = Number(vacancy.salary_max || 0);
  const salary = salaryMin || salaryMax
    ? `${salaryMin ? `от ${salaryMin.toLocaleString("ru-RU")}` : ""}${salaryMax ? ` до ${salaryMax.toLocaleString("ru-RU")}` : ""} ₽`.trim()
    : String(vacancy.salary || "Зарплата не указана");

  const details = [schedule, employment, qualification].filter(Boolean)
    .map((value) => `<li>${escapeHtml(value)}</li>`).join("");
  const original = /^https?:\/\//.test(String(sourceUrl || ""))
    ? `<a class="button secondary" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Открыть на портале «Работа России»</a>`
    : "";

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — HuntPulse</title>
<style>body{margin:0;background:#070611;color:#eee;font-family:system-ui,-apple-system,sans-serif}.wrap{max-width:860px;margin:auto;padding:32px 20px}.card{background:#100d20;border:1px solid #2d2454;border-radius:18px;padding:24px}h1{font-size:28px;margin:0 0 8px}.company{color:#9b7cff;font-size:18px}.meta{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0;color:#b8b1ca}.salary{color:#49d79b}.text{white-space:pre-wrap;line-height:1.6;margin-top:20px}.button{display:inline-block;margin-top:22px;padding:11px 16px;border-radius:10px;text-decoration:none;color:#8fe8ff;border:1px solid #276879}.secondary{margin-left:10px;color:#c7b9ff;border-color:#514080}ul{padding-left:20px;color:#c6bfd6}</style>
</head><body><main class="wrap"><article class="card"><h1>${escapeHtml(title)}</h1><div class="company">${escapeHtml(company)}</div><div class="meta"><span>${escapeHtml(location)}</span><span class="salary">${escapeHtml(salary)}</span></div>${details ? `<ul>${details}</ul>` : ""}<div class="text">${escapeHtml(duty)}</div>${original}</article></main></body></html>`;
}
