import test from "node:test";
import assert from "node:assert/strict";
import { CACHE_SECONDS, handleHealth, handleStatus, SOURCE_NAMES } from "../api/_shared.mjs";

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
  assert.equal(body.cacheSeconds.jobicy, 3600);
  assert.equal(body.cacheSeconds.remotive, 21600);
  assert.equal(body.cacheSeconds.ats, 1800);
  assert.deepEqual(body.cacheSeconds, CACHE_SECONDS);
});

test("Vercel API rejects non-GET health requests", () => {
  const response = createResponse();
  handleHealth({ method: "POST", headers: { host: "localhost" }, url: "/api/health" }, response);
  assert.equal(response.statusCode, 405);
  assert.deepEqual(JSON.parse(response.body), { error: "method_not_allowed" });
});
