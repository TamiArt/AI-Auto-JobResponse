import test from "node:test";
import assert from "node:assert/strict";
import { AUTOMATIC_FIRST_PAGE_SOURCES, SNAPSHOT_BFF_SOURCES, buildBffSourcePath, isSnapshotBffSource } from "../src/app/features/search/sourceRequestPolicy.ts";

test("automatic first-page search uses only query-independent snapshot sources", () => {
  assert.deepEqual(AUTOMATIC_FIRST_PAGE_SOURCES, SNAPSHOT_BFF_SOURCES);
  assert.equal(AUTOMATIC_FIRST_PAGE_SOURCES.includes("trudvsem"), false);
  assert.equal(AUTOMATIC_FIRST_PAGE_SOURCES.includes("hh"), false);
});

test("snapshot source policy never sends search query upstream", () => {
  for (const source of SNAPSHOT_BFF_SOURCES) {
    assert.equal(isSnapshotBffSource(source), true);
    assert.equal(buildBffSourcePath(source, "QA engineer"), `/api/jobs?source=${source}`);
  }
});

test("query-dependent sources keep the search query", () => {
  assert.equal(buildBffSourcePath("trudvsem", "QA engineer"), "/api/jobs?source=trudvsem&q=QA+engineer");
  assert.equal(buildBffSourcePath("remocate", "QA engineer"), "/api/jobs?source=remocate&q=QA+engineer");
});
