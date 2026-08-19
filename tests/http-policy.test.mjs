import test from "node:test";
import assert from "node:assert/strict";
import { SECURITY_HEADERS, createRuntimeStatus, summarizeCache, withSecurityHeaders } from "../server/httpPolicy.mjs";

test("security headers are present and can be extended", () => {
  const headers = withSecurityHeaders({ "Content-Type": "application/json" });
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Permissions-Policy"], "camera=(), microphone=(), geolocation=()");
  assert.equal(headers["Content-Type"], "application/json");
  assert.deepEqual(Object.keys(SECURITY_HEADERS).sort(), [
    "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options",
  ].sort());
});

test("cache summary exposes local freshness without upstream requests", () => {
  const cache = new Map([
    ["a", { lastUpdated: 100, nextRefresh: 500, stale: false }],
    ["b", { lastUpdated: 200, nextRefresh: 400, stale: true }],
  ]);
  assert.deepEqual(summarizeCache(cache), {
    entries: 2,
    staleEntries: 1,
    lastUpdated: 200,
    nextRefresh: 400,
  });
});

test("runtime status reports process-local cache and limits", () => {
  const status = createRuntimeStatus({
    feedCache: new Map([["feed", { lastUpdated: 10, nextRefresh: 20, stale: false }]]),
    atsCache: new Map(),
    upstreamTimeoutMs: 12000,
    atsConcurrency: 4,
  });
  assert.equal(status.ok, true);
  assert.equal(status.cache.feeds.entries, 1);
  assert.equal(status.cache.ats.entries, 0);
  assert.equal(status.limits.upstreamTimeoutMs, 12000);
  assert.equal(status.limits.atsConcurrency, 4);
  assert.equal(Number.isInteger(status.uptimeSeconds), true);
});
