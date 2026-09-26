import type { EmploymentTypeFilter, ExperienceFilter, SalaryCurrency, WorkModeFilter } from "../../domain/types";
import { isSearchResult, mergeSearchResults as mergeContractResults } from "./searchContract.js";
import { buildBffSourcePath, isSnapshotBffSource } from "./sourceRequestPolicy.js";

export type AtsJobSource = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "recruitee" | "workable";
export type FeedJobSource = "trudvsem" | "remoteok" | "weworkremotely" | "remotive" | "jobicy";
export type RealJobSource = FeedJobSource | "hh" | "arbeitnow" | "telegram" | AtsJobSource;
type AdapterSource = RealJobSource | "ats";

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
  experience: ExperienceFilter; sources: RealJobSource[]; telegramChannels?: string[]; page?: number;
}

export interface SourceRefreshMeta { lastUpdated: number; nextRefresh: number; refreshIntervalMs: number; cached: boolean; stale: boolean; }
export interface SearchResponse {
  results: SearchResult[]; errors: Partial<Record<AdapterSource, string>>; nextHhPage: number | null;
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
const AUTOMATIC_FIRST_PAGE_SOURCES: AdapterSource[] = ["trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "arbeitnow", "ats"];
const BACKEND_REQUIRED_SOURCES = new Set<AdapterSource>(["hh", "trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "arbeitnow", "ats", "telegram"]);
let backendCapability: Promise<boolean> | null = null;

function formatDate(timestamp: number): string { return timestamp ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)) : "Дата не указана"; }
function formatSalary(salary: HhVacancy["salary"]): string { if (!salary) return "Зарплата не указана"; const parts: string[] = []; if (salary.from) parts.push(`от ${salary.from.toLocaleString("ru-RU")}`); if (salary.to) parts.push(`до ${salary.to.toLocaleString("ru-RU")}`); if (salary.currency) parts.push(salary.currency); return parts.join(" ") || "Зарплата не указана"; }
function normalizeText(value: string): string { return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е"); }
function matchesQuery(query: string, ...values: Array<string | undefined>): boolean { const terms = normalizeText(query).split(/\s+/).filter(Boolean); const haystack = normalizeText(values.filter(Boolean).join(" ")); return terms.every((term) => haystack.includes(term)); }
function matchesArea(areaId: string, location: string): boolean { const normalized = normalizeText(location); if (areaId === "1") return normalized.includes("москва") && !normalized.includes("московская область"); if (areaId === "2") return normalized.includes("санкт-петербург"); return true; }
function parseSalaryNumber(raw: string): number | null {
  const compact = raw.replace(/\s/g, "");
  if (!compact) return null;
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = compact.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
  } else if (comma >= 0 || dot >= 0) {
    const separator = comma >= 0 ? "," : ".";
    const digitsAfter = compact.length - compact.lastIndexOf(separator) - 1;
    normalized = digitsAfter === 3 ? compact.replace(separator, "") : compact.replace(separator, ".");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function normalizeSalary(salary: string): NormalizedSalary {
  const originalText = salary || "Зарплата не указана";
  const text = normalizeText(originalText);
  const numbers = Array.from(text.matchAll(/\d[\d\s.,]*/g))
    .map((match) => parseSalaryNumber(match[0]))
    .filter((value): value is number => value !== null);
  const currency = /\b(rub|руб|₽|rur)\b/.test(text) ? "RUB" : /\b(usd|долл)\b|\$/.test(text) ? "USD" : /\b(eur|евро)\b|€/.test(text) ? "EUR" : /\b(gbp|фунт)\b|£/.test(text) ? "GBP" : null;
  const period = /час|hour|hourly|в час/.test(text) ? "hour" : /год|year|annual|annually|в год/.test(text) ? "year" : /месяц|month|monthly|в месяц/.test(text) ? "month" : "unknown";
  return { min: numbers.length > 1 ? Math.min(...numbers) : numbers[0] ?? null, max: numbers.length > 1 ? Math.max(...numbers) : numbers[0] ?? null, currency, period, originalText };
}
function inferWorkMode(item: Pick<SearchResult, "location" | "title" | "description" | "tags">): WorkModeFilter { const text = normalizeText([item.location, item.title, item.description, ...(item.tags || [])].join(" ")); if (/hybrid|гибрид/.test(text)) return "hybrid"; if (/remote|удален|удалён|дистанцион|work from home|wfh/.test(text)) return "remote"; return "onsite"; }
function matchesWorkMode(request: SearchRequest, item: SearchResult): boolean { if (!request.workMode || request.workMode === "any") return true; if (item.workMode && item.workMode !== "any") return item.workMode === request.workMode; const text = normalizeText([item.location, item.title, item.description, ...(item.tags || [])].join(" ")); if (request.workMode === "remote") return /remote|удален|удалён|дистанцион|work from home|wfh/.test(text); if (request.workMode === "hybrid") return /hybrid|гибрид/.test(text); return !/remote|удален|удалён|дистанцион|work from home|wfh|hybrid|гибрид/.test(text); }
function matchesLocation(request: SearchRequest, item: SearchResult): boolean { if (!request.location?.trim()) return true; const wanted = normalizeText(request.location); return normalizeText(item.location).includes(wanted) || normalizeText([item.title, item.description].join(" ")).includes(wanted); }
function inferEmploymentType(item: Pick<SearchResult, "title" | "description" | "tags">): EmploymentTypeFilter { const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" ")); if (/intern|стаж|trainee|практик/.test(text)) return "internship"; if (/part.?time|частич|неполн/.test(text)) return "partTime"; if (/contract|контракт|проектн|freelance|фриланс/.test(text)) return "contract"; return "fullTime"; }
function matchesEmploymentType(request: SearchRequest, item: SearchResult): boolean { if (!request.employmentType || request.employmentType === "any") return true; if (item.employmentType && item.employmentType !== "any") return item.employmentType === request.employmentType; const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" ")); if (request.employmentType === "internship") return /intern|стаж|trainee|практик/.test(text); if (request.employmentType === "partTime") return /part.?time|частич|неполн/.test(text); if (request.employmentType === "contract") return /contract|контракт|проектн|freelance|фриланс/.test(text); return !/intern|стаж|trainee|практик|part.?time|частич|неполн|contract|контракт|проектн|freelance|фриланс/.test(text); }
function matchesSalary(request: SearchRequest, salary: string, normalized?: NormalizedSalary): boolean { const from = Number(request.salaryFrom || 0); const to = Number(request.salaryTo || 0); if (!from && !to) return true; const value = normalized || normalizeSalary(salary); if (value.min === null && value.max === null) return false; if (request.salaryCurrency && value.currency && request.salaryCurrency !== value.currency) return false; if (request.salaryCurrency && !value.currency) return false; const effectiveMin = value.min ?? value.max!; const effectiveMax = value.max ?? value.min!; return (!from || effectiveMax >= from) && (!to || effectiveMin <= to); }
export function matchesExperience(filter: ExperienceFilter, value: string): boolean { if (filter === "any") return true; const text = normalizeText(value); if (!text || text.includes("не указан")) return false; if (filter === "noExperience") return /без опыта|нет опыта|no experience|entry level|intern/.test(text); if (filter === "between1And3") return /1.?3|1 год|2 год|3 год|one|two|three/.test(text); if (filter === "between3And6") return /3.?6|4 год|5 лет|6 лет|three|four|five|six/.test(text); return /более 6|6\+|7 лет|8 лет|9 лет|10 лет|more than 6|senior/.test(text); }
function applySearchFilters(request: SearchRequest, item: SearchResult): boolean { return matchesQuery(request.query, item.title, item.company, item.location, item.description, ...(item.tags || [])) && matchesArea(request.areaId, item.location) && matchesExperience(request.experience, item.experience) && matchesSalary(request, item.salary, item.normalizedSalary) && matchesWorkMode(request, item) && matchesLocation(request, item) && matchesEmploymentType(request, item); }
async function fetchWithTimeout<T>(url: string, init: RequestInit = {}): Promise<T> { const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); try { const response = await fetch(url, { ...init, signal: controller.signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return await response.json() as T; } finally { window.clearTimeout(timeout); } }
async function detectBackend(): Promise<boolean> { if (backendCapability) return backendCapability; backendCapability = (async () => { const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), CAPABILITY_TIMEOUT_MS); try { const response = await fetch("/api/health", { signal: controller.signal, headers: { Accept: "application/json" }, cache: "no-store" }); if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return false; const payload = await response.json() as { ok?: unknown }; return payload.ok === true; } catch { return false; } finally { window.clearTimeout(timeout); } })(); return backendCapability; }
function normalizeBffItems(items: BffSearchResult[], source: RealJobSource, request: SearchRequest): SearchResult[] { return items.map((item) => ({ ...item, source, publishedAt: formatDate(item.publishedTimestamp), normalizedSalary: normalizeSalary(item.salary) })).filter((item) => isSearchResult(item)).map((item) => ({ ...item, workMode: item.workMode || inferWorkMode(item), employmentType: item.employmentType || inferEmploymentType(item) })).filter((item) => applySearchFilters(request, item)); }
async function searchBffFeed(request: SearchRequest, source: FeedJobSource): Promise<AdapterResult> { const path = source === "trudvsem" ? `/api/jobs/trudvsem?${new URLSearchParams({ q: request.query, offset: "0" })}` : buildBffSourcePath(source, request.query); const payload = await fetchWithTimeout<BffFeedPayload>(path, { headers: { Accept: "application/json" } }); const results = (Array.isArray(payload.results) ? payload.results : []).map((item) => ({ ...item, url: source === "trudvsem" && item.viewerPath ? new URL(item.viewerPath, window.location.origin).toString() : item.url, source, publishedAt: formatDate(item.publishedTimestamp) })).filter((item) => isSearchResult(item)).filter((item) => !isSnapshotBffSource(source) || matchesQuery(request.query, item.title, item.company, item.location, item.description, ...(item.tags || []))).map((item) => ({ ...item, normalizedSalary: normalizeSalary(item.salary), workMode: item.workMode || inferWorkMode(item), employmentType: item.employmentType || inferEmploymentType(item) })).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: null, refresh: payload.meta ? { [source]: payload.meta } : undefined }; }
async function searchTelegram(request: SearchRequest): Promise<AdapterResult> { const channels = request.telegramChannels || []; if (!channels.length) return { results: [], nextHhPage: null }; const params = new URLSearchParams({ channels: channels.join(",") }); const payload = await fetchWithTimeout<BffFeedPayload>(`/api/jobs/telegram?${params}`, { headers: { Accept: "application/json" } }); return { results: normalizeBffItems(Array.isArray(payload.results) ? payload.results : [], "telegram", request), nextHhPage: null }; }
async function searchAts(request: SearchRequest): Promise<AdapterResult> { const payload = await fetchWithTimeout<{ results?: BffSearchResult[] }>(buildBffSourcePath("ats", request.query), { headers: { Accept: "application/json" } }); const results = (Array.isArray(payload.results) ? payload.results : []).filter((item) => ATS_SOURCES.has(item.source as AtsJobSource)).map((item) => ({ ...item, source: item.source as AtsJobSource, publishedAt: formatDate(item.publishedTimestamp), normalizedSalary: normalizeSalary(item.salary) })).filter((item) => isSearchResult(item)).map((item) => ({ ...item, workMode: item.workMode || inferWorkMode(item), employmentType: item.employmentType || inferEmploymentType(item) })).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: null }; }
async function searchHh(request: SearchRequest): Promise<AdapterResult> { const page = Math.max(0, request.page ?? 0); const params = new URLSearchParams({ q: request.query, area: request.areaId, page: String(page) }); if (request.salaryFrom) params.set("salary", request.salaryFrom); if (request.salaryCurrency) params.set("currency", request.salaryCurrency); if (request.experience !== "any") params.set("experience", request.experience); const payload = await fetchWithTimeout<HhPayload>(`/api/jobs/hh?${params}`, { headers: { Accept: "application/json" } }); if (payload.unavailable) throw new Error(`HH unavailable: ${payload.unavailable}`); const results = (Array.isArray(payload.items) ? payload.items : []).map((item) => { const timestamp = item.published_at ? Date.parse(item.published_at) : 0; const tags = [item.experience?.name, item.schedule?.name, item.employment?.name, ...(item.professional_roles || []).map((role) => role.name)].filter((value): value is string => Boolean(value)); return { id: `hh-${item.id}`, title: item.name, company: item.employer?.name || "Компания не указана", salary: formatSalary(item.salary), location: item.area?.name || "Локация не указана", experience: item.experience?.name || "Опыт не указан", workMode: inferWorkMode({ location: item.area?.name || "", title: item.name, description: "", tags: [item.schedule?.name || ""] }), employmentType: inferEmploymentType({ title: item.name, description: "", tags: [item.employment?.name || ""] }), publishedAt: formatDate(timestamp), publishedTimestamp: timestamp, source: "hh" as const, url: item.alternate_url, tags: Array.from(new Set(tags)).slice(0, 5), normalizedSalary: normalizeSalary(formatSalary(item.salary)) }; }).filter((item) => isSearchResult(item)).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: payload.page + 1 < payload.pages ? payload.page + 1 : null }; }
async function searchArbeitnow(request: SearchRequest): Promise<AdapterResult> { const payload = await fetchWithTimeout<BffFeedPayload>(buildBffSourcePath("arbeitnow", request.query), { headers: { Accept: "application/json" } }); const results = (Array.isArray(payload.results) ? payload.results : []).map((item) => ({ ...item, source: "arbeitnow" as const, publishedAt: formatDate(item.publishedTimestamp), normalizedSalary: normalizeSalary(item.salary), workMode: item.workMode || inferWorkMode(item), employmentType: item.employmentType || inferEmploymentType(item) })).filter((item) => isSearchResult(item)).filter((item) => applySearchFilters(request, item)); return { results, nextHhPage: null }; }
const adapters: Record<AdapterSource, (request: SearchRequest) => Promise<AdapterResult>> = { trudvsem: (request) => searchBffFeed(request, "trudvsem"), remoteok: (request) => searchBffFeed(request, "remoteok"), weworkremotely: (request) => searchBffFeed(request, "weworkremotely"), remotive: (request) => searchBffFeed(request, "remotive"), jobicy: (request) => searchBffFeed(request, "jobicy"), telegram: searchTelegram, ats: searchAts, hh: searchHh, arbeitnow: searchArbeitnow, greenhouse: searchAts, lever: searchAts, ashby: searchAts, smartrecruiters: searchAts, recruitee: searchAts, workable: searchAts };
export function mergeSearchResults(...groups: SearchResult[][]): SearchResult[] { return mergeContractResults(...groups) as SearchResult[]; }
async function sourcesForRequest(request: SearchRequest): Promise<{ sources: AdapterSource[]; backendAvailable: boolean }> { const backendAvailable = await detectBackend(); const requested = request.sources.filter((source) => backendAvailable || !BACKEND_REQUIRED_SOURCES.has(source)); if ((request.page ?? 0) > 0) return { sources: requested, backendAvailable }; const automatic = backendAvailable ? AUTOMATIC_FIRST_PAGE_SOURCES : []; const telegram = backendAvailable && request.telegramChannels?.length ? ["telegram" as const] : []; return { sources: Array.from(new Set([...automatic, ...telegram, ...requested])), backendAvailable }; }
export async function searchJobs(request: SearchRequest): Promise<SearchResponse> { const capability = await sourcesForRequest(request); const sources = capability.sources; const settled = await Promise.allSettled(sources.map(async (source) => ({ source, response: await adapters[source](request) }))); const results: SearchResult[] = []; const errors: SearchResponse["errors"] = {}; const refresh: NonNullable<SearchResponse["refresh"]> = {}; let nextHhPage: number | null = null; settled.forEach((entry, index) => { const source = sources[index]; if (entry.status === "fulfilled") { results.push(...entry.value.response.results); Object.assign(refresh, entry.value.response.refresh || {}); if (source === "hh") nextHhPage = entry.value.response.nextHhPage; return; } const reason = entry.reason; errors[source] = reason instanceof DOMException && reason.name === "AbortError" ? "Источник не ответил вовремя" : "Источник временно недоступен"; }); return { results: mergeSearchResults(results), errors, nextHhPage, refresh: Object.keys(refresh).length ? refresh : undefined, backendAvailable: capability.backendAvailable }; }
