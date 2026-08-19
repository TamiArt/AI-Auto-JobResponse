import test from "node:test";
import assert from "node:assert/strict";
import { CACHE_SECONDS, handleHealth, handleSource, handleStatus, SOURCE_NAMES } from "../api/_shared.mjs";
import { HH_USER_AGENT } from "../server/hh.mjs";

function createResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: "",
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    status(code) { this.statusCode = code; return this; },
    end(body = "") { this.body = body; return this; },
  };
}

test("Vercel health endpoint exposes capability contract", () => {
  const response = createResponse();
  handleHealth({ method: "GET", headers: { host: "localhost" }, url: "/api/health" }, response);
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.runtime, "vercel");
  assert.ok(body.sources.includes("hh"));
  assert.deepEqual(body.sources, SOURCE_NAMES);
  assert.equal(response.getHeader("cache-control"), "no-store");
  assert.equal(response.getHeader("x-content-type-options"), "nosniff");
});

test("Vercel status reports CDN cache windows without upstream calls", () => {
  const response = createResponse();
  handleStatus({ method: "GET", headers: { host: "localhost" }, url: "/api/status" }, response);
  const body = JSON.parse(response.body);
  assert.equal(body.runtime, "vercel-function");
  assert.equal(body.cache, "vercel-cdn");
  assert.equal(body.cacheSeconds.hh, 300);
  assert.equal(body.cacheSeconds.jobicy, 3600);
  assert.equal(body.cacheSeconds.remotive, 21600);
  assert.equal(body.cacheSeconds.ats, 1800);
  assert.deepEqual(body.cacheSeconds, CACHE_SECONDS);
});

test("HH is proxied server-side with required client identity headers", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamUrl = "";
  let upstreamHeaders;
  globalThis.fetch = async (url, init = {}) => {
    upstreamUrl = String(url);
    upstreamHeaders = init.headers;
    return new Response(JSON.stringify({ items: [], page: 0, pages: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = createResponse();
    await handleSource("hh", {
      method: "GET",
      headers: { host: "localhost" },
      url: "/api/jobs/hh?q=QA%20engineer&area=1&salary=200000&page=0",
    }, response);
    assert.equal(response.statusCode, 200);
    assert.match(upstreamUrl, /^https:\/\/api\.hh\.ru\/vacancies\?/);
    assert.match(upstreamUrl, /text=QA(?:\+|%20)engineer/);
    assert.equal(upstreamHeaders["HH-User-Agent"], HH_USER_AGENT);
    assert.equal(upstreamHeaders["User-Agent"], HH_USER_AGENT);
    assert.equal(response.getHeader("vercel-cdn-cache-control").includes("s-maxage=300"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HH upstream 403 is converted to graceful JSON instead of browser network failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("Forbidden", { status: 403 });
  try {
    const response = createResponse();
    await handleSource("hh", {
      method: "GET",
      headers: { host: "localhost" },
      url: "/api/jobs/hh?q=QA&area=1&page=0",
    }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).unavailable, "captcha_or_access_restriction");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Vercel API rejects non-GET health requests", () => {
  const response = createResponse();
  handleHealth({ method: "POST", headers: { host: "localhost" }, url: "/api/health" }, response);
  assert.equal(response.statusCode, 405);
  assert.deepEqual(JSON.parse(response.body), { error: "method_not_allowed" });
});
