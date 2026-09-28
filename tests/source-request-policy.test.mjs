import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBffSourcePath,
  isSnapshotBffSource,
  SNAPSHOT_BFF_SOURCES,
} from "../src/app/features/search/sourceRequestPolicy.ts";

test("snapshot source URLs never depend on the user query", () => {
  for (const source of SNAPSHOT_BFF_SOURCES) {
    const url = new URL(`https://example.test${buildBffSourcePath(source, "QA инженер")}`);
    assert.equal(url.pathname, "/api/jobs");
    assert.equal(url.searchParams.get("source"), source);
    assert.equal(url.searchParams.has("q"), false);
    assert.equal(isSnapshotBffSource(source), true);
  }
});

test("query-dependent BFF sources preserve decoded Unicode and reserved characters", () => {
  const cases = [
    ["trudvsem", "QA инженер + automation"],
    ["telegram", "QA/C++ & automation"],
  ];

  for (const [source, query] of cases) {
    const path = buildBffSourcePath(source, query);
    const url = new URL(`https://example.test${path}`);
    assert.equal(url.pathname, "/api/jobs");
    assert.equal(url.searchParams.get("source"), source);
    assert.equal(url.searchParams.get("q"), query);
    assert.equal(isSnapshotBffSource(source), false);
  }
});

test("empty query never creates an empty q parameter", () => {
  for (const source of ["trudvsem", "telegram"]) {
    const url = new URL(`https://example.test${buildBffSourcePath(source, "   ")}`);
    assert.equal(url.searchParams.get("source"), source);
    assert.equal(url.searchParams.has("q"), false);
  }
});
