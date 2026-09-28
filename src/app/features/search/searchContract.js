export function isSearchResult(value) {
  let validUrl = false;
  if (value && typeof value === "object" && typeof value.url === "string") {
    try {
      const url = new URL(value.url);
      validUrl = (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
    } catch {
      validUrl = false;
    }
  }
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.id === "string" && value.id.trim() &&
    typeof value.title === "string" && value.title.trim() &&
    typeof value.company === "string" && value.company.trim() &&
    typeof value.salary === "string" &&
    typeof value.location === "string" &&
    typeof value.experience === "string" &&
    typeof value.publishedAt === "string" &&
    Number.isFinite(value.publishedTimestamp) &&
    typeof value.source === "string" && value.source.trim() &&
    validUrl &&
    Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === "string")
  );
}

function normalized(value) {
  return String(value || "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[\u2013\u2014]/g, "-").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "ref", "referrer",
  "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term",
]);

export function canonicalUrl(value) {
  try {
    const url = new URL(String(value));
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    url.hostname = url.hostname.toLocaleLowerCase();
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
    return url.toString();
  } catch {
    return String(value);
  }
}

function vacancyFingerprint(result) {
  return [normalized(result.title), normalized(result.company), normalized(result.location)].join("|");
}

export function mergeSearchResults(...groups) {
  const seenUrls = new Set();
  const seenCrossSourceFingerprints = new Set();
  const merged = [];

  for (const result of groups.flat()) {
    if (!isSearchResult(result)) continue;
    const urlKey = canonicalUrl(result.url);
    if (seenUrls.has(urlKey)) continue;

    const fingerprint = vacancyFingerprint(result);
    if (seenCrossSourceFingerprints.has(fingerprint)) continue;

    seenUrls.add(urlKey);
    seenCrossSourceFingerprints.add(fingerprint);
    merged.push(result);
  }

  return merged.sort((a, b) => b.publishedTimestamp - a.publishedTimestamp);
}
