import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { validateTelegramInitData, validateTelegramWebhookSecret } from "../server/telegramSecurity.mjs";

function makeInitData(botToken, authDate) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAEAAAE",
    user: JSON.stringify({ id: 42, first_name: "Test" }),
  });
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

test("Telegram Mini App initData validates with Telegram's HMAC scheme", () => {
  const initData = makeInitData("123456:ABC", 1_000_000);
  assert.equal(validateTelegramInitData(initData, "123456:ABC", 1_000_000).ok, true);
});

test("Telegram Mini App rejects tampered, expired and future initData", () => {
  const valid = makeInitData("123456:ABC", 1_000_000);
  assert.equal(validateTelegramInitData(valid.replace("Test", "Other"), "123456:ABC", 1_000_000).ok, false);
  assert.equal(validateTelegramInitData(valid, "123456:ABC", 1_086_401).ok, false);
  assert.equal(validateTelegramInitData(makeInitData("123456:ABC", 1_000_100), "123456:ABC", 1_000_000).ok, false);
});

test("Telegram webhook secret comparison is constant-time and exact", () => {
  assert.equal(validateTelegramWebhookSecret("secret", "secret"), true);
  assert.equal(validateTelegramWebhookSecret("secret", "other"), false);
  assert.equal(validateTelegramWebhookSecret("short", "longer"), false);
});
