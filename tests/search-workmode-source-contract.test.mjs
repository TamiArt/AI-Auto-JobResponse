import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAshby,
  normalizeLever,
  normalizeRecruitee,
  normalizeSmartRecruiters,
  normalizeWorkable,
} from "../server/atsFeeds.mjs";

function semantics(result, expected) {
  assert.equal(result.workMode, expected.workMode);
  assert.equal(result.employmentType, expected.employmentType);
}

test("ATS normalizers preserve structured work and employment fields", () => {
  const [lever] = normalizeLever([{
    id: "lever-1",
    text: "QA Engineer",
    hostedUrl: "https://jobs.lever.co/acme/lever-1",
    categories: { location: "Berlin", workplaceType: "Hybrid", commitment: "Full-time" },
  }], { company: "Acme" });
  semantics(lever, { workMode: "hybrid", employmentType: "fullTime" });

  const [ashby] = normalizeAshby({ jobs: [{
    jobUrl: "https://jobs.ashbyhq.com/acme/ashby-1",
    title: "QA Engineer",
    workplaceType: "Remote",
    employmentType: "Part-time",
  }] }, { company: "Acme" });
  semantics(ashby, { workMode: "remote", employmentType: "partTime" });

  const [smartRecruiters] = normalizeSmartRecruiters({ content: [{
    id: "sr-1",
    name: "QA Engineer",
    location: { city: "Berlin", remote: true },
    typeOfEmployment: { label: "Full-time" },
  }] }, { company: "Acme", slug: "acme" });
  semantics(smartRecruiters, { workMode: "remote", employmentType: "fullTime" });

  const [recruitee] = normalizeRecruitee({ offers: [{
    id: "recruit-1",
    title: "QA Engineer",
    url: "https://acme.recruitee.com/o/qa-engineer",
    remote: true,
    employment_type: "Contract",
  }] }, { company: "Acme" });
  semantics(recruitee, { workMode: "remote", employmentType: "contract" });

  const [workable] = normalizeWorkable({ jobs: [{
    shortcode: "workable-1",
    title: "QA Engineer",
    shortlink: "https://apply.workable.com/acme/j/workable-1",
    workplace_type: "On-site",
    employment_type: "Full-time",
  }] }, { company: "Acme" });
  semantics(workable, { workMode: "onsite", employmentType: "fullTime" });
});

test("structured ATS semantics do not fall back to conflicting description text", () => {
  const [workable] = normalizeWorkable({ jobs: [{
    shortcode: "workable-2",
    title: "QA Engineer",
    shortlink: "https://apply.workable.com/acme/j/workable-2",
    workplace_type: "On-site",
    employment_type: "Full-time",
    description: "Remote work from home and internship program.",
  }] }, { company: "Acme" });

  assert.equal(workable.workMode, "onsite");
  assert.equal(workable.employmentType, "fullTime");
});
