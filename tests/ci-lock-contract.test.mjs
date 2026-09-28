import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(root, ".github", "workflows", "ci.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

test("CI npm cache is only enabled when a supported lockfile exists", () => {
  const usesNpmCache = /(^|\\n)\\s*cache:\\s*npm\\s*(?:\\n|$)/.test(workflow);
  if (!usesNpmCache) return;

  const hasLockfile =
    fs.existsSync(path.join(root, "package-lock.json")) ||
    fs.existsSync(path.join(root, "npm-shrinkwrap.json")) ||
    fs.existsSync(path.join(root, "yarn.lock"));

  assert.equal(
    hasLockfile,
    true,
    "CI uses setup-node npm caching but the repository has no supported dependency lockfile"
  );
});
