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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSearchRequest(value: unknown): value is SearchRequest {
  if (!isRecord(value)) return false;
  return typeof value.query === "string"
    && typeof value.areaId === "string"
    && typeof value.salaryFrom === "string"
    && typeof value.experience === "string"
    && Array.isArray(value.sources)
    && value.sources.every((source) => typeof source === "string");
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
