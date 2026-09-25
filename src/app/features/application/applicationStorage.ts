import type { SearchResult } from "../search/searchService";

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

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function loadSelectedApplication(): SearchResult | null {
  return read<SearchResult | null>(SELECTED_KEY, null);
}

export function saveSelectedApplication(job: SearchResult): void {
  try { localStorage.setItem(SELECTED_KEY, JSON.stringify(job)); } catch { /* storage unavailable */ }
}

export function clearSelectedApplication(): void {
  try { localStorage.removeItem(SELECTED_KEY); } catch { /* storage unavailable */ }
}

export function loadApplications(): ApplicationRecord[] {
  return read<ApplicationRecord[]>(KEY, []).filter((item) => item?.id && item?.jobId && item?.job);
}

export function saveApplication(record: ApplicationRecord): void {
  const current = loadApplications();
  const next = [record, ...current.filter((item) => item.id !== record.id)].slice(0, 100);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}
