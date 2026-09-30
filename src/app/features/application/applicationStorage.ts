import type { SearchResult } from "../search/searchService";
import { isSearchResult } from "../search/searchContract.js";

export type ApplicationStatus = "draft" | "ready" | "opened";

export interface ApplicationRecord {
  id: string;
  jobId: string;
  job: SearchResult;
  materialKind: "cover-letter" | "recruiter-message" | "questionnaire" | "tech-answer";
  material: string;
  status: ApplicationStatus;
  updatedAt: string;
}

const KEY = "jobos_applications_v1";
const SELECTED_KEY = "jobos.application.selected";

const MATERIAL_KINDS = new Set<ApplicationRecord["materialKind"]>(["cover-letter", "recruiter-message", "questionnaire", "tech-answer"]);
const STATUSES = new Set<ApplicationStatus>(["draft", "ready", "opened"]);

function isApplicationRecord(value: unknown): value is ApplicationRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ApplicationRecord>;
  return typeof item.id === "string" && Boolean(item.id.trim())
    && typeof item.jobId === "string" && Boolean(item.jobId.trim())
    && isSearchResult(item.job)
    && typeof item.material === "string"
    && MATERIAL_KINDS.has(item.materialKind as ApplicationRecord["materialKind"])
    && STATUSES.has(item.status as ApplicationStatus)
    && typeof item.updatedAt === "string" && Boolean(item.updatedAt.trim());
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function loadSelectedApplication(): SearchResult | null {
  const value = read<SearchResult | null>(SELECTED_KEY, null);
  return isSearchResult(value) ? value : null;
}

export function saveSelectedApplication(job: SearchResult): void {
  try { localStorage.setItem(SELECTED_KEY, JSON.stringify(job)); } catch { /* storage unavailable */ }
}

export function clearSelectedApplication(): void {
  try { localStorage.removeItem(SELECTED_KEY); } catch { /* storage unavailable */ }
}

export function loadApplications(): ApplicationRecord[] {
  const value = read<unknown>(KEY, []);
  return Array.isArray(value) ? value.filter(isApplicationRecord) : [];
}

export function saveApplication(record: ApplicationRecord): void {
  const current = loadApplications();
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 100);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}
