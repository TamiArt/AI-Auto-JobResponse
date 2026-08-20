import { sendJson } from "../_shared.mjs";
import { filterTelegramResults, normalizeTelegramHtml, validateTelegramRequest } from "../../server/telegramPublic.mjs";

const TIMEOUT_MS = 12_000;

async function fetchChannel(channel) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`https://t.me/s/${encodeURIComponent(channel)}`, {
      signal: controller.signal,
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; HuntPulse/0.1; +https://github.com/TamiArt/AI-Auto-JobResponse)",
      },
    });
    if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
    return normalizeTelegramHtml(await response.text(), channel);
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(request, response) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "method_not_allowed" });
  const url = new URL(request.url || "/", `https://${request.headers?.host || "localhost"}`);
  const validation = validateTelegramRequest(url.searchParams);
  if (!validation.ok) return sendJson(response, validation.status, { error: validation.error });
  const query = url.searchParams.get("q") || "";

  const settled = await Promise.allSettled(validation.channels.map(fetchChannel));
  const results = settled.flatMap((entry) => entry.status === "fulfilled" ? entry.value : []);
  const failedChannels = validation.channels.filter((_, index) => settled[index].status === "rejected");
  return sendJson(response, 200, {
    results: filterTelegramResults(results, query),
    meta: { channels: validation.channels, failedChannels, lastUpdated: Date.now() },
  }, 300);
}
