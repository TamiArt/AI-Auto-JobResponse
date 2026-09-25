import { useMemo, useState } from "react";
import type { AiTask, CareerProfile } from "../../domain/types";
import { buildAiPackage, buildPrompt } from "../../lib/aiPackage";

interface Props { profile: CareerProfile }

const taskLabels: Record<AiTask, string> = {
  "analyze-job": "Проанализировать вакансию",
  "tailor-resume": "Адаптировать резюме",
  "cover-letter": "Сопроводительное письмо",
  "skill-gap": "Найти пробелы в навыках",
  interview: "Подготовить к интервью",
};

export function AiPanel({ profile }: Props) {
  const [task, setTask] = useState<AiTask>("analyze-job");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const prompt = useMemo(() => buildPrompt(buildAiPackage(task, profile, { title, company, description, url })), [task, profile, title, company, description, url]);

  const openChat = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      window.open(`https://gemini.google.com/app`, "_blank", "noopener,noreferrer");
    } catch {
      window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
    }
  };

  const runGemini = async () => {
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/ai/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey, prompt }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gemini request failed");
      setResult(String(data.text || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить запрос");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">AI Career Studio</h1><p className="text-sm text-muted-foreground mt-1.5 leading-6">Career Graph + вакансия превращаются в безопасный, проверяемый AI-контекст.</p></div>
      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Задача</span><select value={task} onChange={(e) => setTask(e.target.value as AiTask)} className="w-full rounded-xl border border-border bg-input-background focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none px-3 py-2.5 text-sm">{Object.entries(taskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Компания</span><input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        </div>
        <label className="space-y-1.5 block"><span className="text-[10px] font-mono uppercase text-muted-foreground">Название вакансии</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        <label className="space-y-1.5 block"><span className="text-[10px] font-mono uppercase text-muted-foreground">Ссылка</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        <label className="space-y-1.5 block"><span className="text-[10px] font-mono uppercase text-muted-foreground">Описание вакансии</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={9} placeholder="Вставьте текст вакансии…" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-[1.25rem] border border-border bg-background p-4 sm:p-5 shadow-[var(--shadow-soft)]"><div className="text-sm font-semibold">Открыть в Gemini</div><p className="text-xs text-muted-foreground mt-1">Запрос копируется в буфер, Gemini открывается отдельно. API-ключ не нужен.</p><button onClick={openChat} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm hover:opacity-95">Скопировать и открыть Gemini</button></div>
          <div className="rounded-xl border border-border p-4"><div className="text-sm font-semibold">Gemini API</div><p className="text-xs text-muted-foreground mt-1">Ключ используется только для текущего запроса и не сохраняется приложением.</p><input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gemini API key" className="mt-3 w-full rounded-xl border border-border bg-input-background px-3 py-2 text-sm" /><button disabled={!apiKey || busy} onClick={runGemini} className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Анализ…" : "Запустить Gemini"}</button></div>
        </div>
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</div>}
        {result && <div className="rounded-[1.25rem] border border-border bg-secondary/50 p-5 whitespace-pre-wrap text-sm leading-6">{result}</div>}
      </section>
    </div>
  );
}
