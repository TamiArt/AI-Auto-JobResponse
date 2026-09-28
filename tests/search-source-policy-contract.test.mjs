import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyTs = path.join(root, "src/app/features/search/sourceRequestPolicy.ts");
const legacyJs = path.join(root, "src/app/features/search/sourceRequestPolicy.js");
const searchService = path.join(root, "src/app/features/search/searchService.ts");

test("search source policy is a typed module with the required named export", () => {
  assert.equal(fs.existsSync(policyTs), true, "sourceRequestPolicy.ts must exist");
  assert.equal(fs.existsSync(legacyJs), false, "legacy sourceRequestPolicy.js must not be restored");

  const policy = fs.readFileSync(policyTs, "utf8");
  assert.match(policy, /export\s+const\s+SNAPSHOT_BFF_SOURCES\b/);
  assert.match(policy, /export\s+const\s+AUTOMATIC_FIRST_PAGE_SOURCES\b/);
  assert.match(policy, /export\s+function\s+isSnapshotBffSource\b/);
  assert.match(policy, /export\s+function\s+buildBffSourcePath\b/);
});

test("search service imports the automatic first-page policy from the typed module", () => {
  const source = fs.readFileSync(searchService, "utf8");
  assert.match(source, /import\s*\{[^}]*AUTOMATIC_FIRST_PAGE_SOURCES[^}]*\}\s*from\s*["']\.\/sourceRequestPolicy\.js["']/s);
});
