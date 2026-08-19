export interface RuntimeSearchResult {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  experience: string;
  publishedAt: string;
  publishedTimestamp: number;
  source: string;
  url: string;
  tags: string[];
}

export function isSearchResult<T extends RuntimeSearchResult>(value: T): value is T;
export function isSearchResult(value: unknown): value is RuntimeSearchResult;
export function mergeSearchResults(...groups: RuntimeSearchResult[][]): RuntimeSearchResult[];
