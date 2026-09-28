import test from "node:test";
import assert from "node:assert/strict";
import { searchJobs } from "../src/app/features/search/searchService.ts";

const request = {
  query: "QA инженер",
  areaId: "0",
  salaryFrom: "",
  salaryTo: "",
  salaryCurrency: "RUB",
  workMode: "any",
  location: "",
  employmentType: "any",
  experience: "any",
  sources: ["remocate"],
  page: 0,
};

function vacancy(source, id) {
  return {
    id,
    title: "QA Engineer",
    company: "Acme",
    salary: "Зарплата не указана",
    location: "Remote",
    experience: "Опыт не указан",
    publishedTimestamp: 1780500000000,
    source,
    url: `https://example.test/${source}/${id}`,
    tags: ["QA"],
    description: "Quality assurance engineer",
  };
}

test("search isolates one failed source without dropping successful sources", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === "/api/health") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const parsed = new URL(url, "https://example.test");
    if (parsed.searchParams.get("source") === "remoteok") {
      throw new Error("simulated upstream failure");
    }

    return new Response(JSON.stringify({ results: parsed.searchParams.get("source") === "remocate" ? [vacancy("remocate", "1")] : [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const response = await searchJobs(request);
    assert.equal(response.results.some((item) => item.source === "remocate"), true);
    assert.equal(response.errors.remoteok, "Источник временно недоступен");
    assert.equal(response.attemptedSources.includes("remoteok"), true);
    assert.equal(calls.some((url) => url.includes("source=remocate") && url.includes("q=QA")), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
