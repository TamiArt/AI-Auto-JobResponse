import type { CareerProfile } from "../domain/types";

const KEY = "jobos_career_profile_v1";

export const EMPTY_CAREER_PROFILE: CareerProfile = {
  name: "",
  headline: "",
  targetRoles: [],
  location: "",
  workMode: "any",
  salary: "",
  languages: [],
  skills: [],
  experience: [],
  projects: [],
  goals: [],
  constraints: [],
  updatedAt: new Date(0).toISOString(),
};

export function loadCareerProfile(): CareerProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_CAREER_PROFILE;
    return { ...EMPTY_CAREER_PROFILE, ...(JSON.parse(raw) as Partial<CareerProfile>) };
  } catch {
    return EMPTY_CAREER_PROFILE;
  }
}

export function persistCareerProfile(profile: CareerProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
  } catch {
    // Local storage may be unavailable in private/restricted browser contexts.
  }
}
