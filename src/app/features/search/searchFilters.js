function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("ru-RU").replace(/ё/g, "е").trim();
}

export function matchesQuery(query, ...values) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  const haystack = normalizeText(values.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}

export function matchesArea(areaId, location) {
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
  const numbers = Array.from(text.matchAll(/\d[\d\s.,]*/g))
    .map((match) => parseSalaryNumber(match[0]))
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
  if (/hybrid|гибрид/.test(text)) return "hybrid";
  if (/remote|удален|удалён|дистанцион|work from home|wfh/.test(text)) return "remote";
  return "onsite";
}

export function matchesWorkMode(request, item) {
  if (!request.workMode || request.workMode === "any") return true;
  if (item.workMode && item.workMode !== "any") return item.workMode === request.workMode;
  const text = normalizeText([item.location, item.title, item.description, ...(item.tags || [])].join(" "));
  if (request.workMode === "remote") return /remote|удален|удалён|дистанцион|work from home|wfh/.test(text);
  if (request.workMode === "hybrid") return /hybrid|гибрид/.test(text);
  return !/remote|удален|удалён|дистанцион|work from home|wfh|hybrid|гибрид/.test(text);
}

export function matchesLocation(request, item) {
  if (!request.location?.trim()) return true;
  const wanted = normalizeText(request.location);
  return normalizeText(item.location).includes(wanted);
}

export function inferEmploymentType(item) {
  const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" "));
  if (/intern|стаж|trainee|практик/.test(text)) return "internship";
  if (/part.?time|частич|неполн/.test(text)) return "partTime";
  if (/contract|контракт|проектн|freelance|фриланс/.test(text)) return "contract";
  return "fullTime";
}

export function matchesEmploymentType(request, item) {
  if (!request.employmentType || request.employmentType === "any") return true;
  if (item.employmentType && item.employmentType !== "any") return item.employmentType === request.employmentType;
  const text = normalizeText([item.title, item.description, ...(item.tags || [])].join(" "));
  if (request.employmentType === "internship") return /intern|стаж|trainee|практик/.test(text);
  if (request.employmentType === "partTime") return /part.?time|частич|неполн/.test(text);
  if (request.employmentType === "contract") return /contract|контракт|проектн|freelance|фриланс/.test(text);
  return !/intern|стаж|trainee|практик|part.?time|частич|неполн|contract|контракт|проектн|freelance|фриланс/.test(text);
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
  if (filter === "between1And3") return /1.?3|1 год|2 год|3 год|one|two|three/.test(text);
  if (filter === "between3And6") return /3.?6|4 год|5 лет|6 лет|three|four|five|six/.test(text);
  return /более 6|6\+|7 лет|8 лет|9 лет|10 лет|more than 6|senior/.test(text);
}

export function applySearchFilters(request, item) {
  return matchesQuery(request.query, item.title, item.company, item.location, item.description, ...(item.tags || []))
    && matchesArea(request.areaId, item.location)
    && matchesExperience(request.experience, item.experience)
    && matchesSalary(request, item.salary, item.normalizedSalary)
    && matchesWorkMode(request, item)
    && matchesLocation(request, item)
    && matchesEmploymentType(request, item);
}
