export const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
});

export function withSecurityHeaders(extra = {}) {
  return { ...SECURITY_HEADERS, ...extra };
}

export function summarizeCache(cache) {
  const rows = Array.from(cache.values());
  const timestamps = (key) => rows.map((row) => row?.[key]).filter((value) => Number.isFinite(value) && value > 0);
  const lastUpdated = timestamps("lastUpdated");
  const nextRefresh = timestamps("nextRefresh");
  return {
    entries: rows.length,
    staleEntries: rows.filter((row) => row?.stale === true).length,
    lastUpdated: lastUpdated.length ? Math.max(...lastUpdated) : null,
    nextRefresh: nextRefresh.length ? Math.min(...nextRefresh) : null,
  };
}

export function createRuntimeStatus({ feedCache, atsCache, upstreamTimeoutMs, atsConcurrency }) {
  return {
    ok: true,
    uptimeSeconds: Math.floor(process.uptime()),
    cache: {
      feeds: summarizeCache(feedCache),
      ats: summarizeCache(atsCache),
    },
    limits: {
      upstreamTimeoutMs,
      atsConcurrency,
    },
  };
}
