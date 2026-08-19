import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle, Briefcase, Building2, Check, Clock, ExternalLink, Loader2,
  MapPin, RefreshCw, Star, Target, Trash2,
} from "lucide-react";
import type { Config, JobSource } from "../../domain/types";
import { AREA_OPTIONS, JOB_SOURCES } from "../../data/catalog";
import { PROFESSION_EXAMPLES, PROFESSION_GROUPS } from "../../data/professions";
import {
  mergeSearchResults,
  searchJobs,
  type RealJobSource,
  type SearchRequest,
  type SearchResult,
  type SearchResponse,
  type SourceRefreshMeta,
} from "./searchService";
import {
  addSearchHistory,
  clearSearchHistory,
  loadFavorites,
  loadSearchHistory,
  persistFavorites,
  type SearchHistoryEntry,
} from "./searchStorage";

const USER_SOURCES: RealJobSource[] = ["hh", "arbeitnow"];
const LIMITED_REFRESH_SOURCES: RealJobSource[] = ["jobicy", "remotive"];
const EXTERNAL_SOURCES: JobSource[] = [
  "habr", "geekjob", "finder", "djinni", "remoteco", "linkedin", "indeed",
  "glassdoor", "wellfound", "behance", "dribbble", "artstation",
];

function sourceLabel(source: string): string {
  if (source === "ats") return "ATS работодателей";
  return JOB_SOURCES[source]?.label || source;
}

function formatRefreshTime(timestamp: number): string {
  if (!timestamp) return "неизвестно";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(timestamp));
}

function RefreshStatus({ source, meta }: { source: RealJobSource; meta: SourceRefreshMeta }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] font-mono text-muted-foreground">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-foreground">{sourceLabel(source)}</span>
        {meta.stale && <span className="text-amber-400">показан сохранённый кэш</span>}
      </div>
      <div className="mt-1">Обновлено: {formatRefreshTime(meta.lastUpdated)} · следующее обновление: {formatRefreshTime(meta.nextRefresh)}</div>
    </div>
  );
}

function SearchResultCard({ result, favorite, onToggleFavorite }: {
  result: SearchResult;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const source = JOB_SOURCES[result.source] || JOB_SOURCES.hh;

  return (
    <article className="rounded-xl border border-border bg-card p-4 hover:border-[var(--neon-violet)]/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${source.color} ${source.bg} ${source.border}`}>{source.label}</span>
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1"><Clock size={10} />{result.publishedAt}</span>
          </div>
          <h3 className="font-semibold text-base leading-snug mb-1">{result.title}</h3>
          <div className="text-sm text-[var(--neon-violet)] flex items-center gap-1.5 mb-2"><Building2 size={13} />{result.company}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin size={11} />{result.location}</span>
            <span>{result.experience}</span>
            <span className="text-emerald-400">{result.salary}</span>
          </div>
        </div>
        <button type="button" onClick={onToggleFavorite}
          className={`p-2 rounded-lg border transition-colors shrink-0 ${favorite ? "border-amber-400/40 text-amber-400 bg-amber-400/10" : "border-border text-muted-foreground hover:text-amber-400"}`}
          aria-label={favorite ? "Удалить из избранного" : "Добавить в избранное"}>
          <Star size={15} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      {result.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {result.tags.map((tag) => <span key={tag} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground">{tag}</span>)}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/70 flex justify-end">
        <a href={result.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--neon-cyan)]/30 text-xs font-mono text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/8 transition-colors"
          aria-label={`Открыть вакансию ${result.title}`}>
          Открыть вакансию <ExternalLink size={12} />
        </a>
      </div>
    </article>
  );
}

export function SearchPanel({ config }: { config: Config }) {
  const [query, setQuery] = useState(config.jobTitle || "");
  const [salaryFrom, setSalaryFrom] = useState(config.salaryFrom || "");
  const [areaId, setAreaId] = useState(config.areaId || "1");
  const [activeSources, setActiveSources] = useState<Set<RealJobSource>>(new Set(USER_SOURCES));
  const [response, setResponse] = useState<SearchResponse>({ results: [], errors: {}, nextHhPage: null });
  const [lastRequest, setLastRequest] = useState<SearchRequest | null>(null);
  const [favorites, setFavorites] = useState<SearchResult[]>(loadFavorites);
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadSearchHistory);
  const [showFavorites, setShowFavorites] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const favoriteIds = new Set(favorites.map((item) => item.id));

  const toggleSource = (source: RealJobSource) => {
    setActiveSources((current) => {
      const next = new Set(current);
      if (next.has(source)) {
        if (next.size > 1) next.delete(source);
      } else next.add(source);
      return next;
    });
  };

  const toggleFavorite = (result: SearchResult) => {
    setFavorites((current) => {
      const exists = current.some((item) => item.id === result.id);
      const next = exists ? current.filter((item) => item.id !== result.id) : [result, ...current];
      persistFavorites(next);
      return next;
    });
  };

  const runSearch = async ({ searchQuery, searchAreaId, searchSalaryFrom, sources }: {
    searchQuery: string; searchAreaId: string; searchSalaryFrom: string; sources: RealJobSource[];
  }) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || loading || loadingMore) return;
    const request: SearchRequest = {
      query: trimmedQuery, areaId: searchAreaId, salaryFrom: searchSalaryFrom, sources, page: 0,
    };

    setLoading(true);
    setSearched(false);
    setShowFavorites(false);
    setResponse({ results: [], errors: {}, nextHhPage: null });
    setLastRequest(request);

    try {
      const next = await searchJobs(request);
      setResponse(next);
      setHistory(addSearchHistory({ query: trimmedQuery, areaId: searchAreaId, salaryFrom: searchSalaryFrom, sources }));
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleSearch = () => runSearch({
    searchQuery: query,
    searchAreaId: areaId,
    searchSalaryFrom: salaryFrom,
    sources: Array.from(activeSources),
  });

  const loadMore = async () => {
    if (!lastRequest || response.nextHhPage === null || loading || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await searchJobs({ ...lastRequest, sources: ["hh"], page: response.nextHhPage });
      setResponse((current) => ({
        results: mergeSearchResults(current.results, next.results),
        errors: { ...current.errors, ...next.errors },
        nextHhPage: next.nextHhPage,
        refresh: current.refresh,
      }));
    } finally {
      setLoadingMore(false);
    }
  };

  const repeatSearch = (entry: SearchHistoryEntry) => {
    setQuery(entry.query);
    setAreaId(entry.areaId);
    setSalaryFrom(entry.salaryFrom);
    setActiveSources(new Set(entry.sources));
    void runSearch({ searchQuery: entry.query, searchAreaId: entry.areaId, searchSalaryFrom: entry.salaryFrom, sources: entry.sources });
  };

  const clearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const failedSources = Object.entries(response.errors);
  const allRequestedSourcesFailed = Boolean(lastRequest)
    && lastRequest.sources.every((source) => Boolean(response.errors[source]));
  const visibleResults = showFavorites ? favorites : response.results;
  const limitedRefresh = LIMITED_REFRESH_SOURCES
    .map((source) => [source, response.refresh?.[source]] as const)
    .filter((entry): entry is readonly [RealJobSource, SourceRefreshMeta] => Boolean(entry[1]));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5">
        <h1 className="text-xl font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Oxanium, monospace" }}>
          <Target size={18} className="text-[var(--neon-violet)]" />Найти работу
        </h1>
        <p className="text-xs font-mono text-muted-foreground mb-4">Актуальные вакансии из job boards, публичных feeds и career ATS работодателей.</p>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void handleSearch()}
                list="profession-examples" placeholder="QA-инженер, дизайнер, разработчик…" autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] text-foreground placeholder:text-muted-foreground" />
              <datalist id="profession-examples">{PROFESSION_EXAMPLES.map((profession) => <option key={profession} value={profession} />)}</datalist>
            </div>
            <button onClick={() => void handleSearch()} disabled={loading || loadingMore || !query.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 min-h-[44px] shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}{loading ? "Ищу…" : "Найти"}
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Быстрый выбор</span>
            <div className="flex gap-1.5 flex-wrap">
              {PROFESSION_GROUPS.map((group) => (
                <button key={group.label} type="button" onClick={() => setQuery(group.examples[0])} title={group.examples.join(", ")}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-mono text-muted-foreground hover:text-[var(--neon-violet)] hover:border-[var(--neon-violet)]/30">
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Регион</span>
              <select value={areaId} onChange={(event) => setAreaId(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-sm font-mono text-foreground">
                {AREA_OPTIONS.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Зарплата от (₽)</span>
              <input type="number" min="0" value={salaryFrom} onChange={(event) => setSalaryFrom(event.target.value)} placeholder="200000"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-sm font-mono text-foreground placeholder:text-muted-foreground" />
            </label>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Основные источники</span>
            <div className="flex gap-2 flex-wrap">
              {USER_SOURCES.map((source) => {
                const meta = JOB_SOURCES[source];
                const selected = activeSources.has(source);
                return (
                  <button key={source} type="button" onClick={() => toggleSource(source)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono border min-h-[38px] ${selected ? `${meta.color} ${meta.bg} ${meta.border}` : "text-muted-foreground border-border"}`}>
                    {selected && <Check size={11} />}{meta.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Remote feeds, Jobicy, Remotive и ATS работодателей подключаются автоматически и не ломают выдачу при временном отказе.</p>
          </div>
        </div>
      </section>

      {(history.length > 0 || favorites.length > 0) && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setShowFavorites(false)} className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${!showFavorites ? "border-[var(--neon-violet)]/40 text-[var(--neon-violet)] bg-[var(--neon-violet)]/10" : "border-border text-muted-foreground"}`}>Последние запросы</button>
              <button type="button" onClick={() => setShowFavorites(true)} className={`px-3 py-1.5 rounded-lg border text-xs font-mono ${showFavorites ? "border-amber-400/40 text-amber-400 bg-amber-400/10" : "border-border text-muted-foreground"}`}>
                <Star size={11} className="inline mr-1" />Избранное · {favorites.length}
              </button>
            </div>
            {!showFavorites && history.length > 0 && <button type="button" onClick={clearHistory} className="text-xs font-mono text-muted-foreground hover:text-red-400"><Trash2 size={11} className="inline mr-1" />Очистить историю</button>}
          </div>
          {!showFavorites && history.length > 0 && <div className="flex flex-wrap gap-2">{history.map((entry) => (
            <button key={entry.id} type="button" onClick={() => repeatSearch(entry)} className="px-3 py-2 rounded-lg border border-border text-xs font-mono text-left hover:border-[var(--neon-violet)]/30">
              <span className="text-foreground">{entry.query}</span><span className="text-muted-foreground"> · {AREA_OPTIONS.find((area) => area.id === entry.areaId)?.name || "Регион"}</span>
            </button>
          ))}</div>}
        </section>
      )}

      <AnimatePresence mode="wait">
        {loading && <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
          <Loader2 size={28} className="animate-spin text-[var(--neon-violet)] mx-auto mb-3" />
          <p className="text-sm font-mono text-muted-foreground">Получаю вакансии из нескольких независимых источников…</p>
        </motion.div>}

        {!loading && showFavorites && <motion.div key="favorites" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-sm font-mono text-muted-foreground mb-3">Избранных вакансий: <span className="text-foreground font-semibold">{favorites.length}</span></div>
          {favorites.length === 0
            ? <div className="rounded-xl border border-border bg-card py-10 text-center text-sm font-mono text-muted-foreground">Добавляйте вакансии звездой — они сохраняются в этом браузере.</div>
            : <div className="space-y-2">{favorites.map((result) => <SearchResultCard key={result.id} result={result} favorite onToggleFavorite={() => toggleFavorite(result)} />)}</div>}
        </motion.div>}

        {searched && !loading && !showFavorites && <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="text-sm font-mono text-muted-foreground">Найдено <span className="font-semibold text-foreground">{visibleResults.length}</span> вакансий</div>
            <button onClick={() => void handleSearch()} disabled={loadingMore} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground disabled:opacity-40"><RefreshCw size={11} />Обновить поиск</button>
          </div>

          {limitedRefresh.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            {limitedRefresh.map(([source, meta]) => <RefreshStatus key={source} source={source} meta={meta} />)}
          </div>}

          {failedSources.length > 0 && <div className="space-y-2 mb-3">{failedSources.map(([source, message]) => (
            <div key={source} className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/8 px-3 py-2 text-xs font-mono text-amber-300">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />{sourceLabel(source)}: {message}. Результаты других источников сохранены.
            </div>
          ))}</div>}

          {allRequestedSourcesFailed && visibleResults.length === 0
            ? <div className="rounded-xl border border-red-400/25 bg-red-400/5 py-10 px-4 text-center"><p className="text-sm font-mono text-red-300 mb-2">Не удалось получить вакансии из доступных источников.</p><p className="text-xs text-muted-foreground">Проверьте соединение и повторите поиск.</p></div>
            : visibleResults.length === 0
              ? <div className="rounded-xl border border-border bg-card py-12 px-4 text-center"><p className="text-sm font-mono text-muted-foreground mb-2">По этому запросу ничего не найдено.</p><p className="text-xs text-muted-foreground">Сократите название должности, уберите зарплату или смените регион.</p></div>
              : <div className="space-y-2">{visibleResults.map((result) => <SearchResultCard key={result.id} result={result} favorite={favoriteIds.has(result.id)} onToggleFavorite={() => toggleFavorite(result)} />)}</div>}

          {response.nextHhPage !== null && visibleResults.length > 0 && lastRequest?.sources.includes("hh") && <div className="pt-4 flex justify-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--neon-violet)]/35 text-sm font-mono text-[var(--neon-violet)] hover:bg-[var(--neon-violet)]/8 disabled:opacity-50 min-h-[44px]">
              {loadingMore && <Loader2 size={13} className="animate-spin" />}{loadingMore ? "Загружаю…" : "Загрузить ещё с HH.ru"}
            </button>
          </div>}
        </motion.div>}
      </AnimatePresence>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Дополнительные площадки</h2>
        <div className="flex flex-wrap gap-2">{EXTERNAL_SOURCES.map((source) => {
          const meta = JOB_SOURCES[source];
          const url = meta.buildSearchUrl(query.trim() || config.jobTitle || "работа", areaId, salaryFrom);
          return <a key={source} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-[var(--neon-violet)]/30">{meta.label}<ExternalLink size={10} /></a>;
        })}</div>
      </section>
    </div>
  );
}
