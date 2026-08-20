const CHANNEL_RE = /^[A-Za-z0-9_]{5,32}$/;

export function normalizeTelegramChannel(value = "") {
  const raw = String(value).trim().replace(/^https?:\/\/(?:www\.)?t\.me\//i, "").replace(/^@/, "").replace(/^s\//, "");
  const channel = raw.split(/[/?#]/)[0];
  return CHANNEL_RE.test(channel) ? channel : null;
}

export function validateTelegramRequest(searchParams) {
  const raw = searchParams.get("channels") || "";
  const channels = Array.from(new Set(raw.split(",").map(normalizeTelegramChannel).filter(Boolean))).slice(0, 10);
  if (!channels.length) return { ok: false, status: 400, error: "telegram_channels_required" };
  return { ok: true, channels };
}

function decodeHtml(value = "") {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function capture(block, pattern) {
  return block.match(pattern)?.[1] || "";
}

export function normalizeTelegramHtml(html, channel) {
  const blocks = String(html).split(/<div class="tgme_widget_message_wrap[^>]*>/i).slice(1);
  return blocks.map((block) => {
    const post = capture(block, /data-post="([^"]+)"/i);
    if (!post) return null;
    const textHtml = capture(block, /<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i);
    const text = decodeHtml(textHtml);
    if (!text) return null;
    const datetime = capture(block, /<time[^>]+datetime="([^"]+)"/i);
    const timestamp = datetime ? Date.parse(datetime) : 0;
    const url = `https://t.me/${post}`;
    const title = text.length > 120 ? `${text.slice(0, 117).trim()}…` : text;
    return {
      id: `telegram-${post.replace("/", "-")}`,
      title,
      company: `@${channel}`,
      salary: "Зарплата не указана",
      location: "Telegram",
      experience: "Опыт не указан",
      publishedTimestamp: Number.isFinite(timestamp) ? timestamp : 0,
      source: "telegram",
      url,
      sourceUrl: `https://t.me/${channel}`,
      tags: ["Telegram", `@${channel}`],
      description: text,
    };
  }).filter(Boolean);
}

export function filterTelegramResults(results, query = "") {
  const terms = String(query).toLocaleLowerCase("ru-RU").replace(/ё/g, "е").split(/\s+/).filter(Boolean);
  if (!terms.length) return results;
  return results.filter((item) => {
    const haystack = `${item.title} ${item.description || ""} ${item.company}`.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
    return terms.every((term) => haystack.includes(term));
  });
}
