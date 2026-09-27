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

test("area 1 accepts Moscow but excludes Moscow region", () => {
  assert.equal(matchesArea("1", "Москва"), true);
  assert.equal(matchesArea("1", "Московская область"), false);
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
