import test from "node:test";
import assert from "node:assert/strict";
import { filterRemocateResults, normalizeRemocateHtml } from "../server/remocate.mjs";

const html = [
  '<a href="/jobs/qa-engineer-example">QA Engineer</a>',
  '<span>Example Corp</span><span>🌎 World</span><span>Remote</span><span>Sep 28, 2026</span>',
  '<a href="/jobs/qa-engineer-example">QA Engineer</a>',
].join(" ");

test("Remocate normalizer creates canonical SearchResult-compatible records", () => {
  const results = normalizeRemocateHtml(html, "QA engineer");
  assert.equal(results.length, 1);
  assert.equal(results[0].source, "remocate");
  assert.equal(results[0].title, "QA Engineer");
  assert.equal(results[0].url, "https://www.remocate.app/jobs/qa-engineer-example");
  assert.equal(results[0].publishedTimestamp > 0, true);
});

test("Remocate query filter keeps matching jobs and rejects unrelated terms", () => {
  const results = normalizeRemocateHtml(html);
  assert.equal(filterRemocateResults(results, "QA engineer").length, 1);
  assert.equal(filterRemocateResults(results, "backend").length, 0);
});
