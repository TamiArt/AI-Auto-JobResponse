import test from "node:test";
import assert from "node:assert/strict";
import { getSearchEmptyState } from "../src/app/features/search/searchService.ts";

function response(overrides = {}) {
  return {
    results: [],
    errors: {},
    attemptedSources: [],
    nextPages: {},
    backendAvailable: true,
    ...overrides,
  };
}

test("empty search distinguishes an unavailable backend from no matching vacancies", () => {
  assert.equal(getSearchEmptyState(response({ backendAvailable: false })), "backend-unavailable");
  assert.equal(getSearchEmptyState(response()), "no-results");
});

test("empty search reports when all attempted sources failed", () => {
  assert.equal(getSearchEmptyState(response({
    attemptedSources: ["hh", "remocate"],
    errors: { hh: "Ошибка источника", remocate: "Источник недоступен" },
  })), "all-sources-failed");
});

test("partial source failures do not hide successful results", () => {
  assert.equal(getSearchEmptyState(response({
    results: [{
      id: "remocate-1",
      title: "QA Engineer",
      company: "Example",
      salary: "Не указана",
      location: "Remote",
      experience: "Не указан",
      publishedAt: "16 окт. 2026 г.",
      publishedTimestamp: 1792100000000,
      source: "remocate",
      url: "https://example.test/job",
      tags: [],
    }],
    attemptedSources: ["hh", "remocate"],
    errors: { hh: "Источник недоступен" },
  })), null);
});
