import { withSecurityHeaders } from "../server/httpPolicy.mjs";
import { normalizeTrudvsemPayload, validateTrudvsemRequest } from "../server/trudvsem.mjs";
import { buildHhUrl, hhHeaders, validateHhRequest } from "../server/hh.mjs";
import {
  filterPublicFeedResults,
  normalizeJobicyPayload,
  normalizeRemoteOkPayload,
  normalizeRemotivePayload,
  normalizeWwrRss,
} from "../server/publicFeeds.mjs";
import { buildAtsUrl, filterAtsResults, normalizeAtsPayload } from "../server/atsFeeds.mjs";
import { ATS_CONCURRENCY, ATS_EMPLOYERS } from "../server/atsRegistry.mjs";

const UPSTREAM_TIMEOUT_MS = 12_000;
const API_URLS = {
  trudvsem: "http://opendata.trudvsem.ru/api/v1/vacancies",
  remoteok: "https://remoteok.com/api",
  weworkremotely: "https://weworkremotely.com/remote-jobs.rss",
  remotive: "https://remotive.com/api/remote-jobs",
  jobicy: "https://jobicy.com/api/v2/remote-jobs?count=100",
};

export const SOURCE_NAMES = ["hh", "trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "ats"];
export const SNAPSHOT_SOURCES = ["remoteok", "weworkremotely", "remotive", "jobicy", "ats"];
const SNAPSHOT_SOURCE_SET = new Set(SNAPSHOT_SOURCES);
export const CACHE_SECONDS = {
  hh: 300,
  trudvsem: 300,
  remoteok: 600,
  weworkremotely: 600,
  ats: 1800,
  jobicy: 3600,
  remotive: 21600,
};

function applyHeaders(response) {
  for (const [name, value] of Object.entries(withSecurityHeaders())) response.setHeader(name, value);
}

export function sendJson(response, status, body, cacheSeconds = 0) {
  applyHeaders(response);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (cacheSeconds > 0) {
    response.setHeader(
      "Vercel-CDN-Cache-Control",
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}, stale-if-error=86400`,
    );
  }
  response.status(status).end(JSON.stringify(body));
}

function requestUrl(request) {
  return new URL(request.url || "/", `https://${request.headers?.host || "localhost"}`);
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
  const response = await fetchResponseWithTimeout(url, {
    headers: {
      Accept: parse === "json" ? "application/json" : "application/rss+xml, application/xml, text/xml",
      ...headers,
    },
  });
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
  return parse === "json" ? response.json() : response.text();
}

function feedMeta(source, now = Date.now()) {
  const refreshIntervalMs = CACHE_SECONDS[source] * 1000;
  return {
    lastUpdated: now,
    nextRefresh: now + refreshIntervalMs,
    refreshIntervalMs,
    cached: false,
    stale: false,
  };
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

async function loadHh(url) {
  const validation = validateHhRequest(url.searchParams);
  if (!validation.ok) return { status: validation.status, body: { error: validation.error } };

  const upstream = await fetchResponseWithTimeout(buildHhUrl(validation), { headers: hhHeaders() });
  if (upstream.status === 403) {
    return {
      status: 200,
      body: { items: [], page: validation.page, pages: 0, unavailable: "captcha_or_access_restriction" },
    };
  }
  if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);
  return { status: 200, body: await upstream.json() };
}

async function loadPublicSnapshot(source) {
  let jobs;
  if (source === "remoteok") {
    jobs = normalizeRemoteOkPayload(await fetchWithTimeout(API_URLS.remoteok, {
      headers: { "User-Agent": "HuntPulse/0.1 (github.com/TamiArt/AI-Auto-JobResponse)" },
    }));
  } else if (source === "weworkremotely") {
    jobs = normalizeWwrRss(await fetchWithTimeout(API_URLS.weworkremotely, { parse: "text" }));
  } else if (source === "remotive") {
    jobs = normalizeRemotivePayload(await fetchWithTimeout(API_URLS.remotive));
  } else if (source === "jobicy") {
    jobs = normalizeJobicyPayload(await fetchWithTimeout(API_URLS.jobicy));
  } else {
    throw new Error("unsupported_source");
  }
  return { results: filterPublicFeedResults(jobs, ""), meta: feedMeta(source) };
}

async function loadTrudvsem(url) {
  const validation = validateTrudvsemRequest(url.searchParams.get("q"), url.searchParams.get("offset"));
  if (!validation.ok) return { status: validation.status, body: { error: validation.error } };
  const params = new URLSearchParams({ text: validation.query, offset: String(validation.offset), limit: "100" });
  const payload = await fetchWithTimeout(`${API_URLS.trudvsem}?${params}`);
  return { status: 200, body: normalizeTrudvsemPayload(payload, validation.offset) };
}

async function loadAtsSnapshot() {
  const rows = await mapConcurrent(ATS_EMPLOYERS, ATS_CONCURRENCY, async (employer) => {
    try {
      const jobs = normalizeAtsPayload(await fetchWithTimeout(buildAtsUrl(employer)), employer);
      return { employer, jobs, error: false };
    } catch {
      return { employer, jobs: [], error: true };
    }
  });
  const providers = {};
  for (const row of rows) {
    const status = providers[row.employer.provider] || { employers: 0, available: 0, failed: 0 };
    status.employers += 1;
    if (row.jobs.length) status.available += 1;
    if (row.error) status.failed += 1;
    providers[row.employer.provider] = status;
  }
  return {
    results: filterAtsResults(rows.flatMap((row) => row.jobs), ""),
    meta: {
      employers: ATS_EMPLOYERS.length,
      availableEmployers: rows.filter((row) => row.jobs.length).length,
      providers,
      ...feedMeta("ats"),
    },
  };
}

function rejectSnapshotQuery(url, response) {
  if (!url.searchParams.has("q")) return false;
  sendJson(response, 400, { error: "snapshot_query_not_allowed" });
  return true;
}

export async function handleSource(source, request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
  const url = requestUrl(request);
  try {
    if (source === "hh") {
      const result = await loadHh(url);
      return sendJson(response, result.status, result.body, result.status === 200 ? CACHE_SECONDS.hh : 0);
    }
    if (source === "trudvsem") {
      const result = await loadTrudvsem(url);
      return sendJson(response, result.status, result.body, result.status === 200 ? CACHE_SECONDS.trudvsem : 0);
    }
    if (!SNAPSHOT_SOURCE_SET.has(source)) return sendJson(response, 404, { error: "unsupported_source" });
    if (rejectSnapshotQuery(url, response)) return;
    const body = source === "ats" ? await loadAtsSnapshot() : await loadPublicSnapshot(source);
    return sendJson(response, 200, body, CACHE_SECONDS[source]);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return sendJson(response, timedOut ? 504 : 502, {
      error: timedOut ? "upstream_timeout" : "upstream_unavailable",
    });
  }
}

export function handleHealth(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
  return sendJson(response, 200, { ok: true, runtime: "vercel", sources: SOURCE_NAMES });
}

export function handleStatus(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
  return sendJson(response, 200, {
    ok: true,
    runtime: "vercel-function",
    cache: "vercel-cdn",
    cacheKeyPolicy: "source-snapshot",
    snapshotSources: SNAPSHOT_SOURCES,
    upstreamTimeoutMs: UPSTREAM_TIMEOUT_MS,
    atsConcurrency: ATS_CONCURRENCY,
    cacheSeconds: CACHE_SECONDS,
  });
}
