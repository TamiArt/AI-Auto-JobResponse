import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, Briefcase, Loader2, Check, Building2, MapPin, Clock, ExternalLink, Globe } from "lucide-react";
import type { Config, JobSource } from "../../domain/types";
import { AREA_OPTIONS, JOB_SOURCES } from "../../data/catalog";
import { PROFESSION_EXAMPLES, PROFESSION_GROUPS } from "../../data/professions";

interface SearchResult {
  id: string; title: string; company: string; salary: string;
  location: string; experience: string; publishedAt: string;
  source: JobSource; url: string; tags: string[];
}

function buildSearchUrl(source: JobSource, query: string, areaId: string, salaryFrom: string): string {
  return JOB_SOURCES[source].buildSearchUrl(query, areaId, salaryFrom);
}

function generateResults(query: string, areaId: string, salaryFrom: string, activeSources: Set<JobSource>): SearchResult[] {
  const area = AREA_OPTIONS.find(a => a.id === areaId)?.name || "Россия";
  const sf = salaryFrom ? Number(salaryFrom) : 0;

  const pool: Omit<SearchResult, "id">[] = [
    { title: `Ведущий ${query}`, company: "Крупная продуктовая команда", salary: `${(sf || 180000).toLocaleString("ru")} – ${((sf || 180000) + 100000).toLocaleString("ru")} ₽`, location: area, experience: "4+ лет", publishedAt: "2 часа назад", source: "hh", url: "https://hh.ru/search/vacancy", tags: ["Полная занятость", "Опытный специалист"] },
    { title: `${query} (удалённо)`, company: "Digital-агентство", salary: `${(sf || 120000).toLocaleString("ru")} – ${((sf || 120000) + 80000).toLocaleString("ru")} ₽`, location: "Удалённо", experience: "3+ лет", publishedAt: "5 часов назад", source: "habr", url: "https://career.habr.com/vacancies", tags: ["Удалённо", "Проектная работа"] },
    { title: `${query}`, company: "Креативная студия", salary: `${(sf || 100000).toLocaleString("ru")} – ${((sf || 100000) + 60000).toLocaleString("ru")} ₽`, location: area, experience: "1–3 года", publishedAt: "1 день назад", source: "hh", url: "https://hh.ru/search/vacancy", tags: ["Портфолио", "Гибкий график"] },
    { title: `Стажёр / ${query}`, company: "Образовательный проект", salary: "по результатам интервью", location: "Удалённо", experience: "без опыта", publishedAt: "3 дня назад", source: "djinni", url: "https://djinni.co/jobs/", tags: ["Начало карьеры", "Обучение"] },
    { title: `${query} (remote)`, company: "International team", salary: "по договорённости", location: "Весь мир", experience: "2+ года", publishedAt: "6 часов назад", source: "remoteok", url: "https://remoteok.io", tags: ["Remote", "English"] },
    { title: `Руководитель направления — ${query}`, company: "Сервисная компания", salary: `${(sf || 220000).toLocaleString("ru")} – ${((sf || 220000) + 120000).toLocaleString("ru")} ₽`, location: area, experience: "5+ лет", publishedAt: "12 часов назад", source: "hh", url: "https://hh.ru/search/vacancy", tags: ["Управление", "Полная занятость"] },
    { title: `${query} для международного проекта`, company: "Remote studio", salary: "по договорённости", location: "Весь мир", experience: "3+ года", publishedAt: "2 дня назад", source: "remoteco", url: "https://remote.co/remote-jobs/", tags: ["Портфолио", "Контракт"] },
    { title: `${query} (EU)`, company: "European startup", salary: "по договорённости", location: "Европа / Удалённо", experience: "3+ года", publishedAt: "4 часа назад", source: "arbeitnow", url: "https://www.arbeitnow.com", tags: ["Remote", "Relocation"] },
    { title: `Начинающий ${query}`, company: "Новая команда", salary: `${(sf || 70000).toLocaleString("ru")} – ${((sf || 70000) + 50000).toLocaleString("ru")} ₽`, location: area, experience: "0–2 года", publishedAt: "3 дня назад", source: "hh", url: "https://hh.ru/search/vacancy", tags: ["Junior", "Наставник"] },
    { title: `${query} — подборка вакансий`, company: "Публичные каналы", salary: "разная", location: "Россия / Удалённо", experience: "любой", publishedAt: "обновляется", source: "telegram", url: "https://t.me/devjobs_ru", tags: ["Агрегатор", "Удалённо"] },
  ];

  return pool
    .filter(r => activeSources.has(r.source))
    .map((r, i) => ({ ...r, id: `sr-${i}` }));
}

export function SearchPanel({ config }: { config: Config }) {
  const [query, setQuery] = useState(config.jobTitle || "");
  const [salaryFrom, setSalaryFrom] = useState(config.salaryFrom || "");
  const [areaId, setAreaId] = useState(config.areaId || "1");
  const [activeSources, setActiveSources] = useState<Set<JobSource>>(new Set(Object.keys(JOB_SOURCES) as JobSource[]));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const toggleSource = (s: JobSource) => setActiveSources(prev => {
    const next = new Set(prev);
    if (next.has(s)) { if (next.size > 1) next.delete(s); } else next.add(s);
    return next;
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setTimeout(() => {
      setResults(generateResults(query, areaId, salaryFrom, activeSources));
      setLoading(false);
      setSearched(true);
    }, 900 + Math.random() * 600);
  };

  return (
    <div className="space-y-5">
      {/* Search form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ fontFamily: "Oxanium, monospace" }}>
          <Target size={16} className="text-[var(--neon-violet)]" />
          Поиск вакансий
        </h2>
        <p className="text-xs font-mono text-muted-foreground mb-2">Просмотр демонстрационных вакансий и переход к реальному поиску на сайтах-источниках</p>
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-mono text-amber-400">
          Демо-режим: карточки ниже сгенерированы локально и не являются результатом API. Используйте ссылки «Ещё на …» для актуальной выдачи.
        </div>

        <div className="space-y-4">
          {/* Query row */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                list="profession-examples"
                placeholder="QA-инженер, иллюстратор, разработчик…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all text-foreground placeholder:text-muted-foreground"
              />
              <datalist id="profession-examples">
                {PROFESSION_EXAMPLES.map(profession => <option key={profession} value={profession} />)}
              </datalist>
            </div>
            <button onClick={handleSearch} disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 min-h-[44px] shrink-0"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: loading ? "none" : "0 0 16px rgba(139,92,246,0.35)" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
              {loading ? "Ищу…" : "Найти"}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Популярные направления</label>
            <div className="flex gap-1.5 flex-wrap">
              {PROFESSION_GROUPS.map(group => (
                <button key={group.label} type="button" onClick={() => setQuery(group.examples[0])}
                  title={group.examples.join(", ")}
                  className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-mono text-muted-foreground hover:text-[var(--neon-violet)] hover:border-[var(--neon-violet)]/30 transition-colors">
                  {group.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Можно указать любую профессию вручную — список не ограничивает поиск.</p>
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
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Площадки ({activeSources.size} из {Object.keys(JOB_SOURCES).length})</label>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.entries(JOB_SOURCES) as [JobSource, typeof JOB_SOURCES[JobSource]][]).map(([id, s]) => (
                <button key={id} onClick={() => toggleSource(id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold border transition-all min-h-[32px] ${activeSources.has(id) ? `${s.color} ${s.bg} ${s.border}` : "text-muted-foreground border-border bg-transparent"}`}>
                  {activeSources.has(id) && <Check size={10} />}{s.label}
                </button>
              ))}
            </div>
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
            <div className="text-sm font-mono">Готовлю поиск по {activeSources.size} площадкам…</div>
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
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Все подключённые площадки по запросу «{query}»</div>
                <p className="text-[10px] font-mono text-muted-foreground mb-3">Площадки без разрешённого публичного API открываются во внешнем поиске — приложение не обходит авторизацию и ограничения сайтов.</p>
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
