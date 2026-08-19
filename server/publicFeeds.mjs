const DEFAULT_LOCATION = "Удалённо / Worldwide";

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function timestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeUrl(value) {
  const url = text(value);
  return /^https?:\/\//i.test(url) ? url : "";
}

function salaryFromRemoteOk(job) {
  if (text(job.salary)) return text(job.salary);
  const min = Number(job.salary_min || 0);
  const max = Number(job.salary_max || 0);
  if (min && max) return `$${min.toLocaleString("en-US")}–$${max.toLocaleString("en-US")}`;
  if (min) return `от $${min.toLocaleString("en-US")}`;
  if (max) return `до $${max.toLocaleString("en-US")}`;
  return "Зарплата не указана";
}

export function normalizeRemoteOkPayload(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((job) => {
    if (!job || typeof job !== "object" || !job.id || !job.position) return null;
    const url = safeUrl(job.url);
    if (!url) return null;
    return {
      id: `remoteok-${text(job.id)}`,
      title: text(job.position),
      company: text(job.company) || "Компания не указана",
      salary: salaryFromRemoteOk(job),
      location: text(job.location) || DEFAULT_LOCATION,
      experience: "Опыт не указан",
      publishedTimestamp: timestamp(job.epoch || job.date),
      url,
      tags: Array.isArray(job.tags) ? job.tags.map(text).filter(Boolean).slice(0, 5) : [],
    };
  }).filter(Boolean);
}

function decodeXml(value) {
  return text(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function xmlTag(item, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = item.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function splitWwrTitle(raw) {
  const value = decodeXml(raw);
  const separator = value.indexOf(": ");
  if (separator <= 0) return { company: "Компания не указана", title: value };
  return { company: value.slice(0, separator), title: value.slice(separator + 2) };
}

export function normalizeWwrRss(xml) {
  if (typeof xml !== "string") return [];
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  return items.map((item, index) => {
    const { company, title } = splitWwrTitle(xmlTag(item, "title"));
    const url = safeUrl(xmlTag(item, "link") || xmlTag(item, "guid"));
    if (!title || !url) return null;
    return {
      id: `weworkremotely-${text(xmlTag(item, "guid") || url || index)}`,
      title,
      company: company || "Компания не указана",
      salary: "Зарплата не указана",
      location: xmlTag(item, "region") || DEFAULT_LOCATION,
      experience: "Опыт не указан",
      publishedTimestamp: timestamp(xmlTag(item, "pubDate")),
      url,
      tags: [xmlTag(item, "category"), xmlTag(item, "type")].map(text).filter(Boolean).slice(0, 5),
    };
  }).filter(Boolean);
}

export function normalizeRemotivePayload(payload) {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return jobs.map((job) => {
    const id = text(job?.id);
    const title = text(job?.title);
    const url = safeUrl(job?.url);
    if (!id || !title || !url) return null;
    return {
      id: `remotive-${id}`,
      title,
      company: text(job.company_name) || "Компания не указана",
      salary: text(job.salary) || "Зарплата не указана",
      location: text(job.candidate_required_location) || DEFAULT_LOCATION,
      experience: "Опыт не указан",
      publishedTimestamp: timestamp(job.publication_date),
      url,
      tags: [job.category, job.job_type].map(text).filter(Boolean).slice(0, 5),
    };
  }).filter(Boolean);
}

export function normalizeJobicyPayload(payload) {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return jobs.map((job) => {
    const id = text(job?.id || job?.jobId || job?.url);
    const title = text(job?.jobTitle || job?.title);
    const url = safeUrl(job?.url || job?.jobUrl);
    if (!id || !title || !url) return null;
    const min = text(job.annualSalaryMin || job.salaryMin);
    const max = text(job.annualSalaryMax || job.salaryMax);
    const currency = text(job.salaryCurrency || job.currency);
    const salary = text(job.salary) || [min && `от ${min}`, max && `до ${max}`, currency].filter(Boolean).join(" ");
    return {
      id: `jobicy-${id}`,
      title,
      company: text(job.companyName || job.company) || "Компания не указана",
      salary: salary || "Зарплата не указана",
      location: text(job.jobGeo || job.location) || DEFAULT_LOCATION,
      experience: "Опыт не указан",
      publishedTimestamp: timestamp(job.pubDate || job.publicationDate || job.date),
      url,
      tags: [job.jobIndustry, job.jobType, ...(Array.isArray(job.jobTags) ? job.jobTags : [])]
        .map(text).filter(Boolean).slice(0, 5),
    };
  }).filter(Boolean);
}

export function filterPublicFeedResults(results, query) {
  const list = Array.isArray(results) ? results : [];
  const terms = text(query).toLocaleLowerCase("ru-RU").replace(/ё/g, "е").split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((job) => {
    const haystack = [job.title, job.company, job.location, ...(job.tags || [])]
      .join(" ").toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
    return terms.every((term) => haystack.includes(term));
  });
}

export function validatePublicFeedQuery(value) {
  const query = text(value);
  if (!query) return { ok: false, status: 400, error: "query_required" };
  if (query.length > 160) return { ok: false, status: 400, error: "invalid_parameters" };
  return { ok: true, query };
}
