import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shared = path.join(root, "api/_shared.mjs");

test("all snapshot sources reject a query before loading upstream data", () => {
  const source = fs.readFileSync(shared, "utf8");
  const unsupportedIndex = source.indexOf('if (!SNAPSHOT_SOURCE_SET.has(source)) return sendJson(response, 404, { error: "unsupported_source" });');
  const rejectIndex = source.indexOf('if (rejectSnapshotQuery(url, response)) return;');
  assert.ok(unsupportedIndex >= 0);
  assert.ok(rejectIndex > unsupportedIndex);
  assert.doesNotMatch(source, /if \(source === "arbeitnow"\) \{[\s\S]*?filterPublicFeedResults\(body\.results, query\)/);
});
