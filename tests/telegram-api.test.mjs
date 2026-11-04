import assert from "node:assert/strict";
import test from "node:test";
import handler from "../api/jobs.mjs";

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

function request(channels) {
  return {
    method: "GET",
    url: `/api/jobs?source=telegram&channels=${channels}`,
    headers: { host: "localhost" },
  };
}

const postHtml = (channel, id, text = "QA Engineer remote") => `
  <div class="tgme_widget_message_wrap js-widget_message_wrap">
    <div class="tgme_widget_message" data-post="${channel}/${id}">
      <div class="tgme_widget_message_text js-message_text">${text}</div>
      <time datetime="2026-10-10T10:30:00+00:00"></time>
    </div>
  </div>`;

test("Telegram public snapshot gets a query-independent per-channel CDN TTL", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://t.me/s/qa_jobs");
    return { ok: true, status: 200, text: async () => postHtml("qa_jobs", "42") };
  };
  try {
    const response = createResponse();
    await handler(request("qa_jobs"), response);
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.equal(payload.results.length, 1);
    assert.equal(payload.results[0].url, "https://t.me/qa_jobs/42");
    assert.match(response.getHeader("vercel-cdn-cache-control"), /s-maxage=300/);
    assert.deepEqual(payload.meta.failedChannels, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("all failed Telegram channels return a non-cacheable upstream error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503, text: async () => "" });
  try {
    const response = createResponse();
    await handler(request("qa_jobs"), response);
    assert.equal(response.statusCode, 502);
    assert.equal(JSON.parse(response.body).error, "telegram_channels_unavailable");
    assert.equal(response.getHeader("vercel-cdn-cache-control"), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("partial Telegram channel failure preserves successful posts without caching a partial snapshot", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/s/broken_jobs")) return { ok: false, status: 503, text: async () => "" };
    return { ok: true, status: 200, text: async () => postHtml("qa_jobs", "42") };
  };
  try {
    const response = createResponse();
    await handler(request("qa_jobs,broken_jobs"), response);
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    assert.equal(payload.results.length, 1);
    assert.deepEqual(payload.meta.failedChannels, ["broken_jobs"]);
    assert.equal(response.getHeader("vercel-cdn-cache-control"), undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
