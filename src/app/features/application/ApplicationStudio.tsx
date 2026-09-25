import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ExternalLink, FileText, MessageSquare, Send, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { AiTask, CareerProfile } from "../../domain/types";
import { buildAiPackage, buildPrompt } from "../../lib/aiPackage";
import type { SearchResult } from "../search/searchService";
import { saveApplication } from "./applicationStorage";

type StudioStep = "prepare" | "preview" | "confirm" | "tracked";
type MaterialKind = "cover-letter" | "recruiter-message" | "questionnaire" | "tech-answer";
type ExternalProvider = "gemini" | "chatgpt" | "qwen";

const MATERIAL_LABELS: Record<MaterialKind, string> = {
  "cover-letter": "Сопроводительное письмо",
  "recruiter-message": "Сообщение рекрутеру",
  questionnaire: "Ответ на анкету",
  "tech-answer": "Технический ответ",
};

const PROVIDER_URLS: Record<ExternalProvider, string> = {
  gemini: "https://gemini.google.com/app",
  chatgpt: "https://chatgpt.com/",
  qwen: "https://chat.qwen.ai/",
};

interface Props {
  job: SearchResult | null;
  profile: CareerProfile;
  onClearJob: () => void;
}

function taskFor(kind: MaterialKind): AiTask {
  return kind === "cover-letter" || kind === "recruiter-message" ? "cover-letter" : "interview";
}

function buildApplicationPrompt(kind: MaterialKind, job: SearchResult, profile: CareerProfile): string {
  const pkg = buildAiPackage(taskFor(kind), profile, {
    title: job.title,
    company: job.company,
    description: job.description || [job.location, job.experience, ...job.tags].join(" • "),
    url: job.url,
  });
  const outputRules: Record<MaterialKind, string> = {
    "cover-letter": "Write a concise Russian cover letter, 120-180 words. Use only confirmed evidence from the Career Graph. Do not invent education, certificates, dates, employers, metrics or achievements.",
    "recruiter-message": "Write a concise Russian recruiter message, 50-90 words. State only confirmed facts and ask one useful question about the role or process.",
    questionnaire: "Prepare a structured draft for a typical application questionnaire. For every fact not present in the Career Graph write UNKNOWN rather than inventing it. Do not invent education or certificates.",
    "tech-answer": "Prepare a concise interview-style technical answer relevant to this vacancy. Separate confirmed experience from knowledge gaps. Never claim hands-on experience that is not confirmed.",
  };
  return buildPrompt(pkg) + "\n\nOUTPUT FORMAT:\n" + outputRules[kind];
}

function fallbackDraft(kind: MaterialKind, job: SearchResult, profile: CareerProfile): string {
  const role = profile.headline || profile.targetRoles[0] || "кандидат";
  const skills = profile.skills.filter((skill) => skill.confidence === "confirmed").slice(0, 5).map((skill) => skill.name).join(", ");
  if (kind === "cover-letter") return `Здравствуйте!\n\nХочу откликнуться на позицию «${job.title}» в компании «${job.company}».\n\nМой профиль: ${role}. Подтверждённые навыки: ${skills || "требуют уточнения"}.\n\nБуду рада обсудить, чем мой подтверждённый опыт может быть полезен вашей команде.\n\nС уважением,\n${profile.name || "Кандидат"}`;
  if (kind === "recruiter-message") return `Здравствуйте! Меня заинтересовала вакансия «${job.title}» в «${job.company}». Мой профиль — ${role}. Буду рада обсудить вакансию и формат сотрудничества.`;
  if (kind === "questionnaire") return "Черновик ответа. Проверьте факты, цифры, образование и сертификаты перед отправкой.";
  return "Черновик технического ответа. Проверьте, соответствует ли каждая формулировка вашему реальному подтверждённому опыту.";
}

export function ApplicationStudio({ job, profile, onClearJob }: Props) {
  const [step, setStep] = useState<StudioStep>("prepare");
  const [kind, setKind] = useState<MaterialKind>("cover-letter");
  const [material, setMaterial] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"draft" | "ready" | "opened">("draft");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<ExternalProvider>("gemini");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previewText = useMemo(() => material.trim(), [material]);
  const prompt = useMemo(() => job ? buildApplicationPrompt(kind, job, profile) : "", [kind, job, profile]);

  if (!job) {
    return (
      <div className="max-w-4xl space-y-6">
        <section className="rounded-[1.5rem] border border-border bg-card p-7 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3"><Target className="text-[var(--neon-violet)]" size={22} /><div><h1 className="text-2xl font-semibold">Application Studio</h1><p className="text-sm text-muted-foreground mt-1">Выберите вакансию из поиска или режима «Подбор».</p></div></div>
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Здесь единый поток: вакансия → AI → редактирование → Preview → подтверждение → трекинг.</div>
        </section>
      </div>
    );
  }

  const saveRecord = (nextStatus: "draft" | "ready" | "opened", nextMaterial = material) => {
    if (!nextMaterial.trim()) return;
    saveApplication({ id: `${job.id}:${kind}`, jobId: job.id, job, materialKind: kind, material: nextMaterial, status: nextStatus, updatedAt: new Date().toISOString() });
  };

  const prepareFallback = () => {
    const draft = fallbackDraft(kind, job, profile);
    setMaterial(draft);
    setStatus("ready");
    setStep("preview");
    setConsent(false);
    setError("");
    saveRecord("ready", draft);
  };

  const generateWithGemini = async () => {
    if (!apiKey.trim()) return;
    setBusy(true); setError(""); setConsent(false);
    try {
      const response = await fetch("/api/ai/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey, prompt }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gemini request failed");
      const text = String(data.text || "").trim();
      if (!text) throw new Error("AI не вернул текст");
      setMaterial(text);
      setStatus("ready");
      setStep("preview");
      saveRecord("ready", text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить AI-запрос");
    } finally { setBusy(false); }
  };

  const openExternalAi = async () => {
    try { await navigator.clipboard.writeText(prompt); } catch { /* clipboard can be unavailable */ }
    window.open(PROVIDER_URLS[provider], "_blank", "noopener,noreferrer");
  };

  const confirmAndOpen = () => {
    if (!consent || !previewText) return;
    setStatus("opened");
    setStep("tracked");
    saveRecord("opened");
    window.open(job.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><div className="text-[10px] font-mono uppercase tracking-wider text-[var(--neon-violet)]">Application Studio</div><h1 className="text-2xl font-semibold tracking-tight mt-1">{job.title}</h1><p className="text-sm text-muted-foreground mt-1">{job.company} · {job.location}</p></div>
        <button type="button" onClick={onClearJob} className="rounded-xl border border-border px-3 py-2 text-xs font-mono">Выбрать другую вакансию</button>
      </div>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid md:grid-cols-4 gap-2">{([["prepare","1. Подготовка"],["preview","2. Preview"],["confirm","3. Подтверждение"],["tracked","4. Трекер"]] as const).map(([id,label]) => <div key={id} className={`rounded-xl border px-3 py-2 text-xs font-mono ${step === id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>{label}</div>)}</div>
      </section>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-secondary p-2"><Sparkles size={16} /></div><div><h2 className="font-semibold">Вакансия и контекст</h2><p className="text-xs text-muted-foreground mt-1">AI получает Career Profile и контекст вакансии. Неподтверждённые сведения не превращаются в факты.</p></div></div>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-border p-3"><span className="text-muted-foreground">Компания</span><div className="mt-1 font-medium">{job.company}</div></div>
          <div className="rounded-xl border border-border p-3"><span className="text-muted-foreground">Формат</span><div className="mt-1 font-medium">{job.workMode === "remote" ? "Удалённо" : job.workMode === "hybrid" ? "Гибрид" : job.workMode === "onsite" ? "Офис" : "Не указан"}</div></div>
          <div className="rounded-xl border border-border p-3"><span className="text-muted-foreground">Зарплата</span><div className="mt-1 font-medium">{job.salary || "Не указана"}</div></div>
        </div>

        <label className="block space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Материал</span><select value={kind} onChange={(e) => { setKind(e.target.value as MaterialKind); setStep("prepare"); setMaterial(""); setError(""); }} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm">{Object.entries(MATERIAL_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="text-sm font-semibold">AI-подготовка</div>
          <p className="text-xs text-muted-foreground mt-1">Основной режим — ваш Gemini API key. Ключ используется только для текущего запроса и не сохраняется.</p>
          <div className="grid md:grid-cols-[1fr_auto] gap-2 mt-3"><input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gemini API key" className="rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /><button type="button" disabled={!apiKey.trim() || busy} onClick={() => void generateWithGemini()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50"><Sparkles size={14} />{busy ? "AI готовит…" : "Сгенерировать AI"}</button></div>
          <div className="flex flex-wrap items-center gap-2 mt-3"><span className="text-xs text-muted-foreground">Без API:</span>{(["gemini","chatgpt","qwen"] as ExternalProvider[]).map((item) => <button key={item} type="button" onClick={() => setProvider(item)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${provider === item ? "border-primary bg-primary/10" : "border-border"}`}>{item === "chatgpt" ? "ChatGPT" : item === "qwen" ? "Qwen" : "Gemini"}</button>)}<button type="button" onClick={() => void openExternalAi()} className="rounded-lg border border-border px-3 py-1.5 text-[11px]">Скопировать prompt и открыть AI</button></div>
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-xs leading-5"><div className="flex items-center gap-2 font-semibold"><ShieldCheck size={14} /> Проверка фактов обязательна</div><p className="mt-1 text-muted-foreground">Не подтверждайте образование, сертификаты, стаж или достижения, если их нет в Career Profile. AI-текст нужно проверить и отредактировать.</p></div>

        {step === "prepare" && <button type="button" onClick={prepareFallback} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm"><FileText size={14} />Создать базовый черновик без AI</button>}

        {(step === "preview" || step === "confirm" || step === "tracked") && <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} />{MATERIAL_LABELS[kind]}</div>
          <textarea value={material} onChange={(e) => { setMaterial(e.target.value); setStatus("draft"); setStep("preview"); setConsent(false); }} rows={12} className="w-full rounded-xl border border-border bg-input-background px-3 py-3 text-sm leading-6" />
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setStep("preview"); setConsent(false); }} className="rounded-xl border border-border px-4 py-2.5 text-sm">Preview</button><button type="button" onClick={() => { setStep("confirm"); setConsent(false); saveRecord("ready"); }} disabled={!previewText} className="rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50">Перейти к подтверждению</button></div>
        </div>}

        {step === "confirm" && <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-4">
          <div className="flex items-start gap-3"><CheckCircle2 className="text-primary mt-0.5" size={18} /><div><div className="font-semibold text-sm">Последняя проверка</div><p className="text-xs text-muted-foreground mt-1">После подтверждения JOBOS только откроет страницу вакансии. Автоматическая отправка формы без вашего действия не выполняется.</p></div></div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /><span>Я проверила текст и факты и подтверждаю, что готова открыть вакансию для ручной отправки.</span></label>
          <button type="button" disabled={!consent || !previewText} onClick={confirmAndOpen} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50"><Send size={14} />Подтвердить и открыть вакансию</button>
        </div>}

        {step === "tracked" && <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-4">
          <div className="flex items-center gap-2 font-semibold text-sm"><MessageSquare size={15} />Отклик подготовлен и сохранён</div><p className="text-xs text-muted-foreground mt-1">Статус: {status === "opened" ? "страница вакансии открыта, отправка выполняется вручную" : "черновик"}.</p><a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 rounded-xl border border-border px-3 py-2 text-xs"><ExternalLink size={12} />Открыть вакансию</a>
        </div>}

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</div>}
      </section>
    </div>
  );
}
