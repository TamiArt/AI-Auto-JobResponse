import test from "node:test";
import assert from "node:assert/strict";
import { buildHhSearchParams } from "../src/app/features/search/hhRequestPolicy.js";

const base = {
  query: "QA engineer",
  areaId: "1",
  experience: "any",
  salaryFrom: "",
  salaryTo: "",
  page: 0,
};

test("HH request keeps query, area and page without narrowing salary", () => {
  const params = buildHhSearchParams(base);
  assert.equal(params.get("q"), "QA engineer");
  assert.equal(params.get("area"), "1");
  assert.equal(params.get("page"), "0");
  assert.equal(params.has("salary"), false);
  assert.equal(params.has("currency"), false);
  assert.equal(params.has("label"), false);
});

test("HH request asks only for jobs with salary when a salary filter is active", () => {
  const params = buildHhSearchParams({ ...base, salaryFrom: "200000", salaryTo: "300000", salaryCurrency: "RUB" });
  assert.equal(params.get("label"), "with_salary");
  assert.equal(params.has("salary"), false);
  assert.equal(params.has("currency"), false);
});

test("HH request preserves experience and normalizes page", () => {
  const params = buildHhSearchParams({ ...base, experience: "between1And3", page: -4 });
  assert.equal(params.get("experience"), "between1And3");
  assert.equal(params.get("page"), "0");
});


test("HH request prefers a per-source page over the legacy shared page", () => {
  const params = buildHhSearchParams({ ...base, page: 0, pages: { hh: 3 } });
  assert.equal(params.get("page"), "3");
});
