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
  assert.equal(isSearchResult(result({ company: "" })), false);
  assert.equal(isSearchResult(result({ url: "https://" })), false);
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

test("mergeSearchResults deduplicates equivalent URL spellings", () => {
  const first = result({ id: "first", url: "https://example.test/vacancy/42#apply", publishedTimestamp: 20 });
  const second = result({ id: "second", title: "QA Engineer Updated", url: "https://EXAMPLE.test:443/vacancy/42/", publishedTimestamp: 10 });
  const merged = mergeSearchResults([first, second]);
  assert.deepEqual(merged.map((item) => item.id), ["first"]);
});

test("mergeSearchResults ignores common tracking parameters when deduplicating URLs", () => {
  const first = result({ id: "first", url: "https://example.test/vacancy/42?utm_source=telegram", publishedTimestamp: 20 });
  const second = result({ id: "second", url: "https://example.test/vacancy/42?utm_source=hh", publishedTimestamp: 10 });
  assert.deepEqual(mergeSearchResults([first, second]).map((item) => item.id), ["first"]);
});

test("mergeSearchResults keeps distinct vacancy URLs from the same source", () => {
  const first = result({ id: "first", url: "https://example.test/vacancy/1" });
  const second = result({ id: "second", url: "https://example.test/vacancy/2" });
  assert.deepEqual(mergeSearchResults([first, second]).map((item) => item.id), ["first", "second"]);
});

test("mergeSearchResults removes the same vacancy fingerprint when it comes from another source", () => {
  const hh = result({ id: "hh-1", source: "hh", url: "https://hh.example/vacancy/1", publishedTimestamp: 20 });
  const ats = result({ id: "ats-1", source: "greenhouse", url: "https://boards.example/jobs/1", publishedTimestamp: 10 });
  assert.deepEqual(mergeSearchResults([hh, ats]).map((item) => item.id), ["hh-1"]);
});

test("mergeSearchResults keeps two distinct vacancies with the same title and company when their locations differ", () => {
  const first = result({ id: "first", source: "hh", location: "Москва", url: "https://example.test/vacancy/1" });
  const second = result({ id: "second", source: "greenhouse", location: "Санкт-Петербург", url: "https://example.test/vacancy/2" });
  assert.deepEqual(mergeSearchResults([first, second]).map((item) => item.id), ["first", "second"]);
});


test("mergeSearchResults uses the newest cross-source vacancy when duplicate order differs", () => {
  const olderAts = result({
    id: "ats-old",
    source: "greenhouse",
    title: "Python Developer",
    company: "Example",
    location: "Remote",
    publishedTimestamp: 10,
    url: "https://boards.example/jobs/old",
  });
  const newerHh = result({
    id: "hh-new",
    source: "hh",
    title: "Python Developer",
    company: "Example",
    location: "Remote",
    publishedTimestamp: 20,
    url: "https://hh.example/vacancy/new",
  });

  assert.deepEqual(
    mergeSearchResults([olderAts], [newerHh]).map((item) => item.id),
    ["hh-new"],
  );
});

test("mergeSearchResults normalizes case and punctuation for cross-source fingerprints", () => {
  const first = result({
    id: "first",
    source: "hh",
    title: "Senior QA — Engineer",
    company: "Example, Inc.",
    location: "Москва",
    url: "https://hh.example/vacancy/1",
    publishedTimestamp: 20,
  });
  const second = result({
    id: "second",
    source: "greenhouse",
    title: "senior qa engineer",
    company: "Example Inc",
    location: "МОСКВА",
    url: "https://boards.example/jobs/2",
    publishedTimestamp: 10,
  });

  assert.deepEqual(mergeSearchResults([first, second]).map((item) => item.id), ["first"]);
});

test("mergeSearchResults keeps same fingerprint when both results come from the same source", () => {
  const first = result({
    id: "first",
    source: "hh",
    url: "https://hh.example/vacancy/1",
    publishedTimestamp: 20,
  });
  const second = result({
    id: "second",
    source: "hh",
    url: "https://hh.example/vacancy/2",
    publishedTimestamp: 10,
  });

  assert.deepEqual(mergeSearchResults([first, second]).map((item) => item.id), ["first", "second"]);
});

test("mergeSearchResults does not fingerprint vacancies with an unknown location across sources", () => {
  const first = result({
    id: "first",
    source: "hh",
    title: "Python Developer",
    company: "Example",
    location: "Локация не указана",
    url: "https://hh.example/vacancy/1",
  });
  const second = result({
    id: "second",
    source: "greenhouse",
    title: "Python Developer",
    company: "Example",
    location: "Локация не указана",
    url: "https://boards.example/jobs/2",
  });

  assert.deepEqual(
    mergeSearchResults([first, second]).map((item) => item.id),
    ["first", "second"],
  );
});
