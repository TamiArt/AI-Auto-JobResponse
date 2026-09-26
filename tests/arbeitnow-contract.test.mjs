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
      description: "Web application testing",
    }],
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, "arbeitnow-qa-engineer-1");
  assert.equal(jobs[0].title, "QA Engineer");
  assert.equal(jobs[0].company, "Example Labs");
  assert.equal(jobs[0].workMode, "remote");
  assert.equal(jobs[0].url, "https://example.com/jobs/qa-engineer-1");
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
