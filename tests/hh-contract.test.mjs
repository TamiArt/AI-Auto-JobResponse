import test from "node:test";
import assert from "node:assert/strict";
import { buildHhUrl, HH_PAGE_SIZE, HH_USER_AGENT, hhHeaders, validateHhRequest } from "../server/hh.mjs";

function params(value) {
  return new URLSearchParams(value);
}

test("HH request validation keeps public search parameters bounded", () => {
  assert.deepEqual(validateHhRequest(params("q=QA&area=1&salary=200000&page=2")), {
    ok: true,
    query: "QA",
    areaId: "1",
    salaryFrom: "200000",
    page: 2,
  });
  assert.equal(validateHhRequest(params("q=" )).error, "query_required");
  assert.equal(validateHhRequest(params("q=QA&area=x")).error, "invalid_parameters");
  assert.equal(validateHhRequest(params("q=QA&page=40")).error, "invalid_parameters");
});

test("HH URL builder sends server-side pagination and filters", () => {
  const url = new URL(buildHhUrl({ query: "QA engineer", areaId: "1", salaryFrom: "200000", page: 2 }));
  assert.equal(url.origin, "https://api.hh.ru");
  assert.equal(url.pathname, "/vacancies");
  assert.equal(url.searchParams.get("text"), "QA engineer");
  assert.equal(url.searchParams.get("area"), "1");
  assert.equal(url.searchParams.get("salary"), "200000");
  assert.equal(url.searchParams.get("only_with_salary"), "true");
  assert.equal(url.searchParams.get("per_page"), String(HH_PAGE_SIZE));
  assert.equal(url.searchParams.get("page"), "2");
});

test("HH client identity is attached only on the server", () => {
  const headers = hhHeaders();
  assert.equal(headers["HH-User-Agent"], HH_USER_AGENT);
  assert.equal(headers["User-Agent"], HH_USER_AGENT);
  assert.equal(headers.Accept, "application/json");
});
