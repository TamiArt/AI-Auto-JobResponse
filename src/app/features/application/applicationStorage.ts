import type { SearchResult } from "../search/searchService";

const KEY = "jobos.application.selected";

export function loadSelectedApplication(): SearchResult | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as SearchResult : null;
  } catch { return null; }
}

export function saveSelectedApplication(job: SearchResult): void {
  try { localStorage.setItem(KEY, JSON.stringify(job)); } catch { /* storage can be unavailable */ }
}

export function clearSelectedApplication(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage can be unavailable */ }
}
