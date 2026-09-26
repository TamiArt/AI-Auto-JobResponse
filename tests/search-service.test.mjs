import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBffItems } from "../src/app/features/search/searchService.ts";

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
  sources: ["telegram"],
  telegramChannels: ["qa_jobs"],
  page: 0,
};

test("BFF normalization creates the required publishedAt field", () => {
  const [result] = normalizeBffItems([{
    id: "telegram-1",
    title: "QA Engineer",
    company: "Example",
    salary: "Зарплата не указана",
    location: "Удалённо",
    experience: "Опыт не указан",
    publishedTimestamp: 1_787_050_800_000,
    source: "telegram",
    url: "https://example.com/jobs/1",
    tags: ["QA"],
    description: "QA инженер",
  }], "telegram", baseRequest);

  assert.ok(result);
  assert.equal(result.source, "telegram");
  assert.equal(result.title, "QA Engineer");
  assert.match(result.publishedAt, /\d{4}/);
});

test("BFF normalization keeps a valid result when all optional filters are neutral", () => {
  const results = normalizeBffItems([{
    id: "jobicy-1",
    title: "QA Engineer",
    company: "Example",
    salary: "120000 USD",
    location: "Москва",
    experience: "Опыт не указан",
    publishedTimestamp: 1_787_050_800_000,
    url: "https://example.com/jobs/1",
    tags: ["QA"],
    description: "QA инженер, тестирование",
  }], "jobicy", baseRequest);

  assert.equal(results.length, 1);
});

test("BFF normalization applies the search query before returning results", () => {
  const results = normalizeBffItems([{
    id: "jobicy-1",
    title: "Frontend Developer",
    company: "Example",
    salary: "120000 USD",
    location: "Москва",
    experience: "Опыт не указан",
    publishedTimestamp: 1_787_050_800_000,
    url: "https://example.com/jobs/1",
    tags: ["frontend"],
    description: "React разработчик",
  }], "jobicy", baseRequest);

  assert.equal(results.length, 0);
});
