import test from "node:test";
import assert from "node:assert/strict";
import { formatSourceError } from "../src/app/features/search/searchService.ts";

test("source errors explain rate limiting without exposing internals", () => {
  assert.equal(formatSourceError(new Error("HTTP 429")), "Источник ограничил частоту запросов. Попробуйте позже");
});

test("source errors explain access and server failures", () => {
  assert.equal(formatSourceError(new Error("HTTP 403")), "Источник отклонил запрос или требует дополнительного доступа");
  assert.equal(formatSourceError(new Error("HTTP 503")), "На стороне источника временная ошибка");
  assert.equal(formatSourceError(new Error("HTTP 404")), "Источник не смог обработать запрос");
});

test("source errors explain timeout and network failures", () => {
  const timeout = new Error("aborted");
  timeout.name = "AbortError";
  assert.equal(formatSourceError(timeout), "Источник не ответил вовремя");
  assert.equal(formatSourceError(new TypeError("Failed to fetch")), "Не удалось подключиться к источнику");
  assert.equal(formatSourceError(new Error("unexpected internal detail")), "Источник временно недоступен");
});
