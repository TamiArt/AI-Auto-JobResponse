import { isSearchResult, mergeSearchResults as mergeContractResults } from "./searchContract.js";

export type AtsJobSource = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "recruitee" | "workable";
export type FeedJobSource = "trudvsem" | "remoteok" | "weworkremotely" | "remotive" | "jobicy";
export type RealJobSource = FeedJobSource | "hh" | "arbeitnow" | AtsJobSource;
type AdapterSource = RealJobSource | "ats";

export interface SearchResult {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  experience: string;
  publishedAt: string;
  publishedTimestamp: number;
  source: RealJobSource;
  url: string;
  tags: string[];
  description?: string;
  sourceUrl?: string;
}

export interface SearchRequest {
  query: string;
  areaId: string;
  salaryFrom: string;
  sources: RealJobSource[];
  page?: number;
}

export interface SourceRefreshMeta {
  lastUpdated: number;
  nextRefresh: number;
  refreshIntervalMs: number;
  cached: boolean;
  stale: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  errors: Partial<Record<AdapterSource, string>>;
  nextHhPage: number | null;
  refresh?: Partial<Record<FeedJobSource, SourceRefreshMeta>>;
  backendAvailable?: boolean;
}

interface HhVacancy {
  id: string;
  name: string;
  alternate_url: string;
  published_at?: string;
  employer?: { name?: string };
  salary?: { from?: number; to?: number; currency?: string } | null;
  area?: { name?: string };
  experience?: { name?: string };
  schedule?: { name?: string };
  employment?: { name?: string };
  professional_roles?: Array<{ name?: string }>;
}

interface HhPayload {
  items: HhVacancy[];
  page: number;
  pages: number;
  unavailable?: string;
}

interface ArbeitnowVacancy {
  slug: string;
  title: string;
  company_name?: string;
  description?: string;
  tags?: string[];
  location?: string;
  remote?: boolean;
  created_at?: number;
  url: string;
}

interface BffSearchResult {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  experience: string;
  publishedTimestamp: number;
  source?: string;
  url: string;
  tags: string[];
  description?: string;
  sourceUrl?: string;
  viewerPath?: string;
}

interface BffFeedPayload {
  results?: BffSearchResult[];
  meta?: SourceRefreshMeta;
}

interface AdapterResult {
  results: SearchResult[];
  nextHhPage: number | null;
  refresh?: Partial<Record<FeedJobSource, SourceRefreshMeta>>;
}

const REQUEST_TIMEOUT_MS = 12_000;
const CAPABILITY_TIMEOUT_MS = 1_500;
const ATS_SOURCES = new Set<AtsJobSource>(["greenhouse", "lever", "ashby", "smartrecruiters", "recruitee", "workable"]);
const AUTOMATIC_FIRST_PAGE_SOURCES: AdapterSource[] = [
  "trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "ats",
];
const BACKEND_REQUIRED_SOURCES = new Set<AdapterSource>([
  "hh", "trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "ats",
]);
let backendCapability: Promise<boolean> | null = null;

function formatDate(timestamp: number): string {
  if (!timestamp) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp));
}

function formatSalary(salary: HhVacancy["salary"]): string {
  if (!salary) return "Зарплата не указана";
  const parts: string[] = [];
  if (salary.from) parts.push(`от ${salary.from.toLocaleString("ru-RU")}`);
  if (salary.to) parts.push(`до ${salary.to.toLocaleString("ru-RU")}`);
  if (salary.currency) parts.push(salary.currency);
  return parts.join(" ") || "Зарплата не указана";
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
}

function stripHtml(value = ""): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function matchesQuery(query: string, ...values: Array<string | undefined>): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  const haystack = normalizeText(values.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}

function matchesArea(areaId: string, location: string): boolean {
  const normalized = normalizeText(location);
  if (areaId === "1") return normalized.includes("москва") && !normalized.includes("московская область");
  if (areaId === "2") return normalized.includes("санкт-петербург");
  return true;
}

function matchesRubSalary(salaryFrom: string, salary: string): boolean {
  const threshold = Number(salaryFrom || 0);
  if (!threshold) return true;
  const values = Array.from(salary.matchAll(/[\d\s]+/g))
    .map((match) => Number(match[0].replace(/\s/g, "")))
    .filter(Number.isFinite);
  return values.length === 0 || Math.max(...values) >= threshold;
}

async function fetchWithTimeout<T>(url: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function detectBackend(): Promise<boolean> {
  if (backendCapability) return backendCapability;
  backendCapability = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CAPABILITY_TIMEOUT_MS);
    try {
      const response = await fetch("/api/health", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return false;
      const payload = await response.json() as { ok?: unknown };
      return payload.ok === true;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  })();
  return backendCapability;
}

async function searchBffFeed(request: SearchRequest, source: FeedJobSource): Promise<AdapterResult> {
  const params = new URLSearchParams({ q: request.query });
  if (source === "trudvsem") params.set("offset", "0");
  const payload = await fetchWithTimeout<BffFeedPayload>(`/api/jobs/${source}?${params}`, {
    headers: { Accept: "application/json" },
  });
  const results = (Array.isArray(payload.results) ? payload.results : [])
    .map((item) => ({
      ...item,
      url: source === "trudvsem" && item.viewerPath
        ? new URL(item.viewerPath, window.location.origin).toString()
        : item.url,
      source,
      publishedAt: formatDate(item.publishedTimestamp),
    }))
    .filter((item) => isSearchResult(item))
    .filter((item) => source !== "trudvsem" || matchesArea(request.areaId, item.location))
    .filter((item) => source !== "trudvsem" || matchesRubSalary(request.salaryFrom, item.salary));
  return { results, nextHhPage: null, refresh: payload.meta ? { [source]: payload.meta } : undefined };
}

async function searchAts(request: SearchRequest): Promise<AdapterResult> {
  const params = new URLSearchParams({ q: request.query });
  const payload = await fetchWithTimeout<{ results?: BffSearchResult[] }>(`/api/jobs/ats?${params}`, {
    headers: { Accept: "application/json" },
  });
  const results = (Array.isArray(payload.results) ? payload.results : [])
    .filter((item) => ATS_SOURCES.has(item.source as AtsJobSource))
    .map((item) => ({ ...item, source: item.source as AtsJobSource, publishedAt: formatDate(item.publishedTimestamp) }))
    .filter((item) => isSearchResult(item))
    .filter((item) => matchesArea(request.areaId, item.location));
  return { results, nextHhPage: null };
}

async function searchHh(request: SearchRequest): Promise<AdapterResult> {
  const page = Math.max(0, request.page ?? 0);
  const params = new URLSearchParams({ q: request.query, area: request.areaId, page: String(page) });
  if (request.salaryFrom) params.set("salary", request.salaryFrom);
  const payload = await fetchWithTimeout<HhPayload>(`/api/jobs/hh?${params}`, { headers: { Accept: "application/json" } });
  if (payload.unavailable) throw new Error(`HH unavailable: ${payload.unavailable}`);

  const results = (Array.isArray(payload.items) ? payload.items : []).map((item) => {
    const timestamp = item.published_at ? Date.parse(item.published_at) : 0;
    const tags = [
      item.experience?.name,
      item.schedule?.name,
      item.employment?.name,
      ...(item.professional_roles || []).map((role) => role.name),
    ].filter((value): value is string => Boolean(value));
    return {
      id: `hh-${item.id}`,
      title: item.name,
      company: item.employer?.name || "Компания не указана",
      salary: formatSalary(item.salary),
      location: item.area?.name || "Локация не указана",
      experience: item.experience?.name || "Опыт не указан",
      publishedAt: formatDate(timestamp),
      publishedTimestamp: timestamp,
      source: "hh" as const,
      url: item.alternate_url,
      tags: Array.from(new Set(tags)).slice(0, 5),
    };
  }).filter((item) => isSearchResult(item));
  return { results, nextHhPage: payload.page + 1 < payload.pages ? payload.page + 1 : null };
}

async function searchArbeitnow(request: SearchRequest): Promise<AdapterResult> {
  const payload = await fetchWithTimeout<{ data: ArbeitnowVacancy[] }>("https://www.arbeitnow.com/api/job-board-api", {
    headers: { Accept: "application/json" },
  });
  const results = payload.data
    .filter((item) => matchesQuery(request.query, item.title, item.company_name, stripHtml(item.description), ...(item.tags || [])))
    .map((item) => {
      const timestamp = item.created_at ? item.created_at * 1000 : 0;
      return {
        id: `arbeitnow-${item.slug}`,
        title: item.title,
        company: item.company_name || "Компания не указана",
        salary: "Зарплата не указана",
        location: item.location || (item.remote ? "Удалённо" : "Локация не указана"),
        experience: "Опыт не указан",
        publishedAt: formatDate(timestamp),
        publishedTimestamp: timestamp,
        source: "arbeitnow" as const,
        url: item.url,
        tags: (item.tags || []).slice(0, 5),
      };
    })
    .filter((item) => isSearchResult(item));
  return { results, nextHhPage: null };
}

const adapters: Record<AdapterSource, (request: SearchRequest) => Promise<AdapterResult>> = {
  trudvsem: (request) => searchBffFeed(request, "trudvsem"),
  remoteok: (request) => searchBffFeed(request, "remoteok"),
  weworkremotely: (request) => searchBffFeed(request, "weworkremotely"),
  remotive: (request) => searchBffFeed(request, "remotive"),
  jobicy: (request) => searchBffFeed(request, "jobicy"),
  ats: searchAts,
  hh: searchHh,
  arbeitnow: searchArbeitnow,
  greenhouse: searchAts,
  lever: searchAts,
  ashby: searchAts,
  smartrecruiters: searchAts,
  recruitee: searchAts,
  workable: searchAts,
};

export function mergeSearchResults(...groups: SearchResult[][]): SearchResult[] {
  return mergeContractResults(...groups) as SearchResult[];
}

async function sourcesForRequest(request: SearchRequest): Promise<{ sources: AdapterSource[]; backendAvailable: boolean }> {
  const backendAvailable = await detectBackend();
  const requested = request.sources.filter((source) => backendAvailable || !BACKEND_REQUIRED_SOURCES.has(source));
  if ((request.page ?? 0) > 0) return { sources: requested, backendAvailable };
  const automatic = backendAvailable ? AUTOMATIC_FIRST_PAGE_SOURCES : [];
  return { sources: Array.from(new Set([...automatic, ...requested])), backendAvailable };
}

export async function searchJobs(request: SearchRequest): Promise<SearchResponse> {
  const capability = await sourcesForRequest(request);
  const sources = capability.sources;
  const settled = await Promise.allSettled(
    sources.map(async (source) => ({ source, response: await adapters[source](request) })),
  );
  const results: SearchResult[] = [];
  const errors: SearchResponse["errors"] = {};
  const refresh: NonNullable<SearchResponse["refresh"]> = {};
  let nextHhPage: number | null = null;

  settled.forEach((entry, index) => {
    const source = sources[index];
    if (entry.status === "fulfilled") {
      results.push(...entry.value.response.results);
      Object.assign(refresh, entry.value.response.refresh || {});
      if (source === "hh") nextHhPage = entry.value.response.nextHhPage;
      return;
    }
    const reason = entry.reason;
    errors[source] = reason instanceof DOMException && reason.name === "AbortError"
      ? "Источник не ответил вовремя"
      : "Источник временно недоступен";
  });

  return {
    results: mergeSearchResults(results),
    errors,
    nextHhPage,
    refresh: Object.keys(refresh).length ? refresh : undefined,
    backendAvailable: capability.backendAvailable,
  };
}
