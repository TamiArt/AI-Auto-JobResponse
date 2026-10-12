export const SUPERJOB_API = "https://api.superjob.ru/2.0/vacancies/";
const PAGE_SIZE = 100;

function text(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function safeUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (!/(^|\.)superjob\.ru$/i.test(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function salaryLabel(item) {
  const min = Number(item?.payment_from || 0);
  const max = Number(item?.payment_to || 0);
  const currency = text(item?.currency).toUpperCase();
  const symbol = currency === "RUR" || currency === "RUB" ? "₽" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
  if (min && max) return `от ${min.toLocaleString("ru-RU")} до ${max.toLocaleString("ru-RU")} ${symbol}`.trim();
  if (min) return `от ${min.toLocaleString("ru-RU")} ${symbol}`.trim();
  if (max) return `до ${max.toLocaleString("ru-RU")} ${symbol}`.trim();
  return "Зарплата не указана";
}

function workMode(item) {
  const value = Number(item?.place_of_work?.id ?? item?.place_of_work);
  if (value === 2) return "remote";
  if (value === 1) return "onsite";
  const signal = text(item?.profession + " " + item?.work + " " + item?.place_of_work?.title).toLowerCase();
  if (/удален|remote/.test(signal)) return "remote";
  if (/гибрид|hybrid/.test(signal)) return "hybrid";
  return undefined;
}

export function validateSuperJobRequest(searchParams) {
  const query = text(searchParams.get("q"));
  const page = Math.max(0, Number.parseInt(String(searchParams.get("page") || "0"), 10) || 0);
  const salaryFrom = text(searchParams.get("salary"));
  if (!query) return { ok: false, status: 400, error: "query_required" };
  if (query.length > 160 || page > 1000 || (salaryFrom && (!/^\d+$/.test(salaryFrom) || Number(salaryFrom) > 100_000_000))) {
    return { ok: false, status: 400, error: "invalid_parameters" };
  }
  return { ok: true, query, page, salaryFrom };
}

export function buildSuperJobUrl(validation) {
  const params = new URLSearchParams({
    keyword: validation.query,
    count: String(PAGE_SIZE),
    page: String(validation.page),
    order_field: "date",
    order_direction: "desc",
  });
  if (validation.salaryFrom) params.set("payment_from", validation.salaryFrom);
  return `${SUPERJOB_API}?${params.toString()}`;
}

export function normalizeSuperJobVacancy(item) {
  const id = text(item?.id);
  const title = text(item?.profession);
  const url = safeUrl(item?.link);
  if (!id || !title || !url) return null;
  const timestamp = Number(item?.date_published || 0) * 1000;
  const town = text(item?.town?.title || item?.town?.title_rus || item?.address);
  const company = text(item?.firm_name || item?.client?.title) || "Компания не указана";
  const experience = text(item?.experience?.title) || "Опыт не указан";
  const tags = [item?.type_of_work?.title, item?.place_of_work?.title, item?.catalogues?.map?.((entry) => entry?.title)].flat().map(text).filter(Boolean).slice(0, 5);
  const description = text(item?.work || item?.candidat);
  return {
    id: `superjob-${id}`,
    title,
    company,
    salary: salaryLabel(item),
    location: town || "Локация не указана",
    experience,
    publishedTimestamp: Number.isFinite(timestamp) ? timestamp : 0,
    source: "superjob",
    url,
    tags,
    ...(description ? { description } : {}),
    ...(workMode(item) ? { workMode: workMode(item) } : {}),
  };
}

export function normalizeSuperJobPayload(payload) {
  const items = Array.isArray(payload?.objects) ? payload.objects : [];
  return {
    results: items.map(normalizeSuperJobVacancy).filter(Boolean),
    total: Number(payload?.total || 0),
    more: Boolean(payload?.more),
  };
}
