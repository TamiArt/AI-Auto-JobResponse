function text(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stamp(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeUrl(value) {
  const url = String(value ?? "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function job({ provider, id, title, company, salary, location, experience, published, url, tags }) {
  const directUrl = safeUrl(url);
  if (!id || !title || !directUrl) return null;
  return {
    id: `${provider}-${text(id)}`,
    title: text(title),
    company: text(company) || "Компания не указана",
    salary: text(salary) || "Зарплата не указана",
    location: text(location) || "Локация не указана",
    experience: text(experience) || "Опыт не указан",
    publishedTimestamp: stamp(published),
    source: provider,
    url: directUrl,
    tags: (tags || []).map(text).filter(Boolean).slice(0, 5),
  };
}

export function buildAtsUrl(employer) {
  const slug = encodeURIComponent(employer.slug);
  switch (employer.provider) {
    case "greenhouse": return `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
    case "lever": return `https://api.lever.co/v0/postings/${slug}?mode=json`;
    case "ashby": return `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`;
    case "smartrecruiters": return `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`;
    case "recruitee": return `https://${employer.slug}.recruitee.com/api/offers/`;
    case "workable": return `https://www.workable.com/api/accounts/${slug}?details=true`;
    default: return "";
  }
}

export function normalizeGreenhouse(payload, employer) {
  return (Array.isArray(payload?.jobs) ? payload.jobs : []).map((item) => job({
    provider: "greenhouse", id: item.id, title: item.title, company: employer.company,
    location: item.location?.name, published: item.updated_at, url: item.absolute_url,
    tags: [...(item.departments || []).map((v) => v.name), ...(item.offices || []).map((v) => v.name)],
  })).filter(Boolean);
}

export function normalizeLever(payload, employer) {
  return (Array.isArray(payload) ? payload : []).map((item) => job({
    provider: "lever", id: item.id, title: item.text, company: employer.company,
    location: item.categories?.location, experience: item.categories?.commitment,
    published: item.createdAt, url: item.hostedUrl || item.applyUrl,
    tags: [item.categories?.team, item.categories?.department, item.categories?.commitment],
  })).filter(Boolean);
}

export function normalizeAshby(payload, employer) {
  return (Array.isArray(payload?.jobs) ? payload.jobs : []).filter((item) => item?.isListed !== false).map((item) => job({
    provider: "ashby", id: item.jobUrl || item.applyUrl || item.title, title: item.title,
    company: employer.company, salary: item.compensation?.scrapeableCompensationSalarySummary || item.compensation?.compensationTierSummary,
    location: item.location, experience: item.employmentType, published: item.publishedAt,
    url: item.jobUrl || item.applyUrl, tags: [item.department, item.team, item.workplaceType, item.employmentType],
  })).filter(Boolean);
}

export function normalizeSmartRecruiters(payload, employer) {
  return (Array.isArray(payload?.content) ? payload.content : []).map((item) => {
    const companyId = item.company?.identifier || employer.slug;
    const direct = `https://jobs.smartrecruiters.com/${encodeURIComponent(companyId)}/${encodeURIComponent(item.id)}`;
    const location = [item.location?.city, item.location?.region, item.location?.country].filter(Boolean).join(", ");
    return job({
      provider: "smartrecruiters", id: item.id || item.uuid, title: item.name,
      company: item.company?.name || employer.company, location: item.location?.remote ? `${location || "Remote"} · Remote` : location,
      experience: item.experienceLevel?.label, published: item.releasedDate, url: direct,
      tags: [item.department?.label, item.function?.label, item.typeOfEmployment?.label],
    });
  }).filter(Boolean);
}

export function normalizeRecruitee(payload, employer) {
  const offers = Array.isArray(payload?.offers) ? payload.offers : Array.isArray(payload) ? payload : [];
  return offers.map((item) => {
    const locations = Array.isArray(item.locations) ? item.locations : [];
    const location = text(item.location || item.city || locations.map((v) => v?.city || v?.name).filter(Boolean).join(", "));
    return job({
      provider: "recruitee", id: item.id || item.slug, title: item.title, company: employer.company,
      salary: item.salary, location, experience: item.employment_type || item.employmentType,
      published: item.published_at || item.created_at, url: item.careers_url || item.url,
      tags: [item.department, item.department?.name, item.remote ? "Remote" : ""],
    });
  }).filter(Boolean);
}

export function normalizeWorkable(payload, employer) {
  return (Array.isArray(payload?.jobs) ? payload.jobs : []).map((item) => {
    const location = [item.city, item.state, item.country].filter(Boolean).join(", ") || (item.telecommuting ? "Remote" : "");
    return job({
      provider: "workable", id: item.shortcode || item.code || item.url, title: item.title,
      company: employer.company, location, experience: item.experience, published: item.published_on || item.created_at,
      url: item.shortlink || item.application_url || item.url,
      tags: [item.department, item.employment_type, item.workplace_type, item.industry],
    });
  }).filter(Boolean);
}

export function normalizeAtsPayload(payload, employer) {
  const map = {
    greenhouse: normalizeGreenhouse,
    lever: normalizeLever,
    ashby: normalizeAshby,
    smartrecruiters: normalizeSmartRecruiters,
    recruitee: normalizeRecruitee,
    workable: normalizeWorkable,
  };
  return map[employer.provider]?.(payload, employer) || [];
}

export function filterAtsResults(results, query) {
  const list = Array.isArray(results) ? results : [];
  const terms = text(query).toLocaleLowerCase("ru-RU").replace(/ё/g, "е").split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((item) => {
    const haystack = [item.title, item.company, item.location, ...(item.tags || [])]
      .join(" ").toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
    return terms.every((term) => haystack.includes(term));
  });
}
