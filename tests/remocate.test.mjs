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
