import { useMemo, useState } from "react";
import { ExternalLink, FileText, MessageSquare, Send, ShieldCheck, Sparkles, Target, CheckCircle2 } from "lucide-react";
import type { CareerProfile } from "../../domain/types";
import type { SearchResult } from "../search/searchService";

type StudioStep = "prepare" | "preview" | "confirm" | "tracked";
type MaterialKind = "cover-letter" | "recruiter-message" | "questionnaire" | "tech-answer";

const MATERIAL_LABELS: Record<MaterialKind, string> = {
  "cover-letter": "Сопроводительное письмо",
  "recruiter-message": "Сообщение рекрутеру",
  questionnaire: "Ответ на анкету",
  "tech-answer": "Технический ответ",
};

interface Props {
  job: SearchResult | null;
  profile: CareerProfile;
  onClearJob: () => void;
}

function buildDraft(kind: MaterialKind, job: SearchResult, profile: CareerProfile): string {
  const role = profile.headline || profile.targetRoles[0] || "кандидат";
  const skills = profile.skills.filter((skill) => skill.confidence === "confirmed").slice(0, 5).map((skill) => skill.name).join(", ");
  if (kind === "cover-letter") {
    return `Здравствуйте!

Хочу откликнуться на позицию «${job.title}» в компании «${job.company}».

Мой профиль: ${role}.
Ключевые подтверждённые навыки: ${skills || "требуют уточнения"}.

Буду рада обсудить, чем мой опыт может быть полезен вашей команде.

С уважением,
${profile.name || "Кандидат"}`;
  }
  if (kind === "recruiter-message") return `Здравствуйте! Меня заинтересовала вакансия «${job.title}» в «${job.company}». Мой профиль — ${role}. Буду рада обсудить вакансию и формат сотрудничества.`;
  if (kind === "questionnaire") return "Черновик ответа. Проверьте факты, цифры и формулировки перед отправкой.";
  return "Черновик технического ответа. Не отправляйте его без проверки фактов и соответствия вашему реальному опыту.";
}

export function ApplicationStudio({ job, profile, onClearJob }: Props) {
  const [step, setStep] = useState<StudioStep>("prepare");
  const [kind, setKind] = useState<MaterialKind>("cover-letter");
  const [material, setMaterial] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"draft" | "ready" | "submitted">("draft");

  const hasJob = Boolean(job);
  const previewText = useMemo(() => material.trim(), [material]);

  if (!job) {
    return (
      <div className="max-w-4xl space-y-6">
        <section className="rounded-[1.5rem] border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <Target className="text-[var(--neon-violet)]" size={22} />
            <div><h1 className="text-2xl font-semibold">Application Studio</h1><p className="text-sm text-muted-foreground mt-1">Выберите вакансию из поиска или режима «Подбор».</p></div>
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Здесь будет единое рабочее место отклика: вакансия → AI → редактирование → Preview → подтверждение → трекинг.
          </div>
        </section>
      </div>
    );
  }

  const prepare = () => {
    setMaterial(buildDraft(kind, job, profile));
    setStatus("ready");
    setStep("preview");
    setConsent(false);
  };

  const confirmAndOpen = () => {
    if (!consent || !previewText) return;
    setStatus("submitted");
    setStep("tracked");
    window.open(job.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><div className="text-[10px] font-mono uppercase tracking-wider text-[var(--neon-violet)]">Application Studio</div><h1 className="text-2xl font-semibold tracking-tight mt-1">{job.title}</h1><p className="text-sm text-muted-foreground mt-1">{job.company} · {job.location}</p></div>
        <button type="button" onClick={onClearJob} className="rounded-xl border border-border px-3 py-2 text-xs font-mono">Выбрать другую вакансию</button>
      </div>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid md:grid-cols-4 gap-2">
          {([["prepare","1. Подготовка"],["preview","2. Preview"],["confirm","3. Подтверждение"],["tracked","4. Трекер"]] as const).map(([id,label]) =>
            <div key={id} className={`rounded-xl border px-3 py-2 text-xs font-mono ${step === id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>{label}</div>
          )}
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-secondary p-2"><Sparkles size={16} /></div><div><h2 className="font-semibold">Вакансия и контекст</h2><p className="text-xs text-muted-foreground mt-1">Career Profile используется для подготовки материалов. Неподтверждённые сведения не должны становиться фактами.</p></div></div>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-border p-3"><span className="text-muted-foreground">Компания</span><div className="mt-1 font-medium">{job.company}</div></div>
          <div className="rounded-xl border border-border p-3"><span className="text-muted-foreground">Формат</span><div className="mt-1 font-medium">{job.workMode === "remote" ? "Удалённо" : job.workMode === "hybrid" ? "Гибрид" : "Офис"}</div></div>
          <div className="rounded-xl border border-border p-3"><span className="text-muted-foreground">Зарплата</span><div className="mt-1 font-medium">{job.salary}</div></div>
        </div>

        <label className="block space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Материал</span><select value={kind} onChange={(e) => setKind(e.target.value as MaterialKind)} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm">{Object.entries(MATERIAL_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>

        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-xs leading-5">
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck size={14} /> Проверка фактов обязательна</div>
          <p className="mt-1 text-muted-foreground">JOBOS не подтверждает за вас образование, сертификаты, стаж и достижения. Проверьте каждый факт перед отправкой.</p>
        </div>

        {step === "prepare" && <button type="button" onClick={prepare} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"><Sparkles size={14} />Подготовить черновик</button>}

        {(step === "preview" || step === "confirm" || step === "tracked") && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} />{MATERIAL_LABELS[kind]}</div>
            <textarea value={material} onChange={(e) => { setMaterial(e.target.value); setStatus("draft"); setStep("preview"); setConsent(false); }} rows={12} className="w-full rounded-xl border border-border bg-input-background px-3 py-3 text-sm leading-6" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setStep("preview"); setConsent(false); }} className="rounded-xl border border-border px-4 py-2.5 text-sm">Preview</button>
              <button type="button" onClick={() => { setStep("confirm"); setConsent(false); }} disabled={!previewText} className="rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50">Перейти к подтверждению</button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-4">
            <div className="flex items-start gap-3"><CheckCircle2 className="text-primary mt-0.5" size={18} /><div><div className="font-semibold text-sm">Последняя проверка</div><p className="text-xs text-muted-foreground mt-1">После подтверждения JOBOS только откроет страницу вакансии. Автоматическая отправка формы без вашего действия не выполняется.</p></div></div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /><span>Я проверила текст и факты и подтверждаю, что готова открыть вакансию для ручной отправки.</span></label>
            <button type="button" disabled={!consent || !previewText} onClick={confirmAndOpen} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50"><Send size={14} />Подтвердить и открыть вакансию</button>
          </div>
        )}

        {step === "tracked" && (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2 font-semibold text-sm"><MessageSquare size={15} />Отклик подготовлен</div>
            <p className="text-xs text-muted-foreground mt-1">Статус: {status === "submitted" ? "страница вакансии открыта, отправка выполняется вручную" : "черновик"}.</p>
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 rounded-xl border border-border px-3 py-2 text-xs"><ExternalLink size={12} />Открыть вакансию</a>
          </div>
        )}
      </section>
    </div>
  );
}
