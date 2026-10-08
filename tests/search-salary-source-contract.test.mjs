import test from "node:test";
import assert from "node:assert/strict";

import { normalizeAshby } from "../server/atsFeeds.mjs";
import { normalizeJobicyPayload, normalizeRemoteOkPayload } from "../server/publicFeeds.mjs";
import { normalizeSalary } from "../src/app/features/search/searchFilters.js";

test("Jobicy salary fields survive normalization with bounds, currency and period", () => {
  const [result] = normalizeJobicyPayload({
    jobs: [{
      id: 123,
      jobTitle: "QA Engineer",
      url: "https://jobicy.com/jobs/qa-engineer",
      annualSalaryMin: 90000,
      annualSalaryMax: 125000,
      salaryCurrency: "USD",
      salaryPeriod: "yearly",
    }],
  });

  assert.equal(result.salary, "от 90000 до 125000 USD yearly");
  assert.deepEqual(normalizeSalary(result.salary), {
    min: 90000,
    max: 125000,
    currency: "USD",
    period: "year",
    originalText: "от 90000 до 125000 USD yearly",
  });
});

test("Remote OK salary bounds preserve lower-only and upper-only semantics", () => {
  const [lower] = normalizeRemoteOkPayload([{
    id: 1, position: "QA Engineer", url: "https://remoteok.com/remote-jobs/1",
    salary_min: 80000, salary_max: 0,
  }]);
  const [upper] = normalizeRemoteOkPayload([{
    id: 2, position: "QA Engineer", url: "https://remoteok.com/remote-jobs/2",
    salary_min: 0, salary_max: 100000,
  }]);

  assert.equal(lower.salary, "от $80,000");
  assert.equal(upper.salary, "до $100,000");
  assert.equal(normalizeSalary(lower.salary).min, 80000);
  assert.equal(normalizeSalary(upper.salary).max, 100000);
});

test("Ashby compensation summary remains parseable as a salary range", () => {
  const [result] = normalizeAshby({
    jobs: [{
      jobUrl: "https://jobs.ashbyhq.com/acme/qa",
      title: "QA Engineer",
      compensation: {
        scrapeableCompensationSalarySummary: "$81K - $87K",
        compensationTierSummary: "$81K – $87K • Offers Bonus",
      },
    }],
  }, { company: "Acme" });

  assert.equal(result.salary, "$81K - $87K");
  const normalized = normalizeSalary(result.salary);
  assert.equal(normalized.min, 81000);
  assert.equal(normalized.max, 87000);
  assert.equal(normalized.currency, "USD");
});
