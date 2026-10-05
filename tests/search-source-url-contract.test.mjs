import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAshby,
  normalizeGreenhouse,
  normalizeLever,
  normalizeRecruitee,
  normalizeSmartRecruiters,
  normalizeWorkable,
} from "../server/atsFeeds.mjs";
import {
  normalizeArbeitnowPayload,
  normalizeJobicyPayload,
  normalizeRemotivePayload,
  normalizeRemoteOkPayload,
  normalizeWwrRss,
} from "../server/publicFeeds.mjs";

function assertBrowserVacancyUrl(result, expectedHost) {
  assert.ok(result);
  const url = new URL(result.url);
  assert.equal(url.protocol, "https:");
  assert.equal(url.hostname, expectedHost);
  assert.ok(!/\/api(?:\/|$)|\/v\d+(?:\/|$)/i.test(url.pathname), result.url);
}

test("Greenhouse normalizer keeps the source hosted vacancy URL", () => {
  const [result] = normalizeGreenhouse(
    { jobs: [{ id: 101, title: "QA Engineer", absolute_url: "https://boards.greenhouse.io/acme/jobs/101" }] },
    { company: "Acme" },
  );

  assertBrowserVacancyUrl(result, "boards.greenhouse.io");
  assert.equal(result.url, "https://boards.greenhouse.io/acme/jobs/101");
});

test("Lever normalizer prefers the hosted vacancy page over the apply endpoint", () => {
  const [result] = normalizeLever(
    [{
      id: "lever-1",
      text: "QA Engineer",
      hostedUrl: "https://jobs.lever.co/acme/lever-1",
      applyUrl: "https://jobs.lever.co/acme/lever-1/apply",
    }],
    { company: "Acme" },
  );

  assertBrowserVacancyUrl(result, "jobs.lever.co");
  assert.equal(result.url, "https://jobs.lever.co/acme/lever-1");
});

test("Lever normalizer retains a browser apply URL when no hosted page is supplied", () => {
  const [result] = normalizeLever(
    [{
      id: "lever-2",
      text: "QA Engineer",
      applyUrl: "https://jobs.lever.co/acme/lever-2/apply",
    }],
    { company: "Acme" },
  );

  assertBrowserVacancyUrl(result, "jobs.lever.co");
  assert.equal(result.url, "https://jobs.lever.co/acme/lever-2/apply");
});

test("Ashby normalizer uses the hosted job page instead of the apply page", () => {
  const [result] = normalizeAshby(
    {
      jobs: [{
        jobUrl: "https://jobs.ashbyhq.com/acme/abc",
        applyUrl: "https://jobs.ashbyhq.com/acme/abc/application",
        title: "QA Engineer",
        isListed: true,
      }],
    },
    { company: "Acme" },
  );

  assertBrowserVacancyUrl(result, "jobs.ashbyhq.com");
  assert.equal(result.url, "https://jobs.ashbyhq.com/acme/abc");
});

test("SmartRecruiters normalizer constructs a public job-board URL, not an API URL", () => {
  const [result] = normalizeSmartRecruiters(
    {
      content: [{
        id: "12345",
        name: "QA Engineer",
        company: { identifier: "Acme", name: "Acme" },
      }],
    },
    { company: "Acme", slug: "Acme" },
  );

  assertBrowserVacancyUrl(result, "jobs.smartrecruiters.com");
  assert.equal(result.url, "https://jobs.smartrecruiters.com/Acme/12345");
});

test("Recruitee normalizer preserves the public careers URL", () => {
  const [result] = normalizeRecruitee(
    {
      offers: [{
        id: 77,
        title: "QA Engineer",
        careers_url: "https://acme.recruitee.com/o/qa-engineer",
      }],
    },
    { company: "Acme" },
  );

  assertBrowserVacancyUrl(result, "acme.recruitee.com");
  assert.equal(result.url, "https://acme.recruitee.com/o/qa-engineer");
});

test("Workable normalizer prefers the public shortlink over the application endpoint", () => {
  const [result] = normalizeWorkable(
    {
      jobs: [{
        shortcode: "QA1",
        title: "QA Engineer",
        shortlink: "https://apply.workable.com/acme/j/QA1/",
        application_url: "https://apply.workable.com/acme/j/QA1/",
      }],
    },
    { company: "Acme" },
  );

  assertBrowserVacancyUrl(result, "apply.workable.com");
  assert.equal(result.url, "https://apply.workable.com/acme/j/QA1/");
});

test("Remote OK normalizer keeps the source vacancy URL", () => {
  const [result] = normalizeRemoteOkPayload([{
    id: 1,
    position: "QA Engineer",
    url: "https://remoteok.com/remote-jobs/1-qa-engineer",
  }]);

  assertBrowserVacancyUrl(result, "remoteok.com");
});

test("Arbeitnow normalizer rejects non-vacancy URLs instead of exposing them as job links", () => {
  const [result] = normalizeArbeitnowPayload({
    data: [{
      slug: "qa-engineer",
      title: "QA Engineer",
      url: "https://example.com/company",
    }],
  });

  assert.equal(result, undefined);
});

test("Arbeitnow normalizer keeps a verified job-detail URL", () => {
  const [result] = normalizeArbeitnowPayload({
    data: [{
      slug: "qa-engineer",
      title: "QA Engineer",
      url: "https://arbeitnow.com/jobs/qa-engineer",
    }],
  });

  assertBrowserVacancyUrl(result, "arbeitnow.com");
});

test("We Work Remotely RSS normalizer keeps the listing URL", () => {
  const [result] = normalizeWwrRss(
    "<rss><channel><item><title>Acme: QA Engineer</title><link>https://weworkremotely.com/remote-jobs/acme-qa-engineer</link><guid>job-1</guid></item></channel></rss>",
  );

  assertBrowserVacancyUrl(result, "weworkremotely.com");
});

test("Remotive normalizer keeps the public listing URL", () => {
  const [result] = normalizeRemotivePayload({
    jobs: [{
      id: 1,
      title: "QA Engineer",
      url: "https://remotive.com/remote-jobs/software-dev/qa-engineer-1",
    }],
  });

  assertBrowserVacancyUrl(result, "remotive.com");
});

test("Jobicy normalizer keeps the public listing URL", () => {
  const [result] = normalizeJobicyPayload({
    jobs: [{
      id: 1,
      jobTitle: "QA Engineer",
      url: "https://jobicy.com/jobs/qa-engineer-1",
    }],
  });

  assertBrowserVacancyUrl(result, "jobicy.com");
});
