import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRemocateHtml } from "../server/remocate.mjs";

test("Remocate normalization preserves English QA jobs for Russian search queries", () => {
  const html = `
    <html><body>
      <a href="/jobs/qa-engineer">Quality Assurance Engineer</a>
      <span>Remote</span>
      <span>Sep 28, 2026</span>
    </body></html>
  `;
  const results = normalizeRemocateHtml(html, "QA инженер");
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Quality Assurance Engineer");
  assert.equal(results[0].source, "remocate");
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("Remocate BFF does not re-filter English results with raw Russian query terms", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const api = fs.readFileSync(path.join(root, "api/_shared.mjs"), "utf8");
  const loadRemocate = api.match(/async function loadRemocate\(url\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(loadRemocate, /filterRemocateResults\(/);
  assert.match(loadRemocate, /normalizeRemocateHtml\(upstream, query\)/);
});
