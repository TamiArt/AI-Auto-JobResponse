import type { RealJobSource, SearchResult } from "./searchService";

const FAVORITES_KEY = "huntpulse_search_favorites_v1";
const HISTORY_KEY = "huntpulse_search_history_v1";
const MAX_HISTORY = 10;

export interface SearchHistoryEntry {
  id: string;
  query: string;
  areaId: string;
  salaryFrom: string;
  sources: RealJobSource[];
  searchedAt: string;
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function loadFavorites(): SearchResult[] {
  return readArray<SearchResult>(FAVORITES_KEY).filter((item) =>
    Boolean(item?.id && item?.title && item?.url && item?.source),
  );
}

export function persistFavorites(items: SearchResult[]): void {
  writeArray(FAVORITES_KEY, items);
}

export function loadSearchHistory(): SearchHistoryEntry[] {
  return readArray<SearchHistoryEntry>(HISTORY_KEY).filter((item) =>
    Boolean(item?.id && item?.query && item?.searchedAt && Array.isArray(item?.sources)),
  ).slice(0, MAX_HISTORY);
}

export function addSearchHistory(entry: Omit<SearchHistoryEntry, "id" | "searchedAt">): SearchHistoryEntry[] {
  const current = loadSearchHistory();
  const normalizedQuery = entry.query.trim().toLocaleLowerCase("ru-RU");
  const withoutDuplicate = current.filter((item) =>
    item.query.trim().toLocaleLowerCase("ru-RU") !== normalizedQuery ||
    item.areaId !== entry.areaId ||
    item.salaryFrom !== entry.salaryFrom,
  );

  const next: SearchHistoryEntry[] = [
    {
      ...entry,
      id: `search-${Date.now()}`,
      searchedAt: new Date().toISOString(),
    },
    ...withoutDuplicate,
  ].slice(0, MAX_HISTORY);

  writeArray(HISTORY_KEY, next);
  return next;
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore storage restrictions; UI state is cleared by the caller.
  }
}
