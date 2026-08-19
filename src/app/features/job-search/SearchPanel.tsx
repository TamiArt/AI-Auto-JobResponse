import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Building2, Check, Clock, ExternalLink, Globe, Loader2, MapPin, Target } from "lucide-react";
import { toast } from "sonner";
import { AREA_OPTIONS, JOB_SOURCES, type Config, type JobSource } from "../../model";
import { getSourceErrorLabel, searchJobs, type SearchResult, type SearchableJobSource } from "../../services/job-search";

// ─── Search Panel ─────────────────────────────────────────────────────────────
const SEARCHABLE_SOURCES: SearchableJobSource[] = ["hh", "remoteok", "arbeitnow"];

function buildSearchUrl(source: JobSource, query: string, areaId: string, salaryFrom: string): string {
  const q = encodeURIComponent(query);
  switch (source) {
    case "hh":       return `https://hh.ru/search/vacancy?text=${q}&area=${areaId}${salaryFrom ? `&salary=${salaryFrom}` : ""}&order_by=publication_time`;
    case "habr":     return `https://career.habr.com/vacancies?q=${q}&sort=date`;
    case "djinni":   return `https://djinni.co/jobs/?primary_keyword=${q}`;
    case "remoteco": return `https://remote.co/remote-jobs/search/?search_keywords=${q}`;
    case "remoteok": return `https://remoteok.io/remote-${q.toLowerCase().replace(/\s+/g, "-")}-jobs`;
    case "telegram": return "https://t.me/devjobs_ru";
    case "arbeitnow":return `https://www.arbeitnow.com/?search=${q}`;
  }
}

export function SearchPanel({ config }: { config: Config }) {
  const [query, setQuery] = useState(config.jobTitle || "");
  const [salaryFrom, setSalaryFrom] = useState(config.salaryFrom || "");
  const [areaId, setAreaId] = useState(config.areaId || "1");
  const [activeSources, setActiveSources] = useState<Set<SearchableJobSource>>(new Set(["hh", "remoteok", "arbeitnow"]));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sourceErrors, setSourceErrors] = useState<Partial<Record<SearchableJobSource, string>>>({});

  const toggleSource = (s: SearchableJobSource) => setActiveSources(prev => {
    const next = new Set(prev);
    if (next.has(s)) { if (next.size > 1) next.delete(s); } else next.add(s);
    return next;
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setSourceErrors({});
    try {
      const response = await searchJobs({
        query: query.trim(),
        areaId,
        salaryFrom,
        sources: Array.from(activeSources),
      });
      setResults(response.results);
      setSourceErrors(response.errors);
      setSearched(true);
    } catch {
      toast.error("Не удалось выполнить поиск", { description: "Проверьте подключение к интернету и повторите попытку." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Oxanium, monospace" }}>
          <Target size={16} className="text-[var(--neon-violet)]" />
          Поиск вакансий
        </h2>
        <p className="text-xs font-mono text-muted-foreground mb-4">Просмотр доступных вакансий по вашим параметрам с прямыми ссылками</p>

        <div className="space-y-4">
          {/* Query row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Frontend Developer, React, Python…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button onClick={handleSearch} disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 min-h-[44px] shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: loading ? "none" : "0 0 16px rgba(139,92,246,0.35)" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
              {loading ? "Ищу…" : "Найти"}
            </button>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Регион</label>
              <select value={areaId} onChange={e => setAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all text-foreground">
                {AREA_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Зарплата от (₽)</label>
              <input type="number" value={salaryFrom} onChange={e => setSalaryFrom(e.target.value)} placeholder="200000"
                className="w-full px-3 py-2 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>

          {/* Source toggles */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Источники</label>
            <div className="flex gap-1.5 flex-wrap">
              {SEARCHABLE_SOURCES.map((id) => {
                const source = JOB_SOURCES[id];
                return (
                  <button key={id} onClick={() => toggleSource(id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold border transition-all min-h-[32px] ${activeSources.has(id) ? `${source.color} ${source.bg} ${source.border}` : "text-muted-foreground border-border bg-transparent"}`}>
                    {activeSources.has(id) && <Check size={10} />}{source.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Только источники с открытым API. Остальные площадки доступны ниже как прямые ссылки на реальный поиск.</p>
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
            <div className="relative">
              <Loader2 size={28} className="animate-spin text-[var(--neon-violet)]" />
            </div>
            <div className="text-sm font-mono">Опрашиваю {activeSources.size} источников…</div>
            <div className="flex gap-1.5">
              {Array.from(activeSources).slice(0, 5).map(s => (
                <span key={s} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${JOB_SOURCES[s].bg} ${JOB_SOURCES[s].color} border ${JOB_SOURCES[s].border}`}>{JOB_SOURCES[s].label}</span>
              ))}
            </div>
          </motion.div>
        )}

        {searched && !loading && (
          <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-mono text-muted-foreground">
                Найдено <span className="text-foreground font-semibold">{results.length}</span> вакансий
                {" · "}запрос: <span className="text-[var(--neon-violet)]">{query}</span>
              </div>
              <div className="flex gap-1">
                {Array.from(new Set(results.map(r => r.source))).map(s => (
                  <span key={s} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${JOB_SOURCES[s].color} ${JOB_SOURCES[s].bg} ${JOB_SOURCES[s].border}`}>{JOB_SOURCES[s].label}</span>
                ))}
              </div>
            </div>

            {Object.keys(sourceErrors).length > 0 && (
              <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs font-mono text-amber-300">
                {Object.entries(sourceErrors).map(([source, error]) => (
                  <div key={source}>{getSourceErrorLabel(source as SearchableJobSource)}: {error}</div>
                ))}
              </div>
            )}

            {results.length === 0 && (
              <div className="py-12 text-center text-muted-foreground font-mono text-sm rounded-xl border border-border bg-card">
                Ничего не найдено. Попробуйте изменить запрос или включить больше источников.
              </div>
            )}

            <div className="space-y-2">
              {results.map((r, i) => {
                const src = JOB_SOURCES[r.source];
                const searchUrl = buildSearchUrl(r.source, query, areaId, salaryFrom);
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-border bg-card hover:border-[var(--neon-violet)]/30 transition-all p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap mb-1.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border shrink-0 ${src.color} ${src.bg} ${src.border}`}>
                            {src.label}
                          </span>
                          <h3 className="text-sm font-semibold text-foreground leading-tight font-mono">{r.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap mb-2">
                          <span className="flex items-center gap-1"><Building2 size={11} />{r.company}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><MapPin size={11} />{r.location}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock size={11} />{r.publishedAt}</span>
                          {r.experience && <><span>·</span><span>{r.experience}</span></>}
                        </div>
                        <div className="text-sm font-mono text-emerald-400 font-semibold mb-2">{r.salary}</div>
                        <div className="flex gap-1 flex-wrap">
                          {r.tags.map(t => (
                            <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold text-white transition-all min-h-[36px] whitespace-nowrap hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)" }}>
                          <ExternalLink size={11} />Открыть
                        </a>
                        <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border transition-all min-h-[36px] whitespace-nowrap hover:opacity-80 ${src.color} ${src.bg} ${src.border}`}>
                          <Globe size={11} />Ещё на {src.label}
                        </a>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Прямые ссылки на поиск по запросу «{query}»</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {(Object.entries(JOB_SOURCES) as [JobSource, typeof JOB_SOURCES[JobSource]][]).map(([id, s]) => (
                    <a key={id} href={buildSearchUrl(id, query, areaId, salaryFrom)} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all hover:opacity-80 ${s.color} ${s.bg} ${s.border}`}>
                      <Globe size={11} /><span className="truncate">{s.label}</span><ExternalLink size={9} className="ml-auto shrink-0 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!loading && !searched && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center py-14 gap-3 text-center text-muted-foreground">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <Target size={24} className="text-[var(--neon-violet)] opacity-60" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-mono text-foreground/70">Введите запрос и нажмите «Найти»</div>
              <div className="text-xs font-mono">Будут показаны вакансии из {Object.keys(JOB_SOURCES).length} источников с прямыми ссылками</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
