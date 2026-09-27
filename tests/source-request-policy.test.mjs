import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBffSourcePath,
  isSnapshotBffSource,
  SNAPSHOT_BFF_SOURCES,
} from "../src/app/features/search/sourceRequestPolicy.js";

test("snapshot source URLs never depend on the user query", () => {
  for (const source of SNAPSHOT_BFF_SOURCES) {
    const url = new URL(`https://example.test${buildBffSourcePath(source, "QA инженер")}`);
    assert.equal(url.pathname, "/api/jobs");
    assert.equal(url.searchParams.get("source"), source);
    assert.equal(url.searchParams.has("q"), false);
    assert.equal(isSnapshotBffSource(source), true);
  }
});

test("query-dependent BFF sources keep their query without relying on URL encoding", () => {
  const query = "QA инженер";
  const path = buildBffSourcePath("trudvsem", query);
  const url = new URL(`https://example.test${path}`);
  assert.equal(url.pathname, "/api/jobs");
  assert.equal(url.searchParams.get("source"), "trudvsem");
  assert.equal(url.searchParams.get("q"), query);
  assert.equal(isSnapshotBffSource("trudvsem"), false);
});
