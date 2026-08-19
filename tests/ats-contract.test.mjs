import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAtsUrl,
  filterAtsResults,
  normalizeAshby,
  normalizeGreenhouse,
  normalizeLever,
  normalizeRecruitee,
  normalizeSmartRecruiters,
  normalizeWorkable,
} from "../server/atsFeeds.mjs";

const employer = { slug: "example", company: "Example" };

test("buildAtsUrl creates provider-specific public endpoints", () => {
  assert.match(buildAtsUrl({ ...employer, provider: "greenhouse" }), /boards-api\.greenhouse\.io/);
  assert.match(buildAtsUrl({ ...employer, provider: "lever" }), /api\.lever\.co/);
  assert.match(buildAtsUrl({ ...employer, provider: "ashby" }), /api\.ashbyhq\.com/);
  assert.match(buildAtsUrl({ ...employer, provider: "smartrecruiters" }), /api\.smartrecruiters\.com/);
  assert.match(buildAtsUrl({ ...employer, provider: "recruitee" }), /example\.recruitee\.com/);
  assert.match(buildAtsUrl({ ...employer, provider: "workable" }), /workable\.com\/api\/accounts/);
});

test("Greenhouse normalization preserves direct vacancy URL", () => {
  const [job] = normalizeGreenhouse({ jobs: [{ id: 1, title: "Software Engineer", updated_at: "2026-08-01T00:00:00Z", absolute_url: "https://boards.greenhouse.io/example/jobs/1", location: { name: "London" } }] }, { ...employer, provider: "greenhouse" });
  assert.equal(job.source, "greenhouse");
  assert.equal(job.url, "https://boards.greenhouse.io/example/jobs/1");
});

test("Lever normalization maps hostedUrl", () => {
  const [job] = normalizeLever([{ id: "a", text: "Backend Engineer", hostedUrl: "https://jobs.lever.co/example/a", categories: { location: "London", commitment: "Full-time" } }], { ...employer, provider: "lever" });
  assert.equal(job.source, "lever");
  assert.equal(job.experience, "Full-time");
});

test("Ashby ignores unlisted postings and keeps compensation", () => {
  const jobs = normalizeAshby({ jobs: [
    { title: "Listed", isListed: true, jobUrl: "https://jobs.ashbyhq.com/example/1", compensation: { scrapeableCompensationSalarySummary: "£80K - £100K" } },
    { title: "Hidden", isListed: false, jobUrl: "https://jobs.ashbyhq.com/example/2" },
  ] }, { ...employer, provider: "ashby" });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].salary, "£80K - £100K");
});

test("SmartRecruiters creates a public direct job URL", () => {
  const [job] = normalizeSmartRecruiters({ content: [{ id: "42", name: "QA Engineer", company: { identifier: "ExampleCo", name: "Example Co" }, location: { city: "London", country: "GB" } }] }, { ...employer, provider: "smartrecruiters" });
  assert.equal(job.url, "https://jobs.smartrecruiters.com/ExampleCo/42");
});

test("Recruitee and Workable keep public career URLs", () => {
  const [recruitee] = normalizeRecruitee({ offers: [{ id: 7, title: "Designer", careers_url: "https://example.recruitee.com/o/designer", location: "Remote" }] }, { ...employer, provider: "recruitee" });
  const [workable] = normalizeWorkable({ jobs: [{ shortcode: "ABC", title: "Engineer", shortlink: "https://apply.workable.com/j/ABC", city: "London", country: "UK" }] }, { ...employer, provider: "workable" });
  assert.match(recruitee.url, /recruitee/);
  assert.match(workable.url, /workable/);
});

test("ATS query filtering uses title, company, location and tags", () => {
  const input = [
    { title: "Senior React Engineer", company: "A", location: "London", tags: ["Frontend"] },
    { title: "Data Analyst", company: "B", location: "Berlin", tags: ["Analytics"] },
  ];
  assert.equal(filterAtsResults(input, "react london").length, 1);
  assert.equal(filterAtsResults(input, "python").length, 0);
});
