import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBffSourcePath,
  isSnapshotBffSource,
  SNAPSHOT_BFF_SOURCES,
} from "../src/app/features/search/sourceRequestPolicy.js";

test("snapshot source URLs never depend on the user query", () => {
  for (const source of SNAPSHOT_BFF_SOURCES) {
    assert.equal(buildBffSourcePath(source, "QA инженер"), `/api/jobs/${source}`);
    assert.equal(buildBffSourcePath(source, "Java developer"), `/api/jobs/${source}`);
    assert.equal(isSnapshotBffSource(source), true);
  }
});

test("query-dependent BFF sources keep their query", () => {
  const path = buildBffSourcePath("trudvsem", "QA инженер");
  assert.match(path, /^\/api\/jobs\/trudvsem\?q=/);
  assert.equal(isSnapshotBffSource("trudvsem"), false);
});
