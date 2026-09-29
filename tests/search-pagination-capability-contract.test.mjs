import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAPABILITIES = join(ROOT, "src/app/features/search/sourceCapabilities.ts");
const SEARCH_SERVICE = join(ROOT, "src/app/features/search/searchService.ts");

test("pagination capability is explicit for paginated and snapshot sources", async () => {
  const sourceCapabilities = await readFile(CAPABILITIES, "utf8");
  assert.match(sourceCapabilities, /hh: \{ acquisition: "query"[^}]*supportsPagination: true/);
  assert.match(sourceCapabilities, /remoteok: \{ acquisition: "snapshot"[^}]*supportsPagination: false/);
});

test("search service keeps pagination state per source", async () => {
  const searchService = await readFile(SEARCH_SERVICE, "utf8");
  assert.match(searchService, /pages\?: Partial<Record<SearchSource, number>>/);
  assert.match(searchService, /request\.pages\?\.hh/);
});
