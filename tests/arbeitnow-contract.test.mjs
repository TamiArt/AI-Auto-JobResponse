import test from "node:test";
import assert from "node:assert/strict";
import { filterPublicFeedResults, normalizeArbeitnowPayload } from "../server/publicFeeds.mjs";

test("Arbeitnow payload normalizes to JOBOS search contract", () => {
  const jobs = normalizeArbeitnowPayload({
    data: [{
      slug: "qa-engineer-1",
      title: "QA Engineer",
      company_name: "Example Labs",
      location: "Remote",
      remote: true,
      created_at: 1790000000,
      url: "https://example.com/jobs/qa-engineer-1",
      tags: ["QA", "Testing"],
      job_types: ["Full-time permanent"],
      description: "Web application testing",
    }],
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, "arbeitnow-qa-engineer-1");
  assert.equal(jobs[0].title, "QA Engineer");
  assert.equal(jobs[0].company, "Example Labs");
  assert.equal(jobs[0].workMode, "remote");
  assert.equal(jobs[0].employmentType, "fullTime");
  assert.equal(jobs[0].url, "https://example.com/jobs/qa-engineer-1");
});

test("Arbeitnow salary is extracted from public job description", () => {
  const [job] = normalizeArbeitnowPayload({
    data: [{
      slug: "qa-paid",
      title: "QA Engineer",
      company_name: "Example Labs",
      location: "Berlin",
      url: "https://example.com/jobs/qa-paid",
      description: "The expected salary range is €60.000 – €75.000 EUR.",
    }],
  });

  assert.equal(job.salary, "€60.000–€75.000 EUR");
});

test("Arbeitnow search filtering includes title, company, location and description", () => {
  const jobs = normalizeArbeitnowPayload({
    data: [{
      slug: "qa-web",
      title: "QA Engineer",
      company_name: "Example Labs",
      location: "Remote",
      url: "https://example.com/jobs/qa-web",
      description: "Testing web applications",
    }],
  });

  assert.equal(filterPublicFeedResults(jobs, "web testing").length, 1);
  assert.equal(filterPublicFeedResults(jobs, "accountant").length, 0);
});
