import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTrudvsemPayload,
  normalizeTrudvsemVacancy,
  salaryLabel,
  validateTrudvsemRequest,
} from "../server/trudvsem.mjs";

test("salaryLabel formats ranges and empty salary", () => {
  assert.equal(salaryLabel({ salary_min: 100000, salary_max: 150000 }), "от 100 000 до 150 000 ₽");
  assert.equal(salaryLabel({ salary_min: 100000 }), "от 100 000 ₽");
  assert.equal(salaryLabel({}), "Зарплата не указана");
});

test("normalizeTrudvsemVacancy returns stable search contract", () => {
  const result = normalizeTrudvsemVacancy({
    vacancy: {
      id: "123",
      "job-name": "QA Engineer",
      vac_url: "https://example.test/vacancy/123",
      "creation-date": "2026-08-18T10:00:00+03:00",
      salary_min: 120000,
      company: { name: "Example" },
      region: { name: "Москва" },
      requirement: { experience: 2 },
      employment: "Полная занятость",
      schedule: "Удаленная работа",
    },
  });

  assert.equal(result.id, "trudvsem-123");
  assert.equal(result.title, "QA Engineer");
  assert.equal(result.company, "Example");
  assert.equal(result.location, "Москва");
  assert.equal(result.experience, "2 г. опыта");
  assert.equal(result.url, "https://example.test/vacancy/123");
  assert.ok(result.publishedTimestamp > 0);
  assert.ok(Array.isArray(result.tags));
});

test("normalizeTrudvsemVacancy rejects incomplete upstream records", () => {
  assert.equal(normalizeTrudvsemVacancy({ vacancy: { id: "1" } }), null);
  assert.equal(normalizeTrudvsemVacancy(null), null);
});

test("normalizeTrudvsemPayload maps results and pagination", () => {
  const payload = {
    meta: { total: 250 },
    results: {
      vacancies: [
        { vacancy: { id: "1", "job-name": "A", vac_url: "https://example.test/1" } },
        { vacancy: { id: "2", "job-name": "B", vac_url: "https://example.test/2" } },
      ],
    },
  };

  const page = normalizeTrudvsemPayload(payload, 0);
  assert.equal(page.results.length, 2);
  assert.equal(page.nextOffset, 1);
});

test("validateTrudvsemRequest enforces public API bounds", () => {
  assert.deepEqual(validateTrudvsemRequest(" QA ", "2"), { ok: true, query: "QA", offset: 2 });
  assert.deepEqual(validateTrudvsemRequest("", "0"), { ok: false, status: 400, error: "query_required" });
  assert.deepEqual(validateTrudvsemRequest("x".repeat(161), "0"), { ok: false, status: 400, error: "invalid_parameters" });
  assert.deepEqual(validateTrudvsemRequest("QA", "100"), { ok: false, status: 400, error: "invalid_parameters" });
});
