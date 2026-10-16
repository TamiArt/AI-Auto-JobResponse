import type { SearchRequest, SearchSource } from "./searchService";

const SAVED_SEARCHES_KEY = "huntpulse_saved_searches_v1";
export const MAX_SAVED_SEARCHES = 20;

export interface SavedSearch {
  id: string;
  name: string;
  request: SearchRequest;
  createdAt: string;
  updatedAt: string;
}

type SavedSearchInput = Pick<SavedSearch, "name" | "request">;

const VALID_SOURCES = new Set([
  "hh", "arbeitnow", "remocate", "superjob", "trudvsem", "remoteok",
  "weworkremotely", "remotive", "jobicy", "telegram", "ats",
  "greenhouse", "lever", "ashby", "smartrecruiters", "recruitee", "workable",
]);
const VALID_EXPERIENCE = new Set(["any", "noExperience", "between1And3", "between3And6", "moreThan6"]);
const VALID_WORK_MODES = new Set(["any", "remote", "hybrid", "onsite"]);
const VALID_EMPLOYMENT_TYPES = new Set(["any", "fullTime", "partTime", "contract", "internship"]);
const VALID_PUBLISHED_WITHIN = new Set(["any", "24h", "7d", "30d"]);
const VALID_SORTS = new Set(["date", "salary", "relevance"]);
const VALID_CURRENCIES = new Set(["RUB", "USD", "EUR", "GBP"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isOptionalEnum(value: unknown, allowed: Set<string>): boolean {
  return value === undefined || (typeof value === "string" && allowed.has(value));
}

function isSearchRequest(value: unknown): value is SearchRequest {
  if (!isRecord(value)) return false;
  return typeof value.query === "string"
    && typeof value.areaId === "string"
    && typeof value.salaryFrom === "string"
    && typeof value.experience === "string"
    && VALID_EXPERIENCE.has(value.experience)
    && Array.isArray(value.sources)
    && value.sources.length > 0
    && value.sources.every((source) => typeof source === "string" && VALID_SOURCES.has(source))
    && isOptionalEnum(value.salaryCurrency, VALID_CURRENCIES)
    && isOptionalEnum(value.workMode, VALID_WORK_MODES)
    && isOptionalEnum(value.employmentType, VALID_EMPLOYMENT_TYPES)
    && isOptionalEnum(value.publishedWithin, VALID_PUBLISHED_WITHIN)
    && isOptionalEnum(value.sortBy, VALID_SORTS)
    && (value.location === undefined || typeof value.location === "string")
    && (value.salaryTo === undefined || typeof value.salaryTo === "string")
    && (value.telegramChannels === undefined || (Array.isArray(value.telegramChannels) && value.telegramChannels.every((channel) => typeof channel === "string")));
}

function isSavedSearch(value: unknown): value is SavedSearch {
  return isRecord(value)
    && typeof value.id === "string"
    && Boolean(value.id.trim())
    && typeof value.name === "string"
    && Boolean(value.name.trim())
    && isSearchRequest(value.request)
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}

function readStorage(): unknown[] {
  try {
    const raw = globalThis.localStorage?.getItem(SAVED_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items: SavedSearch[]): void {
  try {
    globalThis.localStorage?.setItem(SAVED_SEARCHES_KEY, JSON.stringify(items));
  } catch {
    // Storage can be unavailable or full; search must continue to work.
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function loadSavedSearches(): SavedSearch[] {
  return readStorage()
    .filter(isSavedSearch)
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      request: {
        ...item.request,
        sources: Array.from(new Set(item.request.sources)) as SearchSource[],
        telegramChannels: Array.isArray(item.request.telegramChannels) ? item.request.telegramChannels : [],
      },
    }))
    .slice(0, MAX_SAVED_SEARCHES);
}

export function saveSearch(input: SavedSearchInput, now = new Date()): SavedSearch[] {
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name || !input.request.query.trim() || !input.request.sources.length) {
    return loadSavedSearches();
  }

  const current = loadSavedSearches();
  const existing = current.find((item) => normalizeName(item.name) === normalizeName(name));
  const timestamp = now.toISOString();
  let id = existing?.id || `saved-search-${now.getTime()}`;
  if (!existing) {
    const baseId = id;
    let suffix = 2;
    while (current.some((item) => item.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
  }
  const nextItem: SavedSearch = {
    id,
    name,
    request: {
      ...input.request,
      query: input.request.query.trim(),
      sources: Array.from(new Set(input.request.sources)),
      telegramChannels: Array.from(new Set(input.request.telegramChannels || [])),
    },
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  const next = [
    nextItem,
    ...current.filter((item) => item.id !== existing?.id),
  ].slice(0, MAX_SAVED_SEARCHES);
  writeStorage(next);
  return next;
}

export function removeSavedSearch(id: string): SavedSearch[] {
  const next = loadSavedSearches().filter((item) => item.id !== id);
  writeStorage(next);
  return next;
}

export function clearSavedSearches(): void {
  try {
    globalThis.localStorage?.removeItem(SAVED_SEARCHES_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}
