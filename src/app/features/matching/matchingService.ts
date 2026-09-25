import type { CareerProfile, Config } from "../../domain/types";
import type { SearchResult, SearchRequest } from "../search/searchService";

export interface MatchAnalysis {
  score: number;
  reasons: string[];
  gaps: string[];
}

const normalize = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");

function textFor(job: SearchResult) {
  return normalize([job.title, job.company, job.location, job.experience, job.description, ...job.tags].filter(Boolean).join(" "));
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

export function analyzeMatch(profile: CareerProfile, job: SearchResult): MatchAnalysis {
  const text = textFor(job);
  let score = 0;
  const reasons: string[] = [];
  const gaps: string[] = [];

  const roleMatches = profile.targetRoles.filter((role) => text.includes(normalize(role)));
  if (roleMatches.length) {
    score += 30;
    reasons.push(`Роль совпадает с целью: ${roleMatches[0]}`);
  } else if (profile.targetRoles.length) {
    gaps.push(`Целевая роль не найдена напрямую: ${profile.targetRoles.slice(0, 2).join(", ")}`);
  }

  const matchedSkills = profile.skills.filter((skill) => text.includes(normalize(skill.name)));
  if (matchedSkills.length) {
    score += Math.min(30, matchedSkills.length * 6);
    reasons.push(`Совпадают навыки: ${matchedSkills.slice(0, 4).map((item) => item.name).join(", ")}`);
  }
  const missingSkills = profile.skills.filter((skill) => !text.includes(normalize(skill.name))).slice(0, 3);
  if (missingSkills.length) gaps.push(`Не подтверждены в вакансии: ${missingSkills.map((item) => item.name).join(", ")}`);

  if (profile.workMode === "any" || !job.workMode || profile.workMode === job.workMode) {
    score += 15;
    reasons.push("Формат работы совместим с профилем");
  } else {
    gaps.push(`Формат вакансии: ${job.workMode}; профиль: ${profile.workMode}`);
  }

  if (profile.location && normalize(job.location).includes(normalize(profile.location))) {
    score += 10;
    reasons.push("Локация совпадает с профилем");
  }

  if (profile.headline && text.includes(normalize(profile.headline))) {
    score += 10;
    reasons.push("Заголовок профиля близок к вакансии");
  }

  if (!reasons.length) reasons.push("Совпадение требует проверки по полному описанию вакансии");
  return { score: Math.min(100, score), reasons, gaps };
}

export function sortByProfileMatch(profile: CareerProfile, jobs: SearchResult[]) {
  return jobs
    .map((job) => ({ job, analysis: analyzeMatch(profile, job) }))
    .sort((a, b) => b.analysis.score - a.analysis.score);
}
