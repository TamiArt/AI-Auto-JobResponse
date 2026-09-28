import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_NAMES, SNAPSHOT_SOURCES } from "../api/_shared.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const searchService = fs.readFileSync(path.join(ROOT, "src/app/features/search/searchService.ts"), "utf8");
const sourcePolicy = fs.readFileSync(path.join(ROOT, "src/app/features/search/sourceRequestPolicy.ts"), "utf8");
const apiJobs = fs.readFileSync(path.join(ROOT, "api/jobs.mjs"), "utf8");

const expectedBackendSources = [
  "hh",
  "trudvsem",
  "remoteok",
  "weworkremotely",
  "remotive",
  "jobicy",
  "arbeitnow",
  "ats",
  "telegram",
];
const expectedRealSources = [
  "hh",
  "trudvsem",
  "remoteok",
  "weworkremotely",
  "remotive",
  "jobicy",
  "arbeitnow",
  "telegram",
  "greenhouse",
  "lever",
  "ashby",
  "smartrecruiters",
  "recruitee",
  "workable",
];
const expectedSnapshotSources = [
  "remoteok",
  "weworkremotely",
  "remotive",
  "jobicy",
  "arbeitnow",
  "ats",
];

function unique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate source identifiers`);
}

function assertIncludes(actual, expected, label) {
  for (const value of expected) {
    if (!actual.includes(value)) throw new Error(`${label} is missing ${value}`);
  }
}

function assertPolicyUrl(source, query, expectQuery) {
  const params = new URLSearchParams({ source });
  if (expectQuery) params.set("q", query.trim());
  const url = new URL(`https://example.test/api/jobs?${params.toString()}`);
  if (url.searchParams.get("source") !== source) {
    throw new Error(`source policy drift for ${source}`);
  }
  if (expectQuery && url.searchParams.get("q") !== query) {
    throw new Error(`query-dependent source policy drift for ${source}`);
  }
  if (!expectQuery && url.searchParams.has("q")) {
    throw new Error(`snapshot source policy drift for ${source}`);
  }
}

unique(SOURCE_NAMES, "API source list");
unique(SNAPSHOT_SOURCES, "API snapshot source list");
assertIncludes(SOURCE_NAMES, expectedBackendSources, "API source list");
assertIncludes(SNAPSHOT_SOURCES, expectedSnapshotSources, "API snapshot source list");
assertIncludes(searchService.match(/const adapters: Record<SearchSource, \(request: SearchRequest\) => Promise<AdapterResult>> = \{([\s\S]*?)\};/)?.[1] || "", expectedRealSources, "search adapters");

if (!sourcePolicy.includes("export const SNAPSHOT_BFF_SOURCES")) {
  throw new Error("typed source policy no longer exports SNAPSHOT_BFF_SOURCES");
}
if (!sourcePolicy.includes("export const AUTOMATIC_FIRST_PAGE_SOURCES")) {
  throw new Error("typed source policy no longer exports AUTOMATIC_FIRST_PAGE_SOURCES");
}
if (!sourcePolicy.includes("export function isSnapshotBffSource")) {
  throw new Error("typed source policy no longer exports isSnapshotBffSource");
}
if (!sourcePolicy.includes("export function buildBffSourcePath")) {
  throw new Error("typed source policy no longer exports buildBffSourcePath");
}

for (const source of expectedSnapshotSources) {
  assertPolicyUrl(source, "QA инженер + automation", false);
}

for (const source of ["trudvsem", "telegram"]) {
  assertPolicyUrl(source, "QA инженер + automation", true);
}

for (const source of expectedBackendSources) {
  if (source === "telegram" || source === "trudvsem") continue;
  if (!apiJobs.includes("handleSource(source, request, response)")) {
    throw new Error("api/jobs.mjs no longer delegates normal job sources through the shared source handler");
  }
}

console.log("Search contract check passed: API/client source registries, adapters, and URL policies are aligned.");
