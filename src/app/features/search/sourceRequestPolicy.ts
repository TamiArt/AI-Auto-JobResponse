export const SNAPSHOT_BFF_SOURCES = Object.freeze([
  "remoteok",
  "weworkremotely",
  "remotive",
  "jobicy",
  "arbeitnow",
  "ats",
] as const);

export const AUTOMATIC_FIRST_PAGE_SOURCES = Object.freeze([
  "remoteok",
  "weworkremotely",
  "remotive",
  "jobicy",
  "arbeitnow",
  "ats",
] as const);

const SNAPSHOT_SET = new Set<string>(SNAPSHOT_BFF_SOURCES);

export function isSnapshotBffSource(source: string): boolean {
  return SNAPSHOT_SET.has(String(source));
}

export function buildBffSourcePath(source: string, query = ""): string {
  const id = String(source);
  const params = new URLSearchParams({ source: id });
  const normalizedQuery = String(query).trim();
  if (normalizedQuery && !isSnapshotBffSource(id)) params.set("q", normalizedQuery);
  return `/api/jobs?${params.toString()}`;
}
