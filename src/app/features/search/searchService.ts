import type { EmploymentTypeFilter, ExperienceFilter, SalaryCurrency, WorkModeFilter } from "../../domain/types";
import { isSearchResult, mergeSearchResults as mergeContractResults } from "./searchContract.js";
import { buildBffSourcePath, isSnapshotBffSource } from "./sourceRequestPolicy.js";
import { applySearchFilters, inferEmploymentType, inferWorkMode, matchesExperience, matchesQuery, normalizeSalary } from "./searchFilters.js";

export type AtsJobSource = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "recruitee" | "workable";
export type FeedJobSource = "trudvsem" | "remoteok" | "weworkremotely" | "remotive" | "jobicy";
export type RealJobSource = FeedJobSource | "hh" | "arbeitnow" | "telegram" | AtsJobSource;
export type SearchSource = RealJobSource | "ats";

export interface NormalizedSalary {
  min: number | null;
  max: number | null;
  currency: SalaryCurrency | null;
  period: "hour" | "month" | "year" | "unknown";
  originalText: string;
}

export interface SearchResult {
  id: string; title: string; company: string; salary: string; location: string; experience: string; workMode?: WorkModeFilter; employmentType?: EmploymentTypeFilter;
  publishedAt: string; publishedTimestamp: number; source: RealJobSource; url: string; tags: string[];
  description?: string; sourceUrl?: string; normalizedSalary?: NormalizedSalary;
}

export interface SearchRequest {
  query: string; areaId: string; salaryFrom: string; salaryTo?: string; salaryCurrency?: SalaryCurrency; workMode?: WorkModeFilter; location?: string; employmentType?: EmploymentTypeFilter;
  experience: ExperienceFilter; sources: SearchSource[]; telegramChannels?: string[]; page?: number;
}

export interface SourceRefreshMeta { lastUpdated: number; nextRefresh: number; refreshIntervalMs: number; cached: boolean; stale: boolean; }
export interface SearchResponse {
  results: SearchResult[]; errors: Partial<Record<SearchSource, string>>; attemptedSources: SearchSource[]; nextHhPage: number | null;
  refresh?: Partial<Record<FeedJobSource, SourceRefreshMeta>>; backendAvailable?: boolean;
}

interface HhVacancy { id: string; name: string; alternate_url: string; published_at?: string; employer?: { name?: string }; salary?: { from?: number; to?: number; currency?: string } | null; area?: { name?: string }; experience?: { name?: string }; schedule?: { name?: string }; employment?: { name?: string }; professional_roles?: Array<{ name?: string }>; }
interface HhPayload { items: HhVacancy[]; page: number; pages: number; unavailable?: string; }
interface BffSearchResult { id: string; title: string; company: string; salary: string; location: string; experience: string; publishedTimestamp: number; source?: string; url: string; tags: string[]; description?: string; sourceUrl?: string; viewerPath?: string; workMode?: WorkModeFilter; employmentType?: EmploymentTypeFilter; }
interface BffFeedPayload { results?: BffSearchResult[]; meta?: SourceRefreshMeta; }
interface AdapterResult { results: SearchResult[]; nextHhPage: number | null; refresh?: Partial<Record<FeedJobSource, SourceRefreshMeta>>; }

const REQUEST_TIMEOUT_MS = 12_000;
const CAPABILITY_TIMEOUT_MS = 1_500;
const ATS_SOURCES = new Set<AtsJobSource>(["greenhouse", "lever", "ashby", "smartrecruiters", "recruitee", "workable"]);
const AUTOMATIC_FIRST_PAGE_SOURCES: SearchSource[] = ["trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "arbeitnow", "ats"];
const BACKEND_REQUIRED_SOURCES = new Set<SearchSource>(["hh", "trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "arbeitnow", "ats", "telegram"]);
let backendCapability: Promise<boolean> | null = null;

function formatDate(timestamp: number): string { return timestamp ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)) : "Дата не указана"; }
function formatSalary(salary: HhVacancy["salary"]): string { if (!salary) return "Зарплата не указана"; const parts: string[] = []; if (salary.from) parts.push(`от ${salary.from.toLocaleString("ru-RU")}`); if (salary.to) parts.push(`до ${salary.to.toLocaleString("ru-RU")}`); if (salary.currency) parts.push(salary.currency); return parts.join(" ") || "Зарплата не указана"; }
async function fetchWithTimeout<T>(url: string, init: RequestInit = {}): Promise<T> { const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); try { const response = await fetch(url, { ...init, signal: controller.signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json() as T; } finally { window.clearTimeout(timeout); } }
async function detectBackend(): Promise<boolean> {
  if (backendCapability) return backendCapability;
  backendCapability = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CAPABILITY_TIMEOUT_MS);
    try {
      const response = await fetch("/api/health", { signal: controller.signal, headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return false;
      const payload = await response.json() as { ok?: unknown };
      return payload.ok === true;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  })();
  const available = await backendCapability;
  if (!available) backendCapability = null;
  return available;
}
export function normalizeBffItems(items: BffSearchResult[], source: RealJobSource, request: SearchRequest): SearchResult[] {
  return items
    .map((item) => ({
      ...item,
      source,
      publishedAt: formatDate(item.publishedTimestamp),
      normalizedSalary: normalizeSalary(item.salary),
    }))
    .filter((item) => isSearchResult(item))
    .map((item) => ({
      ...item,
      workMode: item.workMode || inferWorkMode(item),
      employmentType: item.employmentType || inferEmploymentType(item),
    }))
    .filter((item) => applySearchFilters(request, item));
}
async function searchBffFeed(request: SearchRequest, source: FeedJobSource): Promise<AdapterResult> { const path = source === "trudvsem" ? `/api/jobs/trudvsem?${new URLSearchParams({ q: request.query, offset: "0" })}` : buildBffSourcePath(source, request.query); const payload = await fetchWithTimeout<BffFeedPayload>(path, { headers: { Accept: "application/json" } }); const results = (Array.isArray(payload.results) ? payload.results : []).map((item) => ({ ...item, url: source === "trudvsem" && item.viewerPath ? new URL(item.viewerPath, window.location.origin).toString() : item.url, source, publishedAt: formatDate(item.publishedTimestamp) })).filter((item) => isSearchResult(item)).filter((item) => !isSnapshotBffSource(source) || matchesQuery(request.query, item.title, item.company, item.location, item.description, ...(item.tags || []))).map((item) => ({ ...item, normalizedSalary: normalizeSalary(item.salary), workMode: item.workMode || inferWorkMode(item), employmentType: item.employmentType || inferEmploymentType(item) })).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: null, refresh: payload.meta ? { [source]: payload.meta } : undefined }; }
async function searchTelegram(request: SearchRequest): Promise<AdapterResult> { const channels = request.telegramChannels || []; if (!channels.length) return { results: [], nextHhPage: null }; const params = new URLSearchParams({ channels: channels.join(",") }); const payload = await fetchWithTimeout<BffFeedPayload>(`/api/jobs/telegram?${params}`, { headers: { Accept: "application/json" } }); return { results: normalizeBffItems(Array.isArray(payload.results) ? payload.results : [], "telegram", request), nextHhPage: null }; }
async function searchAts(request: SearchRequest): Promise<AdapterResult> { const payload = await fetchWithTimeout<{ results?: BffSearchResult[] }>(buildBffSourcePath("ats", request.query), { headers: { Accept: "application/json" } }); const results = (Array.isArray(payload.results) ? payload.results : []).filter((item) => ATS_SOURCES.has(item.source as AtsJobSource)).map((item) => ({ ...item, source: item.source as AtsJobSource, publishedAt: formatDate(item.publishedTimestamp), normalizedSalary: normalizeSalary(item.salary) })).filter((item) => isSearchResult(item)).map((item) => ({ ...item, workMode: item.workMode || inferWorkMode(item), employmentType: item.employmentType || inferEmploymentType(item) })).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: null }; }
async function searchHh(request: SearchRequest): Promise<AdapterResult> { const page = Math.max(0, request.page ?? 0); const params = new URLSearchParams({ q: request.query, area: request.areaId, page: String(page) }); if (request.salaryFrom) params.set("salary", request.salaryFrom); if (request.salaryCurrency) params.set("currency", request.salaryCurrency); if (request.experience !== "any") params.set("experience", request.experience); const payload = await fetchWithTimeout<HhPayload>(`/api/jobs/hh?${params}`, { headers: { Accept: "application/json" } }); if (payload.unavailable) throw new Error(`HH unavailable: ${payload.unavailable}`); const results = (Array.isArray(payload.items) ? payload.items : []).map((item) => { const timestamp = item.published_at ? Date.parse(item.published_at) : 0; const tags = [item.experience?.name, item.schedule?.name, item.employment?.name, ...(item.professional_roles || []).map((role) => role.name)].filter((value): value is string => Boolean(value)); return { id: `hh-${item.id}`, title: item.name, company: item.employer?.name || "Компания не указана", salary: formatSalary(item.salary), location: item.area?.name || "Локация не указана", experience: item.experience?.name || "Опыт не указан", workMode: inferWorkMode({ location: item.area?.name || "", title: item.name, description: "", tags: [item.schedule?.name || ""] }), employmentType: inferEmploymentType({ title: item.name, description: "", tags: [item.employment?.name || ""] }), publishedAt: formatDate(timestamp), publishedTimestamp: timestamp, source: "hh" as const, url: item.alternate_url, tags: Array.from(new Set(tags)).slice(0, 5), normalizedSalary: normalizeSalary(formatSalary(item.salary)) }; }).filter((item) => isSearchResult(item)).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: payload.page + 1 < payload.pages ? payload.page + 1 : null }; }
async function searchArbeitnow(request: SearchRequest): Promise<AdapterResult> { const payload = await fetchWithTimeout<BffFeedPayload>(buildBffSourcePath("arbeitnow", request.query), { headers: { Accept: "application/json" } }); const results = (Array.isArray(payload.results) ? payload.results : []).map((item) => ({ ...item, source: "arbeitnow" as const, publishedAt: formatDate(item.publishedTimestamp), normalizedSalary: normalizeSalary(item.salary), workMode: item.workMode || inferWorkMode(item), employmentType: item.employmentType || inferEmploymentType(item) })).filter((item) => isSearchResult(item)).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: null }; }
const adapters: Record<SearchSource, (request: SearchRequest) => Promise<AdapterResult>> = { trudvsem: (request) => searchBffFeed(request, "trudvsem"), remoteok: (request) => searchBffFeed(request, "remoteok"), weworkremotely: (request) => searchBffFeed(request, "weworkremotely"), remotive: (request) => searchBffFeed(request, "remotive"), jobicy: (request) => searchBffFeed(request, "jobicy"), telegram: searchTelegram, ats: searchAts, hh: searchHh, arbeitnow: searchArbeitnow, greenhouse: searchAts, lever: searchAts, ashby: searchAts, smartrecruiters: searchAts, recruitee: searchAts, workable: searchAts };
export function mergeSearchResults(...groups: SearchResult[][]): SearchResult[] { return mergeContractResults(...groups) as SearchResult[]; }
async function sourcesForRequest(request: SearchRequest): Promise<{ sources: SearchSource[]; backendAvailable: boolean }> { const backendAvailable = await detectBackend(); const requested = request.sources.filter((source) => backendAvailable || !BACKEND_REQUIRED_SOURCES.has(source)); if ((request.page ?? 0) > 0) return { sources: requested, backendAvailable }; const automatic = backendAvailable ? AUTOMATIC_FIRST_PAGE_SOURCES : []; const telegram = backendAvailable && request.telegramChannels?.length ? ["telegram" as const] : []; return { sources: Array.from(new Set([...automatic, ...telegram, ...requested])), backendAvailable }; }
export async function searchJobs(request: SearchRequest): Promise<SearchResponse> {
  const capability = await sourcesForRequest(request); const sources = capability.sources; console.info("JOBOS_SEARCH_SOURCES", JSON.stringify(sources)); const settled = await Promise.allSettled(sources.map(async (source) => ({ source, response: await adapters[source](request) }))); const results: SearchResult[] = []; const errors: SearchResponse["errors"] = {}; const refresh: NonNullable<SearchResponse["refresh"]> = {}; let nextHhPage: number | null = null; settled.forEach((entry, index) => { const source = sources[index]; if (entry.status === "fulfilled") { results.push(...entry.value.response.results); Object.assign(refresh, entry.value.response.refresh || {}); if (source === "hh") nextHhPage = entry.value.response.nextHhPage; return; } const reason = entry.reason; errors[source] = reason instanceof DOMException && reason.name === "AbortError" ? "Источник не ответил вовремя" : "Источник временно недоступен"; }); return { results: mergeSearchResults(results), errors, attemptedSources: sources, nextHhPage, refresh: Object.keys(refresh).length ? refresh : undefined, backendAvailable: capability.backendAvailable }; }
