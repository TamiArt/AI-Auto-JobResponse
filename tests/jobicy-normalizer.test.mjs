import test from "node:test";
import assert from "node:assert/strict";
import { normalizeJobicyPayload } from "../server/publicFeeds.mjs";

test("Jobicy normalizer preserves salary bounds, currency and period", () => {
  const [job] = normalizeJobicyPayload({
    jobs: [{
      id: 123,
      jobTitle: "QA Engineer",
      companyName: "Example",
      url: "https://jobicy.com/jobs/example",
      jobGeo: "Worldwide",
      salaryMin: 50000,
      salaryMax: 70000,
      salaryCurrency: "usd",
      salaryPeriod: "yearly",
      pubDate: "2026-09-27T10:00:00Z",
      jobType: ["full-time"],
    }],
  });
  assert.ok(job);
  assert.equal(job.salary, "от 50000 до 70000 USD yearly");
});

test("Jobicy normalizer rejects incomplete records", () => {
  assert.deepEqual(normalizeJobicyPayload({ jobs: [{ id: 1, jobTitle: "QA" }] }), []);
});
