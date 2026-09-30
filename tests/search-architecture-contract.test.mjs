import test from "node:test";
import assert from "node:assert/strict";
import { SNAPSHOT_BFF_SOURCES, buildBffSourcePath, isSnapshotBffSource } from "../src/app/features/search/sourceRequestPolicy.ts";
import { SNAPSHOT_SOURCES, SOURCE_NAMES } from "../api/_shared.mjs";

test("client and Vercel snapshot source policies cannot drift", () => {
  assert.deepEqual([...SNAPSHOT_BFF_SOURCES].sort(), [...SNAPSHOT_SOURCES].sort());
  for (const source of SNAPSHOT_SOURCES) {
    assert.equal(isSnapshotBffSource(source), true);
    const url = new URL(`https://example.test${buildBffSourcePath(source, "QA инженер")}`);
    assert.equal(url.searchParams.get("source"), source);
    assert.equal(url.searchParams.has("q"), false);
  }
});

test("every public client backend source is declared by the Vercel API", () => {
  const expected = ["hh", "trudvsem", "remoteok", "weworkremotely", "remotive", "jobicy", "arbeitnow", "remocate", "ats"];
  for (const source of expected) assert.equal(SOURCE_NAMES.includes(source), true, `missing API source: ${source}`);
});

test("query-dependent sources preserve the decoded query exactly", () => {
  const cases = [["trudvsem", "QA инженер"], ["remocate", "QA инженер"], ["telegram", "QA + automation"]];
  for (const [source, query] of cases) {
    const url = new URL(`https://example.test${buildBffSourcePath(source, query)}`);
    assert.equal(url.searchParams.get("source"), source);
    assert.equal(url.searchParams.get("q"), query);
  }
});
