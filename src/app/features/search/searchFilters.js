function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").trim();
}

const WORK_MODE_SIGNALS = /remote|удален|удалён|дистанцион|work from home|wfh/;
const HYBRID_SIGNALS = /hybrid|гибрид/;
const QUERY_TERM_ALIASES = new Map([
  ["инженер", ["инженер", "engineer"]],
  ["инженера", ["инженер", "engineer"]],
  ["инженеры", ["инженер", "engineer"]],
  ["qa", ["qa", "quality assurance"]],
  ["разработчик", ["разработчик", "developer", "software engineer"]],
  ["разработчики", ["разработчик", "developer", "software engineer"]],
  ["тестировщик", ["тестировщик", "tester", "qa", "quality assurance"]],
  ["тестировщика", ["тестировщик", "tester", "qa", "quality assurance"]],
  ["тестирование", ["тестирование", "testing", "qa", "quality assurance"]],
  ["дизайнер", ["дизайнер", "designer", "design"]],
  ["аналитик", ["аналитик", "analyst", "analytics"]],
  ["менеджер", ["менеджер", "manager"]],
  ["программист", ["программист", "programmer", "developer", "engineer"]],
]);

const EMPLOYMENT_SIGNALS = {
  internship: /intern|стаж|trainee|практик/,
  partTime: /part.?time|частич|неполн/,
  contract: /contract|контракт|проектн|freelance|фриланс/,
};

function normalizeQueryText(value) {
  return normalizeText(value).replace(/[-–—_/]+/g, " ").replace(/\s+/g, " ").trim();
}

function containsQueryPhrase(haystack, phrase) {
  const normalizedHaystack = normalizeQueryText(haystack);
  const normalizedPhrase = normalizeQueryText(phrase);
  if (!normalizedPhrase) return false;
  const escapedPhrase = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(^|[^\\p{L}\\p{N}])" + escapedPhrase + "(?=$|[^\\p{L}\\p{N}])", "iu").test(normalizedHaystack);
}

export function matchesQuery(query, ...values) {
  const terms = normalizeQueryText(query).split(/\s+/).filter(Boolean);
  const haystack = values.filter(Boolean).join(" ");
  return terms.every((term) => {
    const aliases = QUERY_TERM_ALIASES.get(term) || [term];
    return aliases.some((alias) => containsQueryPhrase(haystack, alias));
  });

export function matchesArea(areaId, location, source) {
  if (source && source !== "hh" && source !== "trudvsem") return true;
  const normalized = normalizeText(location);
  if (areaId === "1") return normalized.includes("москва") && !normalized.includes("московская область");
  if (areaId === "2") return normalized.includes("санкт-петербург");
  return true;
}

function parseSalaryNumber(raw) {
  const compact = String(raw).replace(/\s/g, "");
  if (!compact) return null;
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = compact.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
  } else if (comma >= 0 || dot >= 0) {
    const separator = comma >= 0 ? "," : ".";
    const digitsAfter = compact.length - compact.lastIndexOf(separator) - 1;
    normalized = digitsAfter === 3 ? compact.replace(separator, "") : compact.replace(separator, ".");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function normalizeSalary(salary) {
  const originalText = salary || "Зарплата не указана";
  const text = normalizeText(originalText);
  const numbers = Array.from(text.matchAll(/(\d[\d\s.,]*)(k|m)?/gi))
    .map((match) => {
      const value = parseSalaryNumber(match[1]);
      if (value === null) return null;
      const suffix = String(match[2] || "").toLocaleLowerCase("en-US");
      return suffix === "k" ? value * 1_000 : suffix === "m" ? value * 1_000_000 : value;
    })
    .filter((value) => value !== null);
  const currency = /\b(rub|руб|₽|rur)\b/.test(text) ? "RUB"
    : /\b(usd|долл)\b|\$/.test(text) ? "USD"
    : /\b(eur|евро)\b|€/.test(text) ? "EUR"
    : /\b(gbp|фунт)\b|£/.test(text) ? "GBP"
    : null;
  const period = /час|hour|hourly|в час/.test(text) ? "hour"
    : /год|year|annual|annually|в год/.test(text) ? "year"
    : /месяц|month|monthly|в месяц/.test(text) ? "month"
    : "unknown";
  return {
    min: numbers.length > 1 ? Math.min(...numbers) : numbers[0] ?? null,
    max: numbers.length > 1 ? Math.max(...numbers) : numbers[0] ?? null,
    currency,
    period,
    originalText,
  };
}

export function inferWorkMode(item) {
  const text = normalizeText([item.location, item.title, item.description, ...(item.tags || [])].join(" "));
  if (HYBRID_SIGNALS.test(text)) return "hybrid";
  if (WORK_MODE_SIGNALS.test(text)) return "remote";
  return "unknown";
}

export function matchesWorkMode(request, item) {
  if (!request.workMode || request.workMode === "any") return true;
  if (item.workMode && item.workMode !== "any" && item.workMode !== "unknown") return item.workMode === request.workMode;
  const text = normalizeText([item.location, item.title, item.description, ...(item.tags || [])].join(" "));
  if (request.workMode === "remote") return WORK_MODE_SIGNALS.test(text);
  if (request.workMode === "hybrid") return HYBRID_SIGNALS.test(text);
  return !WORK_MODE_SIGNALS.test(text) && !HYBRID_SIGNALS.test(text) && /офис|office|onsite|on-site|in office|на месте/.test(text);
}

export function matchesLocation(request, item) {
  if (!request.location?.trim()) return true;
  const wanted = normalizeText(request.location);
  return normalizeText(item.location).includes(wanted);
}

export function inferEmploymentType(item) {
  const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" "));
  if (EMPLOYMENT_SIGNALS.internship.test(text)) return "internship";
  if (EMPLOYMENT_SIGNALS.partTime.test(text)) return "partTime";
  if (EMPLOYMENT_SIGNALS.contract.test(text)) return "contract";
  return "unknown";
}

export function matchesEmploymentType(request, item) {
  if (!request.employmentType || request.employmentType === "any") return true;
  if (item.employmentType && item.employmentType !== "any" && item.employmentType !== "unknown") return item.employmentType === request.employmentType;
  const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" "));
  if (request.employmentType === "internship") return EMPLOYMENT_SIGNALS.internship.test(text);
  if (request.employmentType === "partTime") return EMPLOYMENT_SIGNALS.partTime.test(text);
  if (request.employmentType === "contract") return EMPLOYMENT_SIGNALS.contract.test(text);
  return /full.?time|полная|полный день|full time/.test(text)
    && !Object.values(EMPLOYMENT_SIGNALS).some((pattern) => pattern.test(text));
}

export function matchesSalary(request, salary, normalized) {
  const from = Number(request.salaryFrom || 0);
  const to = Number(request.salaryTo || 0);
  if (!from && !to) return true;
  const value = normalized || normalizeSalary(salary);
  if (value.min === null && value.max === null) return false;
  if (request.salaryCurrency && value.currency && request.salaryCurrency !== value.currency) return false;
  if (request.salaryCurrency && !value.currency) return false;
  const effectiveMin = value.min ?? value.max;
  const effectiveMax = value.max ?? value.min;
  return (!from || effectiveMax >= from) && (!to || effectiveMin <= to);
}

export function matchesExperience(filter, value) {
  if (filter === "any") return true;
  const text = normalizeText(value);
  if (!text || text.includes("не указан")) return false;
  if (filter === "noExperience") return /без опыта|нет опыта|no experience|entry level|intern/.test(text);
  if (filter === "between1And3") return /(?:1\s*(?:-|–|—|to)\s*3|1\s*(?:год|года|year|years)|2\s*(?:год|года|лет|year|years)|3\s*(?:год|года|лет|year|years)|\bone\b|\btwo\b|\bthree\b)/.test(text);
  if (filter === "between3And6") return /(?:3\s*(?:-|–|—|to)\s*6|3\s*(?:год|года|лет|year|years)|4\s*(?:год|года|лет|year|years)|5\s*(?:лет|year|years)|6\s*(?:лет|year|years)|\bthree\b|\bfour\b|\bfive\b|\bsix\b)/.test(text);
  return /более 6|6\+|7 лет|8 лет|9 лет|10 лет|more than 6|senior/.test(text);
}

export function applySearchFilters(request, item) {
  return matchesQuery(request.query, item.title, item.company, item.location, item.description, ...(item.tags || []))
    && matchesArea(request.areaId, item.location, item.source)
    && matchesExperience(request.experience, item.experience)
    && matchesSalary(request, item.salary, item.normalizedSalary)
    && matchesWorkMode(request, item)
    && matchesLocation(request, item)
    && matchesEmploymentType(request, item);
}
