import test from "node:test";
import assert from "node:assert/strict";
import {
  clearSavedSearches,
  loadSavedSearches,
  MAX_SAVED_SEARCHES,
  removeSavedSearch,
  saveSearch,
} from "../src/app/features/search/savedSearchStorage.ts";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const request = (overrides = {}) => ({
  query: "QA Engineer",
  areaId: "1",
  salaryFrom: "100000",
  salaryTo: "",
  salaryCurrency: "RUB",
  workMode: "remote",
  location: "Москва",
  employmentType: "fullTime",
  experience: "any",
  publishedWithin: "7d",
  sortBy: "date",
  sources: ["hh", "arbeitnow"],
  telegramChannels: [],
  ...overrides,
});

test("saved searches persist a normalized request and can be loaded", () => {
  globalThis.localStorage = createStorage();
  clearSavedSearches();

  const saved = saveSearch({ name: "  QA   remote  ", request: request() }, new Date("2026-10-15T10:00:00.000Z"));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "QA remote");
  assert.equal(saved[0].request.query, "QA Engineer");
  assert.deepEqual(loadSavedSearches().map((item) => item.id), [saved[0].id]);
});

test("saving the same name updates it without creating a duplicate", () => {
  globalThis.localStorage = createStorage();
  clearSavedSearches();

  const first = saveSearch({ name: "QA", request: request() }, new Date("2026-10-15T10:00:00.000Z"));
  const second = saveSearch({ name: "qa", request: request({ query: "Python QA" }) }, new Date("2026-10-15T11:00:00.000Z"));

  assert.equal(second.length, 1);
  assert.equal(second[0].id, first[0].id);
  assert.equal(second[0].request.query, "Python QA");
  assert.equal(second[0].createdAt, first[0].createdAt);
  assert.notEqual(second[0].updatedAt, first[0].updatedAt);
});

test("different presets saved at the same timestamp receive unique ids", () => {
  globalThis.localStorage = createStorage();
  clearSavedSearches();
  const now = new Date("2026-10-15T10:00:00.000Z");

  const first = saveSearch({ name: "QA", request: request() }, now);
  const second = saveSearch({ name: "Python", request: request({ query: "Python QA" }) }, now);

  assert.equal(second.length, 2);
  assert.notEqual(second[0].id, second[1].id);
});

test("empty names, queries, and source selections are not saved", () => {
  globalThis.localStorage = createStorage();
  clearSavedSearches();

  assert.equal(saveSearch({ name: " ", request: request() }).length, 0);
  assert.equal(saveSearch({ name: "QA", request: request({ query: " " }) }).length, 0);
  assert.equal(saveSearch({ name: "QA", request: request({ sources: [] }) }).length, 0);
  assert.deepEqual(loadSavedSearches(), []);
});

test("saved-search loading tolerates corrupt JSON and invalid entries", () => {
  const storage = createStorage();
  globalThis.localStorage = storage;
  storage.setItem("huntpulse_saved_searches_v1", "{broken");
  assert.deepEqual(loadSavedSearches(), []);

  storage.setItem("huntpulse_saved_searches_v1", JSON.stringify([
    { id: "bad", name: "Missing request" },
    { id: "good", name: "QA", request: request(), createdAt: "2026-10-15", updatedAt: "2026-10-15" },
  ]));
  assert.deepEqual(loadSavedSearches().map((item) => item.id), ["good"]);
});

test("saved searches remove by id and clear safely", () => {
  globalThis.localStorage = createStorage();
  clearSavedSearches();

  const first = saveSearch({ name: "QA", request: request() });
  const second = saveSearch({ name: "Python", request: request({ query: "Python" }) });
  assert.equal(removeSavedSearch(first[0].id).length, 1);
  assert.equal(loadSavedSearches()[0].id, second[0].id);
  clearSavedSearches();
  assert.deepEqual(loadSavedSearches(), []);
});

test("failed storage writes do not falsely persist a saved-search deletion", () => {
  const storage = createStorage();
  globalThis.localStorage = storage;
  clearSavedSearches();
  const saved = saveSearch({ name: "QA", request: request() }, new Date("2026-10-15T10:00:00.000Z"));
  storage.setItem = () => { throw new Error("QuotaExceededError"); };

  const optimistic = removeSavedSearch(saved[0].id);
  assert.deepEqual(optimistic, []);
  assert.equal(loadSavedSearches().some((item) => item.id === saved[0].id), true);
});

test("saved-search collection is bounded to prevent unbounded browser storage growth", () => {
  globalThis.localStorage = createStorage();
  clearSavedSearches();

  let saved = [];
  for (let index = 0; index < MAX_SAVED_SEARCHES + 3; index += 1) {
    saved = saveSearch({ name: `Search ${index}`, request: request({ query: `QA ${index}` }) }, new Date(2026, 9, 15, 0, index));
  }
  assert.equal(saved.length, MAX_SAVED_SEARCHES);
  assert.equal(saved[0].name, `Search ${MAX_SAVED_SEARCHES + 2}`);
});

test("storage quota failures do not crash saving and are detectable on reload", () => {
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() { throw new Error("QuotaExceededError"); },
    removeItem() {},
  };

  const optimistic = saveSearch({ name: "QA", request: request() }, new Date("2026-10-15T10:00:00.000Z"));
  assert.equal(optimistic.length, 1);
  assert.deepEqual(loadSavedSearches(), []);
});

test("saved-search loading rejects invalid filter enums and unknown sources", () => {
  const storage = createStorage();
  globalThis.localStorage = storage;
  const base = {
    id: "invalid-filter",
    name: "Broken saved search",
    request: request(),
    createdAt: "2026-10-15",
    updatedAt: "2026-10-15",
  };
  storage.setItem("huntpulse_saved_searches_v1", JSON.stringify([
    { ...base, request: request({ workMode: "teleport" }) },
    { ...base, id: "invalid-experience", request: request({ experience: "a-lot" }) },
    { ...base, id: "invalid-source", request: request({ sources: ["made-up-source"] }) },
    { ...base, id: "valid", name: "Valid saved search" },
  ]));

  assert.deepEqual(loadSavedSearches().map((item) => item.id), ["valid"]);
});
