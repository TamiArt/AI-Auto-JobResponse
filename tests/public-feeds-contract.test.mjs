import test from "node:test";
import assert from "node:assert/strict";
import {
  filterPublicFeedResults,
  normalizeJobicyPayload,
  normalizeRemoteOkPayload,
  normalizeRemotivePayload,
  normalizeWwrRss,
  validatePublicFeedQuery,
} from "../server/publicFeeds.mjs";

test("normalizes Remote OK jobs and ignores metadata rows", () => {
  const jobs = normalizeRemoteOkPayload([
    { legal: "metadata" },
    {
      id: "42",
      position: "Senior React Developer",
      company: "Acme",
      location: "Worldwide",
      epoch: 1_700_000_000,
      tags: ["react", "typescript"],
      salary_min: 100000,
      salary_max: 140000,
      url: "https://remoteok.com/remote-jobs/42",
    },
  ]);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, "remoteok-42");
  assert.equal(jobs[0].company, "Acme");
  assert.equal(jobs[0].publishedTimestamp, 1_700_000_000_000);
  assert.match(jobs[0].salary, /100,000/);
});

test("rejects unsafe Remote OK urls", () => {
  const jobs = normalizeRemoteOkPayload([{ id: "1", position: "Dev", url: "javascript:alert(1)" }]);
  assert.deepEqual(jobs, []);
});

test("normalizes We Work Remotely RSS items", () => {
  const xml = `<?xml version="1.0"?><rss><channel><item>
    <title><![CDATA[Example Co: Product Designer]]></title>
    <link>https://weworkremotely.com/remote-jobs/example</link>
    <guid>https://weworkremotely.com/remote-jobs/example</guid>
    <pubDate>Tue, 18 Aug 2026 10:00:00 GMT</pubDate>
    <region>Anywhere in the World</region>
    <category>Design</category>
    <type>Full-Time</type>
  </item></channel></rss>`;
  const jobs = normalizeWwrRss(xml);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].company, "Example Co");
  assert.equal(jobs[0].title, "Product Designer");
  assert.deepEqual(jobs[0].tags, ["Design", "Full-Time"]);
});

test("normalizes Remotive jobs and keeps canonical URL", () => {
  const [job] = normalizeRemotivePayload({ jobs: [{
    id: 7,
    title: "Backend Engineer",
    company_name: "Example",
    candidate_required_location: "Europe",
    publication_date: "2026-08-18T10:00:00Z",
    category: "Software Development",
    job_type: "full_time",
    salary: "$90k-$120k",
    url: "https://remotive.com/remote/jobs/example-7",
  }] });
  assert.equal(job.id, "remotive-7");
  assert.equal(job.url, "https://remotive.com/remote/jobs/example-7");
  assert.equal(job.salary, "$90k-$120k");
});

test("normalizes Jobicy jobs and salary fields", () => {
  const [job] = normalizeJobicyPayload({ jobs: [{
    id: 9,
    jobTitle: "Product Designer",
    companyName: "Example",
    jobGeo: "Anywhere",
    jobIndustry: ["Creative & Design"],
    jobType: ["full-time"],
    pubDate: "2026-08-18T10:00:00Z",
    salaryMin: 90000,
    salaryMax: 125000,
    salaryCurrency: "USD",
    url: "https://jobicy.com/jobs/example-role",
  }] });
  assert.equal(job.id, "jobicy-9");
  assert.equal(job.url, "https://jobicy.com/jobs/example-role");
  assert.match(job.salary, /90000/);
});

test("filters public feeds by all query terms", () => {
  const jobs = [
    { title: "Senior React Developer", company: "Acme", location: "Remote", tags: ["typescript"] },
    { title: "Product Designer", company: "Beta", location: "Remote", tags: ["figma"] },
  ];
  assert.equal(filterPublicFeedResults(jobs, "react typescript").length, 1);
  assert.equal(filterPublicFeedResults(jobs, "react figma").length, 0);
});

test("validates public feed query boundaries", () => {
  assert.deepEqual(validatePublicFeedQuery(""), { ok: false, status: 400, error: "query_required" });
  assert.equal(validatePublicFeedQuery("developer").ok, true);
  assert.deepEqual(validatePublicFeedQuery("x".repeat(161)), { ok: false, status: 400, error: "invalid_parameters" });
});
