export type SearchableJobSource = "hh" | "remoteok" | "arbeitnow";

export interface SearchResult {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  experience: string;
  publishedAt: string;
  source: SearchableJobSource;
  url: string;
  tags: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  errors: Partial<Record<SearchableJobSource, string>>;
}

export interface SearchParams {
  query: string;
  areaId: string;
  salaryFrom: string;
  sources: SearchableJobSource[];
}

export const LEGACY_SEARCH_NOTICE =
  "Будет реализовано позже. Используйте модуль features/search/searchService для текущего рабочего поиска.";

/**
 * @deprecated Старый browser-side search сохранён как совместимая заглушка.
 * Он намеренно не обращается напрямую к HH/RemoteOK/Arbeitnow, чтобы не вернуть CORS/403-регрессии.
 */
export async function searchJobs(params: SearchParams): Promise<SearchResponse> {
  const errors: SearchResponse["errors"] = {};
  for (const source of params.sources) errors[source] = LEGACY_SEARCH_NOTICE;
  return { results: [], errors };
}

export function getSourceErrorLabel(source: SearchableJobSource): string {
  const labels: Record<SearchableJobSource, string> = {
    hh: "HH.ru",
    remoteok: "Remote OK",
    arbeitnow: "Arbeitnow",
  };
  return labels[source];
}
