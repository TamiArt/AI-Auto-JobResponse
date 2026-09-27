import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

function hexHmac(key, value) {
  return createHmac("sha256", key).update(value).digest("hex");
}

export function validateTelegramInitData(initData, botToken, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof initData !== "string" || !initData.trim() || typeof botToken !== "string" || !botToken.trim()) {
    return { ok: false, error: "invalid_init_data" };
  }
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") || "";
  const authDate = Number(params.get("auth_date") || 0);
  if (!/^[a-f0-9]{64}$/i.test(hash) || !Number.isInteger(authDate) || authDate <= 0 || authDate > nowSeconds + 60 || nowSeconds - authDate > MAX_INIT_DATA_AGE_SECONDS) {
    return { ok: false, error: "invalid_init_data" };
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = Buffer.from(hexHmac(secretKey, dataCheckString), "hex");
  const actual = Buffer.from(hash, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, error: "invalid_init_data" };
  }

  let user = null;
  const rawUser = params.get("user");
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      if (parsed && Number.isInteger(parsed.id)) user = parsed;
    } catch {
      return { ok: false, error: "invalid_init_data" };
    }
  }
  return { ok: true, authDate, user };
}

export function validateTelegramWebhookSecret(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string" || !received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
