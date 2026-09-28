import test from "node:test";
import assert from "node:assert/strict";
import {
  applySearchFilters,
  matchesArea,
  matchesExperience,
  matchesSalary,
  matchesWorkMode,
  matchesLocation,
  matchesEmploymentType,
  normalizeSalary,
} from "../src/app/features/search/searchFilters.js";

const baseRequest = {
  query: "QA инженер",
  areaId: "0",
  salaryFrom: "",
  salaryTo: "",
  salaryCurrency: "RUB",
  workMode: "any",
  location: "",
  employmentType: "any",
  experience: "any",
};

const job = {
  id: "job-1",
  title: "QA Engineer",
  company: "Example",
  salary: "120000 USD",
  location: "Москва",
  experience: "Опыт не указан",
  publishedAt: "26 сент. 2026 г.",
  publishedTimestamp: 1_787_050_800_000,
  source: "jobicy",
  url: "https://example.com/jobs/1",
  tags: ["QA", "Remote"],
  description: "QA инженер, тестирование качества продукта",
};

test("canonical QA query matches title plus Russian description", () => {
  assert.equal(applySearchFilters(baseRequest, job), true);
});

test("multilingual role terms match equivalent English vacancy wording", () => {
  assert.equal(applySearchFilters({ ...baseRequest, query: "QA инженер" }, { ...job, title: "QA Engineer", location: "Remote", source: "remoteok", description: "Quality assurance" }), true);
  assert.equal(applySearchFilters({ ...baseRequest, query: "тестировщик" }, { ...job, title: "Software Tester" }), true);
  assert.equal(applySearchFilters({ ...baseRequest, query: "разработчик" }, { ...job, title: "Software Developer" }), true);
});

test("area 1 accepts Moscow but excludes Moscow region", () => {
  assert.equal(matchesArea("1", "Москва"), true);
  assert.equal(matchesArea("1", "Московская область"), false);
});

test("global sources are not discarded by the default local region", () => {
  assert.equal(matchesArea("1", "Worldwide", "remoteok"), true);
  assert.equal(matchesArea("1", "Berlin", "arbeitnow"), true);
  assert.equal(matchesArea("1", "Remote", "remocate"), true);
  assert.equal(matchesArea("1", "Москва", "hh"), true);
  assert.equal(matchesArea("1", "Berlin", "hh"), false);
});

test("salary filter handles empty, currency mismatch and range overlap", () => {
  assert.equal(matchesSalary({ ...baseRequest, salaryFrom: "", salaryTo: "" }, "120000 USD"), true);
  assert.equal(matchesSalary({ ...baseRequest, salaryFrom: "100000", salaryCurrency: "USD" }, "120000 USD"), true);
  assert.equal(matchesSalary({ ...baseRequest, salaryFrom: "130000", salaryCurrency: "USD" }, "120000 USD"), false);
  assert.equal(matchesSalary({ ...baseRequest, salaryFrom: "100000", salaryCurrency: "RUB" }, "120000 USD"), false);
  assert.equal(matchesSalary({ ...baseRequest, salaryFrom: "100000", salaryCurrency: "USD" }, "Зарплата не указана"), false);
});

test("salary normalization handles thousands separators", () => {
  assert.deepEqual(normalizeSalary("120 000 USD").min, 120000);
  assert.deepEqual(normalizeSalary("120,000 USD").max, 120000);
  assert.deepEqual(normalizeSalary("120.000 USD").max, 120000);
});

test("location filter matches the location field instead of description text", () => {
  assert.equal(matchesLocation({ ...baseRequest, location: "London" }, { ...job, location: "Москва", description: "Команда работает с London" }), false);
  assert.equal(matchesLocation({ ...baseRequest, location: "Москва" }, job), true);
});

test("work mode and employment filters honor explicit normalized values", () => {
  assert.equal(matchesWorkMode({ ...baseRequest, workMode: "remote" }, { ...job, workMode: "remote" }), true);
  assert.equal(matchesWorkMode({ ...baseRequest, workMode: "remote" }, { ...job, workMode: "onsite" }), false);
  assert.equal(matchesEmploymentType({ ...baseRequest, employmentType: "internship" }, { ...job, employmentType: "internship" }), true);
  assert.equal(matchesEmploymentType({ ...baseRequest, employmentType: "internship" }, { ...job, employmentType: "fullTime" }), false);
});

test("experience filters do not treat unknown experience as a match", () => {
  assert.equal(matchesExperience("between1And3", "Опыт не указан"), false);
  assert.equal(matchesExperience("noExperience", "Без опыта"), true);
  assert.equal(matchesExperience("between1And3", "1–3 года"), true);
  assert.equal(matchesExperience("between3And6", "3–6 лет"), true);
  assert.equal(matchesExperience("moreThan6", "Более 6 лет"), true);
});


test("unknown work mode never masquerades as onsite", () => {
  const unknown = { ...job, location: "Москва", title: "QA Engineer", description: "Тестирование продукта", tags: [] };
  assert.equal(matchesWorkMode({ ...baseRequest, workMode: "onsite" }, unknown), false);
  assert.equal(matchesWorkMode({ ...baseRequest, workMode: "remote" }, { ...unknown, location: "Remote" }), true);
  assert.equal(matchesWorkMode({ ...baseRequest, workMode: "hybrid" }, { ...unknown, description: "Hybrid format" }), true);
  assert.equal(matchesWorkMode({ ...baseRequest, workMode: "onsite" }, { ...unknown, description: "Работа в офисе" }), true);
});

test("unknown employment type never masquerades as full time", () => {
  const unknown = { ...job, title: "QA Engineer", description: "Тестирование продукта", tags: [] };
  assert.equal(matchesEmploymentType({ ...baseRequest, employmentType: "fullTime" }, unknown), false);
  assert.equal(matchesEmploymentType({ ...baseRequest, employmentType: "fullTime" }, { ...unknown, description: "Полная занятость" }), true);
  assert.equal(matchesEmploymentType({ ...baseRequest, employmentType: "contract" }, { ...unknown, description: "Проектная работа по контракту" }), true);
  assert.equal(matchesEmploymentType({ ...baseRequest, employmentType: "internship" }, { ...unknown, title: "QA Intern" }), true);
});


test("experience range matching supports hyphen, en dash and word ranges without substring false positives", () => {
  assert.equal(matchesExperience("between1And3", "3–6 лет"), false);
  assert.equal(matchesExperience("between1And3", "1-3 years"), true);
  assert.equal(matchesExperience("between1And3", "1 to 3 years"), true);
  assert.equal(matchesExperience("between3And6", "3-6 years"), true);
  assert.equal(matchesExperience("between3And6", "3 to 6 years"), true);
  assert.equal(matchesExperience("between3And6", "7-10 years"), false);
  assert.equal(matchesExperience("between1And3", "thirteen years"), false);
  assert.equal(matchesExperience("between3And6", "four years"), true);
});


test("salary normalization preserves decimal salaries and parses ranges", () => {
  assert.equal(normalizeSalary("$30/hour").min, 30);
  assert.equal(normalizeSalary("$30/hour").period, "hour");
  assert.equal(normalizeSalary("€50k–€70k per year").min, 50000);
  assert.equal(normalizeSalary("€50k–€70k per year").max, 70000);
  assert.equal(normalizeSalary("$120k/year").min, 120000);
  assert.equal(normalizeSalary("£45,000 - £55,000 per year").min, 45000);
  assert.equal(normalizeSalary("£45,000 - £55,000 per year").max, 55000);
});
