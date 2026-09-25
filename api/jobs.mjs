import { handleSource, sendJson } from "./_shared.mjs";
import { filterTelegramResults, normalizeTelegramHtml, validateTelegramRequest } from "../server/telegramPublic.mjs";
import { withSecurityHeaders } from "../server/httpPolicy.mjs";
import { renderTrudvsemVacancyPage, validateTrudvsemViewRequest } from "../server/trudvsemView.mjs";

const TELEGRAM_TIMEOUT_MS = 12_000;
const TRUDVSEM_TIMEOUT_MS = 12_000;
const TRUDVSEM_API = "http://opendata.trudvsem.ru/api/v1/vacancies/vacancy";

async function fetchTelegramChannel(channel) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const response = await fetch(`https://t.me/s/${encodeURIComponent(channel)}`, {
      signal: controller.signal,
      headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; HuntPulse/0.1; +https://github.com/TamiArt/AI-Auto-JobResponse)" },
    });
    if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
    return normalizeTelegramHtml(await response.text(), channel);
  } finally { clearTimeout(timeout); }
}

async function handleTelegram(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
  const url = new URL(request.url || "/", `https://${request.headers?.host || "localhost"}`);
  const validation = validateTelegramRequest(url.searchParams);
  if (!validation.ok) return sendJson(response, validation.status, { error: validation.error });
  const query = url.searchParams.get("q") || "";
  const settled = await Promise.allSettled(validation.channels.map(fetchTelegramChannel));
  const results = settled.flatMap((entry) => entry.status === "fulfilled" ? entry.value : []);
  const failedChannels = validation.channels.filter((_, index) => settled[index].status === "rejected");
  return sendJson(response, 200, {
    results: filterTelegramResults(results, query),
    meta: { channels: validation.channels, failedChannels, lastUpdated: Date.now() },
  }, 300);
}

function sendHtml(response, status, contentType, body) {
  for (const [name, value] of Object.entries(withSecurityHeaders())) response.setHeader(name, value);
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", "no-store");
  response.status(status).end(body);
}

async function handleTrudvsemView(request, response) {
  if (request.method !== "GET") return sendHtml(response, 405, "text/plain; charset=utf-8", "Method not allowed");
  const url = new URL(request.url || "/", `https://${request.headers?.host || "localhost"}`);
  const validation = validateTrudvsemViewRequest(url.searchParams.get("company"), url.searchParams.get("id"));
  if (!validation.ok) return sendHtml(response, validation.status, "text/plain; charset=utf-8", "Некорректная ссылка вакансии");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRUDVSEM_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${TRUDVSEM_API}/${encodeURIComponent(validation.company)}/${encodeURIComponent(validation.id)}`, {
      signal: controller.signal, headers: { Accept: "application/json" },
    });
    if (!upstream.ok) return sendHtml(response, 502, "text/plain; charset=utf-8", "Источник вакансии временно недоступен");
    const sourceUrl = `https://trudvsem.ru/vacancy/card/${encodeURIComponent(validation.company)}/${encodeURIComponent(validation.id)}`;
    const html = renderTrudvsemVacancyPage(await upstream.json(), sourceUrl);
    if (!html) return sendHtml(response, 404, "text/plain; charset=utf-8", "Вакансия не найдена");
    return sendHtml(response, 200, "text/html; charset=utf-8", html);
  } catch {
    return sendHtml(response, 502, "text/plain; charset=utf-8", "Не удалось загрузить вакансию");
  } finally { clearTimeout(timeout); }
}

export default async function handler(request, response) {
  const url = new URL(request.url || "/", `https://${request.headers?.host || "localhost"}`);
  const source = url.searchParams.get("source");
  if (source === "telegram") return handleTelegram(request, response);
  if (source === "trudvsem-view") return handleTrudvsemView(request, response);
  if (!source) return sendJson(response, 400, { error: "job_source_required" });
  return handleSource(source, request, response);
}
