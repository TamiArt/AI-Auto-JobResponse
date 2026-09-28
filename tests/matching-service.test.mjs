import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMatch, buildMatchingRequest, sortByProfileMatch } from "../src/app/features/matching/matchingService.ts";

const profile = {
  name: "Test",
  headline: "QA Engineer",
  targetRoles: ["QA Engineer"],
  location: "London",
  workMode: "remote",
  salary: "",
  languages: [],
  skills: [
    { id: "1", name: "Playwright", category: "testing", level: "advanced", confidence: "confirmed" },
    { id: "2", name: "SQL", category: "testing", level: "intermediate", confidence: "confirmed" },
  ],
  experience: [],
  projects: [],
  goals: [],
  constraints: [],
  updatedAt: "",
};

const job = {
  id: "job-1",
  title: "QA Engineer",
  company: "Example",
  salary: "€3000",
  location: "London",
  experience: "1-3 years",
  workMode: "remote",
  employmentType: "fullTime",
  publishedAt: "28 Sep 2026",
  publishedTimestamp: 100,
  source: "remocate",
  url: "https://example.com/jobs/1",
  tags: ["Playwright", "SQL"],
  description: "QA Engineer using Playwright and SQL.",
};

test("matching is explainable and does not treat unknown work mode as a match", () => {
  const result = analyzeMatch(profile, job);
  assert.equal(result.score, 100);
  assert.equal(result.criteria.find((item) => item.id === "role")?.status, "matched");
  assert.equal(result.criteria.find((item) => item.id === "skills")?.status, "matched");
  assert.equal(result.criteria.find((item) => item.id === "workMode")?.status, "matched");

  const unknownJob = { ...job, workMode: "unknown" };
  const unknown = analyzeMatch(profile, unknownJob);
  assert.equal(unknown.criteria.find((item) => item.id === "workMode")?.status, "unknown");
  assert.equal(unknown.score, 85);
});

test("matching never mutates the search request with Career Profile criteria", () => {
  const request = buildMatchingRequest({
    jobTitle: "QA Engineer",
    areaId: "1",
    salaryFrom: "",
    experience: "any",
    telegramChannels: [],
    workMode: "any",
  });
  assert.equal(request.query, "QA Engineer");
  assert.equal(request.workMode, "any");
  assert.equal(request.salaryFrom, "");
  assert.equal(request.sources.includes("hh"), true);
});

test("profile sorting is deterministic and only happens after search results exist", () => {
  const weaker = { ...job, id: "job-2", title: "Frontend Developer", tags: ["React"], description: "Frontend Developer", publishedTimestamp: 200 };
  const sorted = sortByProfileMatch(profile, [weaker, job]);
  assert.equal(sorted[0].job.id, "job-1");
  assert.equal(sorted[1].job.id, "job-2");
});
