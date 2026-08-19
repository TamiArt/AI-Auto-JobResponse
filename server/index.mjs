import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTrudvsemPayload, validateTrudvsemRequest } from "./trudvsem.mjs";
import { renderTrudvsemVacancyPage, validateTrudvsemViewRequest } from "./trudvsemView.mjs";
import { buildHhUrl, hhHeaders, validateHhRequest } from "./hh.mjs";
import {
  filterPublicFeedResults,
  normalizeJobicyPayload,
  normalizeRemoteOkPayload,
  normalizeRemotivePayload,
  normalizeWwrRss,
  validatePublicFeedQuery,
} from "./publicFeeds.mjs";
import { buildAtsUrl, filterAtsResults, normalizeAtsPayload } from "./atsFeeds.mjs";
import { ATS_CACHE_MS, ATS_CONCURRENCY, ATS_EMPLOYERS } from "./atsRegistry.mjs";
import { createRuntimeStatus, withSecurityHeaders } from "./httpPolicy.mjs";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const DIST_DIR = join(ROOT, "dist");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const UPSTREAM_TIMEOUT_MS = 12_000;
const STANDARD_FEED_CACHE_MS = 10 * 60 * 1000;
const JOBICY_CACHE_MS = 60 * 60 * 1000;
const REMOTIVE_CACHE_MS = 6 * 60 * 60 * 1000;
const TRUDVSEM_API = "http://opendata.trudvsem.ru/api/v1/vacancies";
const REMOTE_OK_API = "https://remoteok.com/api";
const WWR_RSS = "https://weworkremotely.com/remote-jobs.rss";
const REMOTIVE_API = "https://remotive.com/api/remote-jobs";
const JOBICY_API = "https://jobicy.com/api/v2/remote-jobs?count=100";
const feedCache = new Map();
const atsCache = new Map();

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"], [".ico", "image/x-icon"],
  [".webmanifest", "application/manifest+json; charset=utf-8"], [".woff2", "font/woff2"],
]);

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, withSecurityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  }));
  response.end(JSON.stringify(body));
}

function sendHtml(response, statusCode, body) {
  response.writeHead(statusCode, withSecurityHeaders({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  }));
  response.end(body);
}

async function fetchResponseWithTimeout(url, { headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithTimeout(url, { parse = "json", headers = {} } = {}) {
  const upstream = await fetchResponseWithTimeout(url, {
    headers: { Accept: parse === "json" ? "application/json" : "application/rss+xml, application/xml, text/xml", ...headers },
  });
  if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);
  return parse === "json" ? upstream.json() : upstream.text();
}

async function fetchCachedWithMeta(key, cacheMs, loader) {
  const current = feedCache.get(key);
  const now = Date.now();
  if (current && current.nextRefresh > now) return { ...current, cached: true };
  try {
    const value = await loader();
    const record = { value, lastUpdated: now, nextRefresh: now + cacheMs, refreshIntervalMs: cacheMs, cached: false, stale: false };
    feedCache.set(key, record);
    return record;
  } catch (error) {
    if (current) {
      const staleRecord = { ...current, nextRefresh: now + cacheMs, cached: true, stale: true };
      feedCache.set(key, staleRecord);
      return staleRecord;
    }
    throw error;
  }
}

async function mapConcurrent(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

async function fetchTrudvsem(query, offset) {
  const params = new URLSearchParams({ text: query, offset: String(offset), limit: "100" });
  return normalizeTrudvsemPayload(await fetchWithTimeout(`${TRUDVSEM_API}?${params}`), offset);
}

async function fetchTrudvsemView(company, id) {
  return fetchWithTimeout(`${TRUDVSEM_API}/vacancy/${encodeURIComponent(company)}/${encodeURIComponent(id)}`);
}

async function fetchHh(url) {
  const validation = validateHhRequest(url.searchParams);
  if (!validation.ok) return { status: validation.status, body: { error: validation.error } };
  const upstream = await fetchResponseWithTimeout(buildHhUrl(validation), { headers: hhHeaders() });
  if (upstream.status === 403) {
    return { status: 200, body: { items: [], page: validation.page, pages: 0, unavailable: "captcha_or_access_restriction" } };
  }
  if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);
  return { status: 200, body: await upstream.json() };
}

async function fetchNormalizedFeed({ key, cacheMs, query, loader }) {
  const cached = await fetchCachedWithMeta(key, cacheMs, loader);
  return {
    results: filterPublicFeedResults(cached.value, query),
    meta: {
      lastUpdated: cached.lastUpdated,
      nextRefresh: cached.nextRefresh,
      refreshIntervalMs: cached.refreshIntervalMs,
      cached: cached.cached,
      stale: cached.stale,
    },
  };
}

async function fetchRemoteOk(query) {
  return fetchNormalizedFeed({
    key: "remoteok", cacheMs: STANDARD_FEED_CACHE_MS, query,
    loader: async () => normalizeRemoteOkPayload(await fetchWithTimeout(REMOTE_OK_API, {
      headers: { "User-Agent": "HuntPulse/0.1 (github.com/TamiArt/AI-Auto-JobResponse)" },
    })),
  });
}

async function fetchWwr(query) {
  return fetchNormalizedFeed({ key: "weworkremotely", cacheMs: STANDARD_FEED_CACHE_MS, query, loader: async () => normalizeWwrRss(await fetchWithTimeout(WWR_RSS, { parse: "text" })) });
}

async function fetchRemotive(query) {
  return fetchNormalizedFeed({ key: "remotive", cacheMs: REMOTIVE_CACHE_MS, query, loader: async () => normalizeRemotivePayload(await fetchWithTimeout(REMOTIVE_API)) });
}

async function fetchJobicy(query) {
  return fetchNormalizedFeed({ key: "jobicy", cacheMs: JOBICY_CACHE_MS, query, loader: async () => normalizeJobicyPayload(await fetchWithTimeout(JOBICY_API)) });
}

async function fetchAtsEmployer(employer) {
  const key = `${employer.provider}:${employer.slug}`;
  const current = atsCache.get(key);
  const now = Date.now();
  if (current && current.nextRefresh > now) return { ...current, cached: true };
  try {
    const jobs = normalizeAtsPayload(await fetchWithTimeout(buildAtsUrl(employer)), employer);
    const value = { jobs, lastUpdated: now, nextRefresh: now + ATS_CACHE_MS, cached: false, stale: false };
    atsCache.set(key, value);
    return value;
  } catch {
    if (current) return { ...current, cached: true, stale: true };
    return { jobs: [], lastUpdated: null, nextRefresh: now + ATS_CACHE_MS, cached: false, stale: false, error: true };
  }
}

async function fetchAts(query) {
  const rows = await mapConcurrent(ATS_EMPLOYERS, ATS_CONCURRENCY, async (employer) => ({ employer, ...(await fetchAtsEmployer(employer)) }));
  const providerStatus = {};
  for (const row of rows) {
    const status = providerStatus[row.employer.provider] || { employers: 0, available: 0, stale: 0, lastUpdated: 0, nextRefresh: 0 };
    status.employers += 1;
    if (row.jobs.length) status.available += 1;
    if (row.stale) status.stale += 1;
    status.lastUpdated = Math.max(status.lastUpdated, row.lastUpdated || 0);
    status.nextRefresh = status.nextRefresh ? Math.min(status.nextRefresh, row.nextRefresh || status.nextRefresh) : row.nextRefresh || 0;
    providerStatus[row.employer.provider] = status;
  }
  return { results: filterAtsResults(rows.flatMap((row) => row.jobs), query), meta: { employers: ATS_EMPLOYERS.length, availableEmployers: rows.filter((row) => row.jobs.length).length, providers: providerStatus } };
}

async function handlePublicFeed(response, url, loader) {
  const validation = validatePublicFeedQuery(url.searchParams.get("q"));
  if (!validation.ok) return sendJson(response, validation.status, { error: validation.error });
  try {
    sendJson(response, 200, await loader(validation.query));
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    sendJson(response, timedOut ? 504 : 502, { error: timedOut ? "upstream_timeout" : "upstream_unavailable" });
  }
}

async function handleTrudvsemView(response, url) {
  const validation = validateTrudvsemViewRequest(url.searchParams.get("company"), url.searchParams.get("id"));
  if (!validation.ok) return sendHtml(response, validation.status, "Некорректная ссылка вакансии");
  try {
    const payload = await fetchTrudvsemView(validation.company, validation.id);
    const sourceUrl = `https://trudvsem.ru/vacancy/card/${encodeURIComponent(validation.company)}/${encodeURIComponent(validation.id)}`;
    const html = renderTrudvsemVacancyPage(payload, sourceUrl);
    return html ? sendHtml(response, 200, html) : sendHtml(response, 404, "Вакансия не найдена");
  } catch {
    return sendHtml(response, 502, "Не удалось загрузить вакансию");
  }
}

async function handleApi(request, response, url) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
  if (url.pathname === "/api/health") return sendJson(response, 200, { ok: true, sources: ["hh", "trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "ats"] });
  if (url.pathname === "/api/status") return sendJson(response, 200, createRuntimeStatus({ feedCache, atsCache, upstreamTimeoutMs: UPSTREAM_TIMEOUT_MS, atsConcurrency: ATS_CONCURRENCY }));
  if (url.pathname === "/api/jobs/trudvsem-view") return handleTrudvsemView(response, url);
  if (url.pathname === "/api/jobs/hh") {
    try {
      const result = await fetchHh(url);
      return sendJson(response, result.status, result.body);
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      return sendJson(response, timedOut ? 504 : 502, { error: timedOut ? "upstream_timeout" : "upstream_unavailable" });
    }
  }
  if (url.pathname === "/api/jobs/remoteok") return handlePublicFeed(response, url, fetchRemoteOk);
  if (url.pathname === "/api/jobs/weworkremotely") return handlePublicFeed(response, url, fetchWwr);
  if (url.pathname === "/api/jobs/remotive") return handlePublicFeed(response, url, fetchRemotive);
  if (url.pathname === "/api/jobs/jobicy") return handlePublicFeed(response, url, fetchJobicy);
  if (url.pathname === "/api/jobs/ats") return handlePublicFeed(response, url, fetchAts);
  if (url.pathname !== "/api/jobs/trudvsem") return sendJson(response, 404, { error: "not_found" });

  const validation = validateTrudvsemRequest(url.searchParams.get("q"), url.searchParams.get("offset"));
  if (!validation.ok) return sendJson(response, validation.status, { error: validation.error });
  try {
    sendJson(response, 200, await fetchTrudvsem(validation.query, validation.offset));
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    sendJson(response, timedOut ? 504 : 502, { error: timedOut ? "upstream_timeout" : "upstream_unavailable" });
  }
}

async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = resolve(DIST_DIR, safePath);
  if (!filePath.startsWith(`${DIST_DIR}/`) && filePath !== DIST_DIR) filePath = join(DIST_DIR, "index.html");
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not_file");
  } catch {
    filePath = join(DIST_DIR, "index.html");
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, withSecurityHeaders({
      "Content-Type": MIME_TYPES.get(extname(filePath)) || "application/octet-stream",
      "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    }));
    response.end(body);
  } catch {
    response.writeHead(503, withSecurityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
    response.end("Production build not found. Run npm run build first.");
  }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else await serveStatic(response, decodeURIComponent(url.pathname));
  } catch {
    if (!response.headersSent) sendJson(response, 500, { error: "internal_error" });
    else response.end();
  }
}).listen(PORT, HOST, () => console.log(`HuntPulse server listening on http://${HOST}:${PORT}`));
