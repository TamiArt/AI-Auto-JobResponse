import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("local production server exposes the Remocate search route", async () => {
  const source = await readFile(new URL("../server/index.mjs", import.meta.url), "utf8");
  assert.match(source, /from ["']\.\/remocate\.mjs["']/);
  assert.match(source, /REMOCATE_URL = ["']https:\/\/www\.remocate\.app\/["']/);
  assert.match(source, /source === ["']remocate["']/);
  assert.match(source, /url\.pathname === ["']\/api\/jobs\/remocate["']/);
  assert.match(source, /const cacheKey = `remocate:\\$\\{normalizedQuery\\.toLocaleLowerCase\\(\\)\\}`;/);
  assert.match(source, /fetchCachedWithMeta\\(cacheKey, REMOCATE_CACHE_MS/);
  assert.match(source, /cached\\.stale/);
});
