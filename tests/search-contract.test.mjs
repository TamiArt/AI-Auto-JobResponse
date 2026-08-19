import test from "node:test";
import assert from "node:assert/strict";
import { isSearchResult, mergeSearchResults } from "../src/app/features/search/searchContract.js";

function result(overrides = {}) {
  return {
    id: "hh-1",
    title: "QA Engineer",
    company: "Example",
    salary: "от 150 000 ₽",
    location: "Москва",
    experience: "1–3 года",
    publishedAt: "18 авг. 2026 г.",
    publishedTimestamp: 1787036400000,
    source: "hh",
    url: "https://example.test/vacancy/1",
    tags: ["QA"],
    ...overrides,
  };
}

test("isSearchResult accepts the normalized adapter contract", () => {
  assert.equal(isSearchResult(result()), true);
});

test("isSearchResult rejects malformed or unsafe results", () => {
  assert.equal(isSearchResult(result({ id: "" })), false);
  assert.equal(isSearchResult(result({ publishedTimestamp: Number.NaN })), false);
  assert.equal(isSearchResult(result({ url: "javascript:alert(1)" })), false);
  assert.equal(isSearchResult(result({ tags: ["ok", 2] })), false);
});

test("mergeSearchResults removes duplicates and sorts newest first", () => {
  const old = result({ id: "old", publishedTimestamp: 10, url: "https://example.test/old" });
  const recent = result({ id: "recent", title: "Designer", publishedTimestamp: 20, url: "https://example.test/recent" });
  const duplicate = { ...recent, id: "duplicate" };
  const malformed = result({ id: "bad", url: "not-a-url" });

  const merged = mergeSearchResults([old, recent], [duplicate, malformed]);
  assert.deepEqual(merged.map((item) => item.id), ["recent", "old"]);
});
