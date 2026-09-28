import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAPABILITIES = join(ROOT, "src/app/features/search/sourceCapabilities.ts");
const SEARCH_SERVICE = join(ROOT, "src/app/features/search/searchService.ts");

const REQUIRED_SOURCES = [
  "hh",
  "trudvsem",
  "remoteok",
  "weworkremotely",
  "remotive",
  "jobicy",
  "arbeitnow",
  "remocate",
  "ats",
  "telegram",
];

test("search source capabilities cover every backend search source", async () => {
  const sourceCapabilities = await readFile(CAPABILITIES, "utf8");
  for (const source of REQUIRED_SOURCES) {
    assert.match(sourceCapabilities, new RegExp(`\\b${source}: \\{`), `missing capability for ${source}`);
  }
});

test("pagination capability is explicit and cannot be inferred from acquisition mode", async () => {
  const sourceCapabilities = await readFile(CAPABILITIES, "utf8");
  assert.match(sourceCapabilities, /supportsPagination: true/);
  assert.match(sourceCapabilities, /supportsPagination: false/);
  assert.match(sourceCapabilities, /acquisition: "pagination"/);
});

test("search service keeps pagination metadata in the response contract", async () => {
  const searchService = await readFile(SEARCH_SERVICE, "utf8");
  assert.match(searchService, /nextHhPage: number \| null/);
  assert.match(searchService, /page\?: number/);
  assert.match(searchService, /request\.page/);
});
