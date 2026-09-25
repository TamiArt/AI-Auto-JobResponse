import { useMemo, useState } from "react";
import type { AiTask, CareerProfile } from "../../domain/types";
import { buildAiPackage, buildPrompt } from "../../lib/aiPackage";

interface Props { profile: CareerProfile }

type ExternalProvider = "gemini" | "chatgpt" | "qwen";
type ImportedKind = "cover-letter" | "recruiter-message" | "questionnaire" | "tech-answer" | "job-analysis" | "experience" | "other";

const taskLabels: Record<AiTask, string> = {
  "analyze-job": "Проанализировать вакансию",
  "tailor-resume": "Адаптировать резюме",
  "cover-letter": "Сопроводительное письмо",
  "skill-gap": "Найти пробелы в навыках",
  interview: "Подготовить к интервью",
};

const kindLabels: Record<ImportedKind, string> = {
  "cover-letter": "Сопроводительное письмо",
  "recruiter-message": "Сообщение рекрутеру",
  questionnaire: "Ответ на анкету",
  "tech-answer": "Технический ответ",
  "job-analysis": "Анализ вакансии",
  experience: "Описание опыта",
  other: "Другое",
};

const providerUrls: Record<ExternalProvider, string> = {
  gemini: "https://gemini.google.com/app",
  chatgpt: "https://chatgpt.com/",
  qwen: "https://chat.qwen.ai/",
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
  const [provider, setProvider] = useState<ExternalProvider>("gemini");
  const [importText, setImportText] = useState("");
  const [importKind, setImportKind] = useState<ImportedKind>("other");
  const [savedItems, setSavedItems] = useState<Array<{ id: string; kind: ImportedKind; text: string; createdAt: string }>>([]);

  const prompt = useMemo(() => buildPrompt(buildAiPackage(task, profile, { title, company, description, url })), [task, profile, title, company, description, url]);

  const openExternalAi = async () => {
    try { await navigator.clipboard.writeText(prompt); } catch { /* clipboard can be unavailable */ }
    window.open(providerUrls[provider], "_blank", "noopener,noreferrer");
  };

  const runGemini = async () => {
    if (!apiKey.trim()) return;
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/ai/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey, prompt }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gemini request failed");
      setResult(String(data.text || ""));
      setImportText(String(data.text || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить запрос");
    } finally { setBusy(false); }
  };

  const saveImported = () => {
    const text = importText.trim();
    if (!text) return;
    setSavedItems((items) => [...items, { id: crypto.randomUUID(), kind: importKind, text, createdAt: new Date().toISOString() }]);
    setImportText("");
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">AI Career Studio</h1><p className="text-sm text-muted-foreground mt-1.5 leading-6">Подготовьте контекст, откройте выбранный AI и верните ответ обратно в JOBOS для редактирования и сохранения.</p></div>
      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 space-y-5 shadow-[var(--shadow-card)]">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Задача</span><select value={task} onChange={(e) => setTask(e.target.value as AiTask)} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm">{Object.entries(taskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-[10px] font-mono uppercase text-muted-foreground">Компания</span><input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        </div>
        <label className="space-y-1.5 block"><span className="text-[10px] font-mono uppercase text-muted-foreground">Название вакансии</span><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        <label className="space-y-1.5 block"><span className="text-[10px] font-mono uppercase text-muted-foreground">Ссылка</span><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>
        <label className="space-y-1.5 block"><span className="text-[10px] font-mono uppercase text-muted-foreground">Описание вакансии</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} placeholder="Вставьте текст вакансии…" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" /></label>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="text-sm font-semibold">Открыть в AI</div>
          <p className="text-xs text-muted-foreground mt-1">JOBOS копирует готовый контекст. После ответа скопируйте результат и вставьте его ниже.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {(["gemini", "chatgpt", "qwen"] as ExternalProvider[]).map((item) => <button key={item} type="button" onClick={() => setProvider(item)} className={`rounded-xl border px-3 py-2 text-xs ${provider === item ? "border-primary bg-primary/10" : "border-border"}`}>{item === "chatgpt" ? "ChatGPT" : item === "qwen" ? "Qwen" : "Gemini"}</button>)}
            <button type="button" onClick={() => void openExternalAi()} className="rounded-xl bg-primary px-4 py-2 text-xs text-primary-foreground">Скопировать и открыть</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border p-4">
            <div className="text-sm font-semibold">Gemini API</div><p className="text-xs text-muted-foreground mt-1">Ключ используется только для текущего запроса.</p>
            <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gemini API key" className="mt-3 w-full rounded-xl border border-border bg-input-background px-3 py-2 text-sm" />
            <button disabled={!apiKey || busy} onClick={() => void runGemini()} className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Анализ…" : "Запустить Gemini"}</button>
          </div>
          <div className="rounded-2xl border border-border p-4"><div className="text-sm font-semibold">Текущий ответ</div><p className="text-xs text-muted-foreground mt-1">Ответ Gemini автоматически попадает в импорт.</p>{result && <div className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5">{result}</div>}</div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="text-sm font-semibold">AI Workspace · импорт ответа</div>
          <p className="text-xs text-muted-foreground mt-1">Это место, куда возвращается ответ из внешнего AI. Перед сохранением его можно отредактировать.</p>
          <div className="grid md:grid-cols-[1fr_2fr] gap-3 mt-3">
            <select value={importKind} onChange={(e) => setImportKind(e.target.value as ImportedKind)} className="rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={7} placeholder="Вставьте ответ ChatGPT / Qwen / Gemini…" className="rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" />
          </div>
          <button type="button" disabled={!importText.trim()} onClick={saveImported} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50">Сохранить в AI Workspace</button>
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</div>}
        {savedItems.length > 0 && <div className="space-y-2"><div className="text-sm font-semibold">Сохранённые AI-материалы</div>{savedItems.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-card p-4"><div className="text-xs font-semibold">{kindLabels[item.kind]}</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.text}</div></article>)}</div>}
      </section>
    </div>
  );
}
