import { withSecurityHeaders } from "../../server/httpPolicy.mjs";
import { renderTrudvsemVacancyPage, validateTrudvsemViewRequest } from "../../server/trudvsemView.mjs";

const API = "http://opendata.trudvsem.ru/api/v1/vacancies/vacancy";
const TIMEOUT_MS = 12_000;

function send(response, status, contentType, body) {
  for (const [name, value] of Object.entries(withSecurityHeaders())) response.setHeader(name, value);
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", "no-store");
  response.status(status).end(body);
}

export default async function handler(request, response) {
  if (request.method !== "GET") return send(response, 405, "text/plain; charset=utf-8", "Method not allowed");
  const url = new URL(request.url || "/", `https://${request.headers?.host || "localhost"}`);
  const validation = validateTrudvsemViewRequest(url.searchParams.get("company"), url.searchParams.get("id"));
  if (!validation.ok) return send(response, validation.status, "text/plain; charset=utf-8", "Некорректная ссылка вакансии");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(`${API}/${encodeURIComponent(validation.company)}/${encodeURIComponent(validation.id)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!upstream.ok) return send(response, 502, "text/plain; charset=utf-8", "Источник вакансии временно недоступен");
    const sourceUrl = `https://trudvsem.ru/vacancy/card/${encodeURIComponent(validation.company)}/${encodeURIComponent(validation.id)}`;
    const html = renderTrudvsemVacancyPage(await upstream.json(), sourceUrl);
    if (!html) return send(response, 404, "text/plain; charset=utf-8", "Вакансия не найдена");
    return send(response, 200, "text/html; charset=utf-8", html);
  } catch {
    return send(response, 502, "text/plain; charset=utf-8", "Не удалось загрузить вакансию");
  } finally {
    clearTimeout(timeout);
  }
}
