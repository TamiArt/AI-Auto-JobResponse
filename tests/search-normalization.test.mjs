import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBffItems } from "../src/app/features/search/searchService.ts";
import { normalizeArbeitnowPayload } from "../server/publicFeeds.mjs";

const request = {
  query: "QA engineer",
  areaId: "0",
  salaryFrom: "",
  salaryTo: "",
  salaryCurrency: "USD",
  workMode: "any",
  location: "",
  employmentType: "any",
  experience: "any",
  publishedWithin: "any",
  sources: ["remoteok"],
};

function item(overrides = {}) {
  return {
    id: "job-1",
    title: "QA Engineer",
    company: "Example",
    salary: "$50k–$70k per year",
    location: "Remote",
    experience: "1–3 years",
    publishedTimestamp: 1790000000000,
    source: "unexpected-source",
    url: "https://example.com/jobs/1",
    tags: ["QA"],
    description: "Quality assurance engineer",
    ...overrides,
  };
}

test("BFF normalization enforces the requested source identity", () => {
  const [result] = normalizeBffItems([item()], "remoteok", request);
  assert.equal(result.source, "remoteok");
});

test("BFF normalization derives salary metadata and display date", () => {
  const [result] = normalizeBffItems([item()], "remoteok", request);
  assert.equal(result.normalizedSalary?.min, 50000);
  assert.equal(result.normalizedSalary?.max, 70000);
  assert.equal(result.normalizedSalary?.currency, "USD");
  assert.equal(result.normalizedSalary?.period, "year");
  assert.notEqual(result.publishedAt, "Дата не указана");
});

test("BFF normalization fills unknown work mode and employment type instead of inventing values", () => {
  const [result] = normalizeBffItems([
    item({ location: "Berlin", description: "Quality assurance engineer", tags: ["QA"] }),
  ], "remoteok", request);
  assert.equal(result.workMode, "unknown");
  assert.equal(result.employmentType, "unknown");
});

test("BFF normalization rejects invalid vacancy URLs and timestamps", () => {
  const results = normalizeBffItems([
    item({ url: "/jobs/1" }),
    item({ publishedTimestamp: Number.NaN, id: "job-2" }),
  ], "remoteok", request);
  assert.equal(results.length, 0);
});

test("BFF normalization applies authoritative client filters after normalization", () => {
  const results = normalizeBffItems([
    item({ salary: "$40k–$45k per year" }),
    item({ id: "job-2", salary: "$60k–$65k per year", url: "https://example.com/jobs/2" }),
  ], "remoteok", { ...request, salaryFrom: "50000" });
  assert.deepEqual(results.map((result) => result.id), ["job-2"]);
});


test("Arbeitnow normalization keeps only real job-detail URLs", () => {
  const results = normalizeArbeitnowPayload({
    data: [
      {
        slug: "valid-role-123",
        company_name: "Example GmbH",
        title: "QA Engineer",
        description: "QA role",
        remote: true,
        url: "https://www.arbeitnow.com/jobs/companies/example-gmbh/valid-role-123",
        tags: ["Information technology"],
        job_types: ["berufseinstieg"],
        location: "Berlin",
        created_at: 1790697640,
      },
      {
        slug: "bad-url-456",
        company_name: "Example GmbH",
        title: "Backend Engineer",
        description: "Backend role",
        remote: false,
        url: "https://www.example.com/",
        tags: ["Software Engineering"],
        job_types: ["Mid-senior"],
        location: "Berlin",
        created_at: 1790697640,
      },
    ],
  });
  assert.deepEqual(results.map((result) => result.id), ["arbeitnow-valid-role-123"]);
  assert.equal(results[0].workMode, "remote");
});

test("Arbeitnow does not infer full-time from seniority-only job types", () => {
  const [seniorityOnly] = normalizeArbeitnowPayload({
    data: [{
      slug: "seniority-only-123",
      company_name: "Example GmbH",
      title: "Software Engineer",
      description: "Role",
      remote: false,
      url: "https://www.arbeitnow.com/view/seniority-only-123",
      tags: ["Software Engineering"],
      job_types: ["Mid-senior"],
      location: "Berlin",
      created_at: 1790697640,
    }],
  });
  assert.equal(seniorityOnly.employmentType, undefined);
});

test("Arbeitnow preserves explicit full-time employment type", () => {
  const [fullTime] = normalizeArbeitnowPayload({
    data: [{
      slug: "full-time-123",
      company_name: "Example GmbH",
      title: "Software Engineer",
      description: "Role",
      remote: false,
      url: "https://www.arbeitnow.com/jobs/companies/example-gmbh/full-time-123",
      tags: ["Software Engineering"],
      job_types: ["Full-time", "Mid-senior"],
      location: "Berlin",
      created_at: 1790697640,
    }],
  });
  assert.equal(fullTime.employmentType, "fullTime");
});
