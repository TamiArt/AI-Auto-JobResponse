import type { CareerProfile, Config } from "../../domain/types";
import type { SearchResult, SearchRequest } from "../search/searchService";

export type MatchStatus = "matched" | "mismatch" | "unknown";

export interface MatchCriterion {
  id: "role" | "skills" | "workMode" | "location" | "headline";
  label: string;
  status: MatchStatus;
  score: number;
  maxScore: number;
  evidence?: string;
  note?: string;
}

export interface MatchAnalysis {
  score: number;
  reasons: string[];
  gaps: string[];
  criteria: MatchCriterion[];
}

const normalize = (value: string) => value
  .toLocaleLowerCase("ru-RU")
  .replace(/ё/g, "е")
  .replace(/[–—]/g, "-")
  .trim();

function textFor(job: SearchResult) {
  return normalize([
    job.title,
    job.company,
    job.location,
    job.experience,
    job.description,
    ...job.tags,
  ].filter(Boolean).join(" "));
}

function containsPhrase(text: string, phrase: string) {
  const value = normalize(phrase);
  return Boolean(value) && text.includes(value);
}

export function buildMatchingRequest(config: Config): SearchRequest {
  return {
    query: config.jobTitle,
    areaId: config.areaId,
    salaryFrom: config.salaryFrom,
    salaryTo: config.salaryTo,
    salaryCurrency: config.salaryCurrency,
    workMode: config.workMode,
    location: config.location,
    employmentType: config.employmentType,
    experience: config.experience,
    sources: ["hh", "arbeitnow", "remoteok", "remotive", "weworkremotely", "jobicy", "trudvsem", "ats"],
    telegramChannels: config.telegramChannels,
    page: 0,
  };
}

function roleCriterion(profile: CareerProfile, text: string): MatchCriterion {
  const roles = profile.targetRoles.filter((role) => containsPhrase(text, role));
  if (roles.length) {
    return { id: "role", label: "Целевая роль", status: "matched", score: 30, maxScore: 30, evidence: roles[0] };
  }
  if (!profile.targetRoles.length) {
    return { id: "role", label: "Целевая роль", status: "unknown", score: 0, maxScore: 30, note: "Целевые роли не заданы." };
  }
  return { id: "role", label: "Целевая роль", status: "mismatch", score: 0, maxScore: 30, note: "Целевая роль не найдена в данных вакансии." };
}

function skillsCriterion(profile: CareerProfile, text: string): MatchCriterion {
  if (!profile.skills.length) {
    return { id: "skills", label: "Навыки", status: "unknown", score: 0, maxScore: 30, note: "Навыки в профиле не заданы." };
  }
  const matched = profile.skills.filter((skill) => containsPhrase(text, skill.name));
  const score = Math.min(30, Math.round((matched.length / profile.skills.length) * 30));
  if (!matched.length) {
    return { id: "skills", label: "Навыки", status: "mismatch", score: 0, maxScore: 30, note: "Навыки профиля не подтверждены в вакансии." };
  }
  return {
    id: "skills",
    label: "Навыки",
    status: matched.length === profile.skills.length ? "matched" : "mismatch",
    score,
    maxScore: 30,
    evidence: matched.slice(0, 5).map((skill) => skill.name).join(", "),
    note: matched.length < profile.skills.length ? "Часть навыков профиля не подтверждена." : undefined,
  };
}

function workModeCriterion(profile: CareerProfile, job: SearchResult): MatchCriterion {
  if (profile.workMode === "any") {
    return { id: "workMode", label: "Формат работы", status: "matched", score: 15, maxScore: 15, evidence: "Любой формат" };
  }
  if (!job.workMode || job.workMode === "unknown") {
    return { id: "workMode", label: "Формат работы", status: "unknown", score: 0, maxScore: 15, note: "Формат вакансии не определён." };
  }
  if (profile.workMode === job.workMode) {
    return { id: "workMode", label: "Формат работы", status: "matched", score: 15, maxScore: 15, evidence: job.workMode };
  }
  return { id: "workMode", label: "Формат работы", status: "mismatch", score: 0, maxScore: 15, evidence: job.workMode, note: `Профиль: ${profile.workMode}.` };
}

function locationCriterion(profile: CareerProfile, job: SearchResult): MatchCriterion {
  const profileLocation = normalize(profile.location);
  if (!profileLocation) {
    return { id: "location", label: "Локация", status: "unknown", score: 0, maxScore: 10, note: "Локация в профиле не задана." };
  }
  if (!job.location || !normalize(job.location)) {
    return { id: "location", label: "Локация", status: "unknown", score: 0, maxScore: 10, note: "Локация вакансии не указана." };
  }
  if (containsPhrase(normalize(job.location), profile.location)) {
    return { id: "location", label: "Локация", status: "matched", score: 10, maxScore: 10, evidence: job.location };
  }
  return { id: "location", label: "Локация", status: "mismatch", score: 0, maxScore: 10, evidence: job.location };
}

function headlineCriterion(profile: CareerProfile, text: string): MatchCriterion {
  if (!profile.headline.trim()) {
    return { id: "headline", label: "Профессиональный заголовок", status: "unknown", score: 0, maxScore: 10, note: "Заголовок профиля не задан." };
  }
  if (containsPhrase(text, profile.headline)) {
    return { id: "headline", label: "Профессиональный заголовок", status: "matched", score: 10, maxScore: 10, evidence: profile.headline };
  }
  return { id: "headline", label: "Профессиональный заголовок", status: "mismatch", score: 0, maxScore: 10, note: "Заголовок не найден напрямую; это не доказывает отсутствие опыта." };
}

export function analyzeMatch(profile: CareerProfile, job: SearchResult): MatchAnalysis {
  const text = textFor(job);
  const criteria = [
    roleCriterion(profile, text),
    skillsCriterion(profile, text),
    workModeCriterion(profile, job),
    locationCriterion(profile, job),
    headlineCriterion(profile, text),
  ];
  const reasons = criteria
    .filter((criterion) => criterion.status === "matched")
    .map((criterion) => criterion.evidence ? `${criterion.label}: ${criterion.evidence}` : criterion.label);
  const gaps = criteria
    .filter((criterion) => criterion.status === "mismatch")
    .map((criterion) => criterion.note || `${criterion.label} не совпадает.`);
  const score = criteria.reduce((total, criterion) => total + criterion.score, 0);
  if (!reasons.length) reasons.push("Явных подтверждённых совпадений не найдено; проверьте полное описание вакансии.");
  return { score, reasons, gaps, criteria };
}

export function sortByProfileMatch(profile: CareerProfile, jobs: SearchResult[]) {
  return jobs
    .map((job) => ({ job, analysis: analyzeMatch(profile, job) }))
    .sort((a, b) => b.analysis.score - a.analysis.score || b.job.publishedTimestamp - a.job.publishedTimestamp);
}
