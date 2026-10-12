import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSuperJobUrl,
  normalizeSuperJobPayload,
  validateSuperJobRequest,
} from "../server/superjob.mjs";

test("SuperJob validates user query and bounds", () => {
  assert.deepEqual(validateSuperJobRequest(new URLSearchParams("q=QA")), {
    ok: true, query: "QA", page: 0, salaryFrom: "",
  });
  assert.equal(validateSuperJobRequest(new URLSearchParams()).error, "query_required");
  assert.equal(validateSuperJobRequest(new URLSearchParams("q=" + "x".repeat(161))).error, "invalid_parameters");
});

test("SuperJob builds documented vacancy-search request", () => {
  const validation = validateSuperJobRequest(new URLSearchParams("q=QA%20engineer&salary=150000&page=2"));
  const url = new URL(buildSuperJobUrl(validation));
  assert.equal(url.origin, "https://api.superjob.ru");
  assert.equal(url.pathname, "/2.0/vacancies/");
  assert.equal(url.searchParams.get("keyword"), "QA engineer");
  assert.equal(url.searchParams.get("count"), "100");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("payment_from"), "150000");
});

test("SuperJob normalizer preserves real vacancy details and rejects unsafe links", () => {
  const result = normalizeSuperJobPayload({
    total: 1,
    more: false,
    objects: [{
      id: 123,
      profession: "Инженер по тестированию",
      firm_name: "Пример",
      link: "https://www.superjob.ru/vakansii/qa-123.html",
      date_published: 1790000000,
      payment_from: 120000,
      payment_to: 180000,
      currency: "rub",
      town: { title: "Москва" },
      place_of_work: 2,
      experience: { title: "Без опыта" },
      work: "Ручное тестирование",
      type_of_work: { title: "Полный день" },
    }, {
      id: 124,
      profession: "Unsafe",
      link: "https://example.com/redirect",
    }],
  });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].id, "superjob-123");
  assert.equal(result.results[0].source, "superjob");
  assert.equal(result.results[0].salary, "от 120 000 до 180 000 ₽".replace(/ /g, " "));
  assert.equal(result.results[0].workMode, "remote");
  assert.equal(result.results[0].url, "https://www.superjob.ru/vakansii/qa-123.html");
});
