import assert from "node:assert/strict";
import test from "node:test";
import {
  filterTelegramResults,
  normalizeTelegramChannel,
  normalizeTelegramHtml,
  validateTelegramRequest,
} from "../server/telegramPublic.mjs";

test("normalizes Telegram public channel identifiers", () => {
  assert.equal(normalizeTelegramChannel("@some_jobs"), "some_jobs");
  assert.equal(normalizeTelegramChannel("https://t.me/s/some_jobs"), "some_jobs");
  assert.equal(normalizeTelegramChannel("bad!"), null);
});

test("validates and deduplicates channel list", () => {
  const params = new URLSearchParams({ channels: "@some_jobs,https://t.me/s/some_jobs,design_jobs" });
  assert.deepEqual(validateTelegramRequest(params), { ok: true, channels: ["some_jobs", "design_jobs"] });
  assert.equal(validateTelegramRequest(new URLSearchParams()).ok, false);
});

test("extracts public Telegram posts into search results", () => {
  const html = `
    <div class="tgme_widget_message_wrap js-widget_message_wrap">
      <div class="tgme_widget_message" data-post="some_jobs/42">
        <div class="tgme_widget_message_text js-message_text">Senior QA Engineer<br>Remote &amp; full-time</div>
        <time datetime="2026-08-19T10:30:00+00:00"></time>
      </div>
    </div>`;
  const results = normalizeTelegramHtml(html, "some_jobs");
  assert.equal(results.length, 1);
  assert.equal(results[0].source, "telegram");
  assert.equal(results[0].url, "https://t.me/some_jobs/42");
  assert.match(results[0].description, /Remote & full-time/);
  assert.ok(results[0].publishedTimestamp > 0);
});

test("filters Telegram posts by all query terms", () => {
  const jobs = [{ title: "Senior QA Engineer", description: "Remote Python", company: "@jobs" }];
  assert.equal(filterTelegramResults(jobs, "qa remote").length, 1);
  assert.equal(filterTelegramResults(jobs, "qa java").length, 0);
});
