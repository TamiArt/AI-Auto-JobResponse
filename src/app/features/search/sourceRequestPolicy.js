export const SNAPSHOT_BFF_SOURCES = Object.freeze([
  "remoteok",
  "weworkremotely",
  "remotive",
  "jobicy",
  "arbeitnow",
  "ats",
]);

export const AUTOMATIC_FIRST_PAGE_SOURCES = SNAPSHOT_BFF_SOURCES;

const SNAPSHOT_SET = new Set(SNAPSHOT_BFF_SOURCES);

export function isSnapshotBffSource(source) {
  return SNAPSHOT_SET.has(String(source));
}

export function buildBffSourcePath(source, query = "") {
  const id = String(source);
  const params = new URLSearchParams({ source: id });
  const normalizedQuery = String(query).trim();
  if (normalizedQuery && !isSnapshotBffSource(id)) params.set("q", normalizedQuery);
  return `/api/jobs?${params.toString()}`;
}
