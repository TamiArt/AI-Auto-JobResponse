export type SearchableJobSource = "hh" | "remoteok" | "arbeitnow";

export interface SearchResult {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  experience: string;
  publishedAt: string;
  source: SearchableJobSource;
  url: string;
  tags: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  errors: Partial<Record<SearchableJobSource, string>>;
}

interface SearchParams {
  query: string;
  areaId: string;
  salaryFrom: string;
  sources: SearchableJobSource[];
}

const SOURCE_LABELS: Record<SearchableJobSource, string> = {
  hh: "HH.ru",
  remoteok: "RemoteOK",
  arbeitnow: "Arbeitnow",
};

function formatDate(value?: string | number): string {
  if (!value) return "дата не указана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "дата не указана";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function stripHtml(value = ""): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function searchHh(params: SearchParams, signal: AbortSignal): Promise<SearchResult[]> {
  const query = new URLSearchParams({ text: params.query, per_page: "30", order_by: "publication_time" });
  if (params.areaId !== "0") query.set("area", params.areaId);
  if (params.salaryFrom) {
    query.set("salary", params.salaryFrom);
    query.set("only_with_salary", "true");
  }
  const payload = await fetchJson<{ items: any[] }>(`https://api.hh.ru/vacancies?${query}`, signal);
  return payload.items.map((item) => ({
    id: `hh-${item.id}`,
    title: item.name,
    company: item.employer?.name || "Компания не указана",
    salary: item.salary
      ? `${item.salary.from ? `от ${item.salary.from.toLocaleString("ru-RU")}` : ""}${item.salary.to ? ` до ${item.salary.to.toLocaleString("ru-RU")}` : ""} ${item.salary.currency || ""}`.trim()
      : "не указана",
    location: item.area?.name || "не указана",
    experience: item.experience?.name || "",
    publishedAt: formatDate(item.published_at),
    source: "hh" as const,
    url: item.alternate_url,
    tags: [...(item.key_skills || []).map((skill: { name: string }) => skill.name), item.schedule?.name].filter(Boolean).slice(0, 5),
  }));
}

async function searchRemoteOk(params: SearchParams, signal: AbortSignal): Promise<SearchResult[]> {
  const payload = await fetchJson<any[]>("https://remoteok.com/api", signal);
  const terms = params.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return payload.slice(1).filter((item) => {
    const haystack = `${item.position} ${item.company} ${(item.tags || []).join(" ")}`.toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  }).slice(0, 30).map((item) => ({
    id: `remoteok-${item.id}`,
    title: item.position || "Без названия",
    company: item.company || "Компания не указана",
    salary: item.salary_min || item.salary_max ? `$${item.salary_min || "?"}–${item.salary_max || "?"} в год` : "не указана",
    location: item.location || "Удалённо",
    experience: "",
    publishedAt: formatDate(item.date || item.epoch * 1000),
    source: "remoteok" as const,
    url: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
    tags: (item.tags || []).slice(0, 5),
  }));
}

async function searchArbeitnow(params: SearchParams, signal: AbortSignal): Promise<SearchResult[]> {
  const payload = await fetchJson<{ data: any[] }>("https://www.arbeitnow.com/api/job-board-api", signal);
  const terms = params.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return payload.data.filter((item) => {
    const haystack = `${item.title} ${item.company_name} ${stripHtml(item.description)} ${(item.tags || []).join(" ")}`.toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  }).slice(0, 30).map((item) => ({
    id: `arbeitnow-${item.slug}`,
    title: item.title,
    company: item.company_name || "Компания не указана",
    salary: "не указана",
    location: item.location || (item.remote ? "Удалённо" : "не указана"),
    experience: "",
    publishedAt: formatDate((item.created_at || 0) * 1000),
    source: "arbeitnow" as const,
    url: item.url,
    tags: (item.tags || []).slice(0, 5),
  }));
}

const adapters = { hh: searchHh, remoteok: searchRemoteOk, arbeitnow: searchArbeitnow };

export async function searchJobs(params: SearchParams): Promise<SearchResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const settled = await Promise.allSettled(params.sources.map(async (source) => ({
      source,
      results: await adapters[source](params, controller.signal),
    })));
    const results: SearchResult[] = [];
    const errors: SearchResponse["errors"] = {};
    settled.forEach((entry, index) => {
      const source = params.sources[index];
      if (entry.status === "fulfilled") results.push(...entry.value.results);
      else errors[source] = entry.reason?.name === "AbortError" ? "Превышено время ожидания" : "Источник временно недоступен";
    });
    return { results, errors };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getSourceErrorLabel(source: SearchableJobSource): string {
  return SOURCE_LABELS[source];
}
