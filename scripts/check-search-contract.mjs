import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_NAMES, SNAPSHOT_SOURCES } from "../api/_shared.mjs";
import { SNAPSHOT_BFF_SOURCES, buildBffSourcePath } from "../src/app/features/search/sourceRequestPolicy.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const searchService = fs.readFileSync(path.join(ROOT, "src/app/features/search/searchService.ts"), "utf8");
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

function unique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate source identifiers`);
}

function assertIncludes(actual, expected, label) {
  for (const value of expected) {
    if (!actual.includes(value)) throw new Error(`${label} is missing ${value}`);
  }
}

unique(SOURCE_NAMES, "API source list");
unique(SNAPSHOT_SOURCES, "API snapshot source list");
unique(SNAPSHOT_BFF_SOURCES, "client snapshot source list");
assertIncludes(SOURCE_NAMES, expectedBackendSources, "API source list");
assertIncludes(SNAPSHOT_SOURCES, ["remoteok", "weworkremotely", "remotive", "jobicy", "arbeitnow", "ats"], "API snapshot source list");
assertIncludes(searchService.match(/const adapters: Record<SearchSource, \(request: SearchRequest\) => Promise<AdapterResult>> = \{([\s\S]*?)\};/)?.[1] || "", expectedRealSources, "search adapters");

for (const source of SNAPSHOT_SOURCES) {
  const url = new URL(`https://example.test${buildBffSourcePath(source, "QA инженер + automation")}`);
  if (url.searchParams.get("source") !== source || url.searchParams.has("q")) {
    throw new Error(`snapshot source policy drift for ${source}`);
  }
}

const queryDependentSources = ["trudvsem", "telegram"];
for (const source of queryDependentSources) {
  const query = "QA инженер + automation";
  const url = new URL(`https://example.test${buildBffSourcePath(source, query)}`);
  if (url.searchParams.get("source") !== source || url.searchParams.get("q") !== query) {
    throw new Error(`query-dependent source policy drift for ${source}`);
  }
}

for (const source of expectedBackendSources) {
  if (source === "telegram" || source === "trudvsem") continue;
  if (!apiJobs.includes("handleSource(source, request, response)")) {
    throw new Error("api/jobs.mjs no longer delegates normal job sources through the shared source handler");
  }
}

console.log("Search contract check passed: API/client source registries, adapters, and URL policies are aligned.");
