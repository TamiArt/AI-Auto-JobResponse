import test from "node:test";
import assert from "node:assert/strict";
import { filterPublicFeedResults } from "../server/publicFeeds.mjs";
import { filterAtsResults } from "../server/atsFeeds.mjs";

const jobs = [
  { title: "QA Engineer", company: "Acme", location: "Remote", tags: ["Testing"] },
  { title: "Product Designer", company: "Beta", location: "Berlin", tags: ["Figma"] },
];

test("empty query returns the complete normalized public-feed snapshot", () => {
  assert.deepEqual(filterPublicFeedResults(jobs, ""), jobs);
});

test("empty query returns the complete normalized ATS snapshot", () => {
  assert.deepEqual(filterAtsResults(jobs, ""), jobs);
});
