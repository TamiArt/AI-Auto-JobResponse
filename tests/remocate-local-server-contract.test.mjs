import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("local production server exposes the Remocate search route", async () => {
  const source = await readFile(new URL("../server/index.mjs", import.meta.url), "utf8");

  const requiredSnippets = [
    'from "./remocate.mjs"',
    'REMOCATE_URL = "https://www.remocate.app/"',
    'source === "remocate"',
    'url.pathname === "/api/jobs/remocate"',
    "const cacheKey = `remocate:${normalizedQuery.toLocaleLowerCase()}`;",
    "fetchCachedWithMeta(cacheKey, REMOCATE_CACHE_MS",
    "cached.stale",
  ];

  for (const snippet of requiredSnippets) {
    assert.ok(source.includes(snippet), `server/index.mjs must contain: ${snippet}`);
  }
});
