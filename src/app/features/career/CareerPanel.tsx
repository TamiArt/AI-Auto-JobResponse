import { useState } from "react";
import type { CareerProfile, CareerSkill } from "../../domain/types";

const levels: CareerSkill["level"][] = ["beginner", "intermediate", "advanced", "expert"];

interface Props {
  profile: CareerProfile;
  onChange: (profile: CareerProfile) => void;
}

export function CareerPanel({ profile, onChange }: Props) {
  const [skill, setSkill] = useState("");
  const [role, setRole] = useState("");

  const update = (patch: Partial<CareerProfile>) => onChange({ ...profile, ...patch, updatedAt: new Date().toISOString() });
  const addRole = () => {
    const value = role.trim();
    if (!value || profile.targetRoles.includes(value)) return;
    update({ targetRoles: [...profile.targetRoles, value] });
    setRole("");
  };
  const addSkill = () => {
    const value = skill.trim();
    if (!value || profile.skills.some((item) => item.name.toLowerCase() === value.toLowerCase())) return;
    update({ skills: [...profile.skills, { id: crypto.randomUUID(), name: value, category: "general", level: "intermediate", confidence: "confirmed" }] });
    setSkill("");
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Career Graph</h1><p className="text-sm text-muted-foreground mt-1.5 leading-6">Один редактируемый источник правды о вашей карьере.</p></div>
      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Имя</span><input value={profile.name} onChange={(e) => update({ name: e.target.value })} className="w-full rounded-xl border border-border bg-input-background focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none px-3 py-2.5 text-sm" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Заголовок</span><input value={profile.headline} onChange={(e) => update({ headline: e.target.value })} placeholder="QA Engineer / Frontend Developer" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Локация</span><input value={profile.location} onChange={(e) => update({ location: e.target.value })} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Зарплата</span><input value={profile.salary} onChange={(e) => update({ salary: e.target.value })} placeholder="€2500+" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Формат</span><select value={profile.workMode} onChange={(e) => update({ workMode: e.target.value as CareerProfile["workMode"] })} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm"><option value="any">Любой</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label>
        </div>
        <div><span className="text-[10px] font-mono uppercase text-muted-foreground">Целевые роли</span><div className="flex gap-2 mt-1.5"><input value={role} onChange={(e) => setRole(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRole()} placeholder="QA Engineer" className="flex-1 rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /><button onClick={addRole} className="rounded-xl px-4 border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80">Добавить</button></div><div className="flex flex-wrap gap-2 mt-2">{profile.targetRoles.map((item) => <button key={item} onClick={() => update({ targetRoles: profile.targetRoles.filter((x) => x !== item) })} className="rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-xs">{item} ×</button>)}</div></div>
        <div><span className="text-[10px] font-mono uppercase text-muted-foreground">Навыки</span><div className="flex gap-2 mt-1.5"><input value={skill} onChange={(e) => setSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()} placeholder="Python, SQL, Playwright…" className="flex-1 rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /><button onClick={addSkill} className="rounded-xl px-4 border border-border hover:bg-muted">Добавить</button></div><div className="space-y-2 mt-3">{profile.skills.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"><span className="flex-1 text-sm">{item.name}</span><select value={item.level} onChange={(e) => update({ skills: profile.skills.map((s) => s.id === item.id ? { ...s, level: e.target.value as CareerSkill["level"] } : s) })} className="bg-transparent text-xs"><option value={levels[0]}>Beginner</option><option value={levels[1]}>Intermediate</option><option value={levels[2]}>Advanced</option><option value={levels[3]}>Expert</option></select><button onClick={() => update({ skills: profile.skills.filter((s) => s.id !== item.id) })} className="text-muted-foreground hover:text-foreground">×</button></div>)}</div></div>
      </section>
    </div>
  );
}
