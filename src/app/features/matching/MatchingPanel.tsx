import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, RefreshCw, Target } from "lucide-react";
import type { CareerProfile, Config } from "../../domain/types";
import type { SearchResult } from "../search/searchService";
import { searchJobs } from "../search/searchService";
import { buildAiPackage, buildPrompt } from "../../lib/aiPackage";
import { buildMatchingRequest, sortByProfileMatch, type MatchAnalysis } from "./matchingService";

interface Props { profile: CareerProfile; config: Config; }

export function MatchingPanel({ profile, config }: Props) {
  const [jobs, setJobs] = useState<Array<{ job: SearchResult; analysis: MatchAnalysis }>>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await searchJobs(buildMatchingRequest(config));
      setJobs(sortByProfileMatch(profile, response.results).slice(0, 20));
      if (response.errors && Object.keys(response.errors).length) {
        setError("Часть источников вакансий временно недоступна. Доступные результаты показаны.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить вакансии");
    } finally {
      setLoading(false);
    }
  }, [config, profile]);

  useEffect(() => { void load(); }, [load]);

  const prompt = useMemo(() => selected ? buildPrompt(buildAiPackage("analyze-job", profile, {
    title: selected.title,
    company: selected.company,
    description: selected.description || [selected.location, selected.experience, ...selected.tags].join(" • "),
    url: selected.url,
  })) : "", [profile, selected]);

  const analyzeWithGemini = async () => {
    if (!selected || !apiKey) return;
    setBusy(true); setAiResult(""); setError("");
    try {
      const response = await fetch("/api/ai/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, prompt: `${prompt}\n\nОтдельно верни: 1) почему вакансия подходит; 2) какие требования не подтверждены; 3) что нужно уточнить у работодателя. Не выдумывай образование и сертификаты.` }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gemini request failed");
      setAiResult(String(data.text || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить AI-анализ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Подбор вакансий</h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-6">Отдельный режим: обычный поиск остаётся независимым, а здесь Career Profile используется для анализа совместимости.</p>
      </div>

      <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div><div className="font-semibold">Подходящие вакансии</div><div className="text-xs text-muted-foreground mt-1">Сначала локальный разбор профиля, затем глубокая проверка Gemini для выбранной вакансии.</div></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Обновить</button>
        </div>
        {error && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{error}</div>}
        {loading ? <div className="py-12 text-center text-sm text-muted-foreground">Ищу вакансии и сопоставляю с Career Profile…</div> :
          !jobs.length ? <div className="py-12 text-center text-sm text-muted-foreground">Вакансии не найдены. Заполните Career Graph и расширьте параметры поиска.</div> :
          <div className="grid lg:grid-cols-2 gap-3">{jobs.map(({ job, analysis }) => (
            <button key={job.id} type="button" onClick={() => { setSelected(job); setAiResult(""); }} className={`text-left rounded-2xl border p-4 transition-all hover:shadow-sm ${selected?.id === job.id ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
              <div className="flex items-start gap-3"><div className="flex-1 min-w-0"><div className="font-semibold truncate">{job.title}</div><div className="text-sm mt-1">{job.company}</div><div className="text-xs text-muted-foreground mt-1">{job.location} · {job.experience}</div></div><div className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{analysis.score}%</div></div>
              <div className="flex flex-wrap gap-1.5 mt-3">{job.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-1 text-[10px]">{tag}</span>)}</div>
              <div className="mt-3 text-xs text-muted-foreground">{analysis.reasons.slice(0, 2).join(" · ")}</div>
            </button>
          ))}</div>}
      </section>

      {selected && (
        <section className="rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Target size={18} /></div><div><div className="font-semibold">{selected.title}</div><div className="text-sm text-muted-foreground mt-1">{selected.company}</div></div></div>
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div className="rounded-xl bg-secondary/50 p-4"><div className="text-xs font-semibold mb-2">Почему подходит</div><ul className="space-y-1 text-sm">{jobs.find((item) => item.job.id === selected.id)?.analysis.reasons.map((item) => <li key={item}>• {item}</li>)}</ul></div>
            <div className="rounded-xl bg-secondary/50 p-4"><div className="text-xs font-semibold mb-2">Что проверить</div><ul className="space-y-1 text-sm">{jobs.find((item) => item.job.id === selected.id)?.analysis.gaps.map((item) => <li key={item}>• {item}</li>)}</ul></div>
          </div>
          <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-3">
            <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Gemini API key — не сохраняется" className="rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm" />
            <button type="button" disabled={!apiKey || busy} onClick={() => void analyzeWithGemini()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50"><Bot size={15} /> {busy ? "Анализ…" : "Глубокий AI-анализ"}</button>
          </div>
          {aiResult && <div className="mt-4 rounded-2xl border border-border bg-background p-4 whitespace-pre-wrap text-sm leading-6">{aiResult}</div>}
          <a href={selected.url} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm text-primary hover:underline">Открыть вакансию →</a>
        </section>
      )}
    </div>
  );
}
