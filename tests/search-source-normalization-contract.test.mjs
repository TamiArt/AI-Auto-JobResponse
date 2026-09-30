import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRemoteOkPayload,
  normalizeWwrRss,
  normalizeRemotivePayload,
  normalizeJobicyPayload,
  normalizeArbeitnowPayload,
} from "../server/publicFeeds.mjs";
import {
  normalizeGreenhouse,
  normalizeLever,
  normalizeAshby,
  normalizeSmartRecruiters,
  normalizeRecruitee,
  normalizeWorkable,
} from "../server/atsFeeds.mjs";
import { normalizeTrudvsemVacancy } from "../server/trudvsem.mjs";
import { normalizeRemocateHtml } from "../server/remocate.mjs";

function assertSafeJob(job) {
  assert.ok(job);
  assert.match(job.url, /^https?:\/\//i);
  assert.ok(job.title.trim());
  assert.ok(job.id.trim());
}

test("public feed normalizers reject malformed records and keep safe URLs", () => {
  assert.deepEqual(normalizeRemoteOkPayload([{ id: "1", position: "QA", url: "javascript:alert(1)" }]), []);
  const remote = normalizeRemoteOkPayload([{ id: "1", position: "QA Engineer", url: "https://remoteok.com/1", company: "Acme" }]);
  assertSafeJob(remote[0]);

  const wwr = normalizeWwrRss("<rss><channel><item><title>Acme: QA Engineer</title><link>https://weworkremotely.com/jobs/1</link><pubDate>Sun, 27 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>");
  assertSafeJob(wwr[0]);

  assert.equal(normalizeRemotivePayload({ jobs: [{ id: "1", title: "QA", url: "not-a-url" }] }).length, 0);
  assert.equal(normalizeJobicyPayload({ jobs: [{ id: "1", jobTitle: "QA", url: "/job/1" }] }).length, 0);
});

test("Remotive normalization preserves documented remote and employment semantics", () => {
  const [job] = normalizeRemotivePayload({
    jobs: [{
      id: "rem-1",
      title: "QA Engineer",
      company_name: "Acme",
      candidate_required_location: "Worldwide",
      publication_date: "2026-09-29T10:00:00Z",
      url: "https://remotive.com/remote-jobs/software-development/qa-engineer-1",
      category: "Software Development",
      job_type: "Full-time",
      salary: "$70,000 - $90,000",
      description: "<p>Test web applications.</p>",
    }],
  });
  assertSafeJob(job);
  assert.equal(job.workMode, "remote");
  assert.equal(job.employmentType, "fullTime");
  assert.equal(job.location, "Worldwide");
  assert.equal(job.description, "Test web applications.");
});

test("Jobicy normalization preserves documented salary, level, remote and employment fields", () => {
  const [job] = normalizeJobicyPayload({
    jobs: [{
      id: 123,
      url: "https://jobicy.com/jobs/example-role",
      jobTitle: "Senior QA Engineer",
      companyName: "Acme",
      jobType: ["full-time"],
      jobGeo: "Anywhere",
      jobLevel: "Senior",
      jobDescription: "<p>Own automated testing.</p>",
      jobIndustry: ["Engineering"],
      pubDate: "2026-09-29T10:00:00Z",
      salaryMin: 90000,
      salaryMax: 125000,
      salaryCurrency: "USD",
      salaryPeriod: "yearly",
    }],
  });
  assertSafeJob(job);
  assert.equal(job.workMode, "remote");
  assert.equal(job.employmentType, "fullTime");
  assert.equal(job.experience, "Senior");
  assert.equal(job.location, "Anywhere");
  assert.equal(job.description, "Own automated testing.");
  assert.match(job.salary, /90000/);
  assert.match(job.salary, /125000/);
  assert.match(job.salary, /USD/);
  assert.match(job.salary, /yearly/);
});

test("Arbeitnow normalization preserves remote flag and salary data", () => {
  const [job] = normalizeArbeitnowPayload({
    data: [{
      slug: "qa-1",
      title: "QA Engineer",
      company_name: "Acme",
      url: "https://www.arbeitnow.com/jobs/qa-1",
      remote: true,
      salary_range: "$50,000-$70,000",
      job_types: ["Full-time"],
    }],
  });
  assertSafeJob(job);
  assert.equal(job.workMode, "remote");
  assert.match(job.salary, /50,000/);
});

test("ATS normalizers accept provider payloads only when a direct URL can be built", () => {
  const employer = { provider: "greenhouse", slug: "acme", company: "Acme" };
  assertSafeJob(normalizeGreenhouse({ jobs: [{ id: 1, title: "QA", absolute_url: "https://boards.greenhouse.io/acme/jobs/1", updated_at: "2026-09-27" }] }, employer)[0]);
  assertSafeJob(normalizeLever([{ id: "1", text: "QA", hostedUrl: "https://jobs.lever.co/acme/1", categories: {} }], { ...employer, provider: "lever" })[0]);
  assertSafeJob(normalizeAshby({ jobs: [{ jobUrl: "https://jobs.ashbyhq.com/acme/1", title: "QA", isListed: true }] }, { ...employer, provider: "ashby" })[0]);
  assertSafeJob(normalizeSmartRecruiters({ content: [{ id: "1", name: "QA", company: { identifier: "acme", name: "Acme" } }] }, { ...employer, provider: "smartrecruiters" })[0]);
  assertSafeJob(normalizeRecruitee({ offers: [{ id: 1, title: "QA", careers_url: "https://acme.recruitee.com/o/qa" }] }, { ...employer, provider: "recruitee" })[0]);
  assertSafeJob(normalizeWorkable({ jobs: [{ shortcode: "1", title: "QA", url: "https://apply.workable.com/acme/j/1/" }] }, { ...employer, provider: "workable" })[0]);
});

test("Trudvsem and Remocate reject unusable vacancies", () => {
  assert.equal(normalizeTrudvsemVacancy({ id: "1", "job-name": "QA" }), null);

  const [job] = normalizeRemocateHtml('<a href="/jobs/qa-engineer">Quality Assurance Engineer</a><span>Remote</span>');
  assertSafeJob(job);
  assert.equal(job.source, "remocate");
});
