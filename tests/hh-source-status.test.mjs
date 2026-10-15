import test from "node:test";
import assert from "node:assert/strict";
import { handleSource } from "../api/_shared.mjs";

async function requestHh(t, fetchImpl) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    end(body) { this.body = body; return this; },
  };
  await handleSource(
    "hh",
    { method: "GET", url: "/api/jobs/hh?q=QA", headers: { host: "localhost" } },
    response,
  );
  return { status: response.statusCode, body: JSON.parse(response.body) };
}

test("HH successful empty response remains a valid empty search", async (t) => {
  const result = await requestHh(t, async () => new Response(JSON.stringify({ items: [], page: 0, pages: 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { items: [], page: 0, pages: 0 });
  assert.equal(result.body.sourceStatus, undefined);
});

test("HH 403 is reported as access restriction, not an empty result", async (t) => {
  const result = await requestHh(t, async () => new Response("Forbidden", { status: 403 }));
  assert.equal(result.status, 503);
  assert.equal(result.body.sourceStatus, "access_restricted");
  assert.equal(result.body.items, undefined);
});

test("HH 429 is reported as rate limiting", async (t) => {
  const result = await requestHh(t, async () => new Response("Too Many Requests", { status: 429 }));
  assert.equal(result.status, 429);
  assert.equal(result.body.sourceStatus, "rate_limited");
});

test("HH other upstream HTTP errors are explicit and do not look successful", async (t) => {
  const result = await requestHh(t, async () => new Response("Internal Server Error", { status: 500 }));
  assert.equal(result.status, 502);
  assert.equal(result.body.sourceStatus, "upstream_error");
  assert.equal(result.body.items, undefined);
});

test("HH timeout is represented by a distinct source status", async (t) => {
  const result = await requestHh(t, async () => { throw new DOMException("Aborted", "AbortError"); });
  assert.equal(result.status, 504);
  assert.equal(result.body.sourceStatus, "timeout");
});

test("HH malformed JSON is represented as an invalid upstream response", async (t) => {
  const result = await requestHh(t, async () => new Response("{not-json", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
  assert.equal(result.status, 502);
  assert.equal(result.body.sourceStatus, "invalid_response");
});

test("HH failure handling remains source-local and UI links to the official search", async () => {
  const fs = await import("node:fs/promises");
  const service = await fs.readFile(new URL("../src/app/features/search/searchService.ts", import.meta.url), "utf8");
  const panel = await fs.readFile(new URL("../src/app/features/search/SearchPanel.tsx", import.meta.url), "utf8");
  assert.match(service, /Promise\.allSettled\(sources\.map/);
  assert.match(service, /hhSourceErrorMessage/);
  assert.match(panel, /https:\/\/hh\.ru\/search\/vacancy/);
});
