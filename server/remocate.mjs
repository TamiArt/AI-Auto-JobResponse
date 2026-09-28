const BASE_URL = "https://www.remocate.app/";
const JOB_PATH = /\/jobs\/[^"'\s<>?#]+/g;

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x27;/gi, "'");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

function parsePublishedTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function uniqueJobs(matches) {
  const seen = new Set();
  return matches.filter((job) => {
    const key = job.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeRemocateHtml(html, query = "") {
  const source = String(html || "");
  const matches = [];
  for (const match of source.matchAll(JOB_PATH)) {
    const href = match[0];
    const index = match.index ?? 0;
    const start = Math.max(0, index - 1800);
    const end = Math.min(source.length, index + 2200);
    const block = source.slice(start, end);
    const escapedHref = href.replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");
    const anchorPattern = new RegExp("<a[^>]+href=[\"']" + escapedHref + "[\"'][^>]*>([\\s\\S]*?)</a>", "i");
    const anchor = block.match(anchorPattern);
    const title = stripTags(anchor?.[1] || "");
    if (!title || title.length < 3 || title.length > 240) continue;

    const blockText = stripTags(block);
    const absoluteUrl = new URL(href, BASE_URL).toString();
    const publishedMatch = blockText.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/i);
    const publishedTimestamp = parsePublishedTimestamp(publishedMatch?.[0]);
    const remote = /\bremote\b/i.test(blockText) ? "Remote" : "";
    const relocation = /\brelocation\b/i.test(blockText) ? "Relocation" : "";
    const location = blockText.match(/(?:Remote|Relocation)\s+([A-Z][A-Za-z .'-]{1,40})\b/)?.[1]?.trim() || "Локация не указана";

    matches.push({
      id: "remocate-" + href.split("/").pop(),
      title,
      company: "Remocate",
      salary: "Зарплата не указана",
      location,
      experience: "Опыт не указан",
      publishedTimestamp,
      source: "remocate",
      url: absoluteUrl,
      tags: [remote, relocation].filter(Boolean),
      description: blockText.slice(0, 1200),
      sourceUrl: absoluteUrl,
    });
  }
  return uniqueJobs(matches);
}

export function filterRemocateResults(results, query = "") {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  if (!normalized) return results;
  const terms = normalized.split(/\s+/).filter(Boolean);
  return results.filter((job) => {
    const haystack = [job.title, job.company, job.location, job.description, ...(job.tags || [])].join(" ").toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
