export function isSearchResult(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.id === "string" && value.id.trim() &&
    typeof value.title === "string" && value.title.trim() &&
    typeof value.company === "string" &&
    typeof value.salary === "string" &&
    typeof value.location === "string" &&
    typeof value.experience === "string" &&
    typeof value.publishedAt === "string" &&
    Number.isFinite(value.publishedTimestamp) &&
    typeof value.source === "string" && value.source.trim() &&
    typeof value.url === "string" && /^https?:\/\//.test(value.url) &&
    Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === "string")
  );
}

function normalized(value) {
  return String(value || "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").trim();
}

export function mergeSearchResults(...groups) {
  const seen = new Set();
  const merged = [];

  for (const result of groups.flat()) {
    if (!isSearchResult(result)) continue;
    const key = `${normalized(result.title)}|${normalized(result.company)}|${result.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(result);
  }

  return merged.sort((a, b) => b.publishedTimestamp - a.publishedTimestamp);
}
