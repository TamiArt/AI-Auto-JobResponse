import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = path.join(root, "docs", "SOURCE_USAGE_POLICY.md");

test("source usage policy documents the distinction between ingestion and external search", () => {
  assert.equal(fs.existsSync(policyPath), true, "source usage policy must exist");
  const policy = fs.readFileSync(policyPath, "utf8");

  assert.match(policy, /External search links — not data integrations/);
  assert.match(policy, /do not be described as automatically searched, imported, or aggregated/i);
  assert.match(policy, /Permission \/ access confirmation required/);
  assert.match(policy, /Do not bypass CAPTCHA, authentication, rate limits, paywalls, or access controls/);
});

test("source usage policy preserves explicit gates for restricted or unconfirmed providers", () => {
  const policy = fs.readFileSync(policyPath, "utf8");

  assert.match(policy, /Remotive[\s\S]*?Do not ingest[\s\S]*?written/i);
  assert.match(policy, /We Work Remotely[\s\S]*?Do not ingest[\s\S]*?written/i);
  assert.match(policy, /Habr Career[\s\S]*?Do not ingest until activation/i);
  assert.match(policy, /Avito Работа[\s\S]*?External search link only/i);
  assert.match(policy, /LinkedIn[\s\S]*?prohibit unauthorized scraping/i);
});

test("source usage policy requires server-side secret handling and honest source statuses", () => {
  const policy = fs.readFileSync(policyPath, "utf8");

  assert.match(policy, /read it only on the server/i);
  assert.match(policy, /access restricted, rate limited, timed out, malformed response, upstream failure/i);
  assert.match(policy, /does not claim that providers were contacted/i);
});
