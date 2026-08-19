import test from "node:test";
import assert from "node:assert/strict";
import { ATS_CACHE_MS, ATS_CONCURRENCY, ATS_EMPLOYERS } from "../server/atsRegistry.mjs";

const SUPPORTED_PROVIDERS = new Set([
  "greenhouse", "lever", "ashby", "smartrecruiters", "recruitee", "workable",
]);

test("ATS registry contains only supported providers and complete entries", () => {
  assert.ok(ATS_EMPLOYERS.length >= 30);
  for (const employer of ATS_EMPLOYERS) {
    assert.ok(SUPPORTED_PROVIDERS.has(employer.provider), `unsupported provider: ${employer.provider}`);
    assert.equal(typeof employer.slug, "string");
    assert.ok(employer.slug.trim(), "employer slug must not be empty");
    assert.equal(typeof employer.company, "string");
    assert.ok(employer.company.trim(), "company name must not be empty");
  }
});

test("ATS provider + slug pairs are unique", () => {
  const keys = ATS_EMPLOYERS.map((employer) => `${employer.provider}:${employer.slug.toLowerCase()}`);
  assert.equal(new Set(keys).size, keys.length);
});

test("ATS cache and concurrency stay conservative", () => {
  assert.ok(ATS_CACHE_MS >= 10 * 60 * 1000);
  assert.ok(ATS_CONCURRENCY >= 1 && ATS_CONCURRENCY <= 6);
});
