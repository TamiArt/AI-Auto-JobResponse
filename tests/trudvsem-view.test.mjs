import test from "node:test";
import assert from "node:assert/strict";
import { extractTrudvsemVacancy, renderTrudvsemVacancyPage, validateTrudvsemViewRequest } from "../server/trudvsemView.mjs";

test("trudvsem viewer validates vacancy identity", () => {
  assert.deepEqual(validateTrudvsemViewRequest("123456789", "abc-def"), { ok: true, company: "123456789", id: "abc-def" });
  assert.equal(validateTrudvsemViewRequest("", "abc").error, "vacancy_identity_required");
  assert.equal(validateTrudvsemViewRequest("../bad", "abc").error, "invalid_vacancy_identity");
});

test("trudvsem viewer extracts vacancy from API list shape", () => {
  const vacancy = { id: "1", "job-name": "QA" };
  assert.deepEqual(extractTrudvsemVacancy({ results: { vacancies: [{ vacancy }] } }), vacancy);
});

test("trudvsem viewer renders readable escaped HTML", () => {
  const html = renderTrudvsemVacancyPage({
    results: { vacancies: [{ vacancy: {
      id: "1",
      "job-name": "QA <Engineer>",
      company: { name: "Example & Co" },
      region: { name: "Москва" },
      salary_min: 120000,
      duty: "Тестировать <script>alert(1)</script>",
      schedule: "Удаленная работа",
      employment: "Полная занятость",
      requirement: { qualification: "Java" },
    } }] },
  }, "https://trudvsem.ru/vacancy/card/123/1");

  assert.match(html, /QA &lt;Engineer&gt;/);
  assert.match(html, /Example &amp; Co/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /Открыть на портале/);
});
