import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ChevronLeft, X, Shield, Key, HelpCircle, FileText, ArrowRight, Loader2, Briefcase, Target, MapPin, Check, BrainCircuit, Hand, Zap, Eye, Pencil, RotateCcw, ThumbsUp, SkipForward, Square, Rocket, Plus, Bot, Building2, ExternalLink } from "lucide-react";
import type { ExecMode, PendingVacancy, Position } from "../../domain/types";
import { AREA_OPTIONS } from "../../data/catalog";
import { CopyButton, Field } from "../../shared/components";

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${i === current ? "w-5 h-1.5 bg-[var(--neon-violet)]" : i < current ? "w-1.5 h-1.5 bg-[var(--neon-violet)]/40" : "w-1.5 h-1.5 bg-border"}`} />
      ))}
    </div>
  );
}

// ─── Add Position Modal ───────────────────────────────────────────────────────
export function AddPositionModal({ onClose, onSave, onOpenGuide }: { onClose: () => void; onSave: (p: Position) => void; onOpenGuide: (s: string) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ hhToken: "", resumeId: "", jobTitle: "", salaryFrom: "", areaId: "1" });
  const [loading, setLoading] = useState(false);

  const areaName = AREA_OPTIONS.find(a => a.id === form.areaId)?.name || "Москва";
  const canStep0 = form.hhToken.trim().length > 10 && form.resumeId.trim().length > 5;
  const canStep1 = form.jobTitle.trim().length > 1;

  const handleFetchResume = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep(1);
    toast.success("Резюме подключено", { description: "Данные кандидата загружены с HH.ru" });
  };

  const handleSave = () => {
    const pos: Position = {
      id: `pos_${Date.now()}`, ...form, areaName,
      createdAt: new Date().toISOString(),
    };
    onSave(pos);
    toast.success("Позиция добавлена", { description: `${form.jobTitle} · ${areaName}` });
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--neon-violet)]/30 bg-card flex flex-col"
        style={{ boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 25px 50px rgba(0,0,0,0.5)" }}
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <ChevronLeft size={16} />
              </button>
            )}
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: "Oxanium, monospace" }}>
                {step === 0 ? "Подключение HH профиля" : step === 1 ? "Параметры поиска" : "Готово"}
              </h3>
              <div className="mt-1.5"><StepDots current={step} total={2} /></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex-1">
          <AnimatePresence mode="wait">

            {/* Step 0: HH Connection */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-[var(--neon-violet)]/8 border border-[var(--neon-violet)]/20 text-xs font-mono text-[var(--neon-violet)]">
                  <Shield size={13} className="shrink-0 mt-0.5" />
                  Токен и ID хранятся только в вашем браузере. Никуда не передаются.
                </div>

                {/* HH Token field with guide link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Key size={12} className="opacity-60" />HH Access Token *
                    </label>
                    <button onClick={() => { onClose(); onOpenGuide("hhtoken"); }}
                      className="flex items-center gap-1 text-[11px] font-mono text-[var(--neon-violet)] hover:underline transition-colors min-h-[28px] px-1">
                      <HelpCircle size={11} />Как получить?
                    </button>
                  </div>
                  <div className="relative">
                    <input type="password" value={form.hhToken} onChange={e => setForm(f => ({ ...f, hhToken: e.target.value }))} placeholder="Bearer eyJhbGci..."
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all" />
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground px-1">
                    Получается через OAuth на <button onClick={() => { onClose(); onOpenGuide("hhtoken"); }} className="text-[var(--neon-violet)] hover:underline">dev.hh.ru/admin</button>. Действует 14 дней.
                  </p>
                </div>

                {/* Resume ID field with guide link */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText size={12} className="opacity-60" />Resume ID *
                    </label>
                    <button onClick={() => { onClose(); onOpenGuide("resumeid"); }}
                      className="flex items-center gap-1 text-[11px] font-mono text-[var(--neon-violet)] hover:underline transition-colors min-h-[28px] px-1">
                      <HelpCircle size={11} />Как найти?
                    </button>
                  </div>
                  <input type="text" value={form.resumeId} onChange={e => setForm(f => ({ ...f, resumeId: e.target.value }))} placeholder="abc123def456"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] transition-all" />
                  <div className="flex items-start gap-2 px-1 text-[11px] font-mono text-muted-foreground">
                    <HelpCircle size={11} className="shrink-0 mt-0.5 text-[var(--neon-violet)]" />
                    <span>Часть URL вашего резюме: hh.ru/resume/<button onClick={() => { onClose(); onOpenGuide("resumeid"); }} className="text-[var(--neon-violet)] hover:underline">ВАШ_ID</button></span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Search Params */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                <Field label="Желаемая должность *" value={form.jobTitle} onChange={v => setForm(f => ({ ...f, jobTitle: v }))}
                  placeholder="Например: QA-инженер или иллюстратор" icon={<Briefcase size={12} />} />
                <Field label="Минимальная зарплата (₽)" value={form.salaryFrom} onChange={v => setForm(f => ({ ...f, salaryFrom: v }))}
                  placeholder="200000" type="number" icon={<Target size={12} />} />
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin size={12} className="opacity-60" />Локация
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AREA_OPTIONS.map(a => (
                      <button key={a.id} onClick={() => setForm(f => ({ ...f, areaId: a.id }))}
                        className={`py-2.5 px-3 rounded-xl border text-sm font-mono text-left transition-all min-h-[44px] ${form.areaId === a.id ? "border-[var(--neon-violet)]/60 bg-[var(--neon-violet)]/10 text-[var(--neon-violet)]" : "border-border bg-input-background text-foreground/80 hover:border-[var(--neon-violet)]/30"}`}>
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          {step === 0 ? (
            <button onClick={handleFetchResume} disabled={!canStep0 || loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: canStep0 ? "0 0 20px rgba(139,92,246,0.35)" : "none" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" />Проверка резюме...</> : <>Подключить профиль HH <ArrowRight size={14} /></>}
            </button>
          ) : (
            <button onClick={handleSave} disabled={!canStep1}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: canStep1 ? "0 0 20px rgba(139,92,246,0.35)" : "none" }}>
              <Check size={15} />Сохранить позицию
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Execution Mode Modal ─────────────────────────────────────────────────────
export function ExecutionModeModal({ onClose, onSelect }: { onClose: () => void; onSelect: (m: ExecMode) => void }) {
  const [hovered, setHovered] = useState<ExecMode | null>(null);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--neon-violet)]/30 bg-card flex flex-col"
        style={{ boxShadow: "0 0 60px rgba(139,92,246,0.2), 0 25px 50px rgba(0,0,0,0.5)" }}
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base" style={{ fontFamily: "Oxanium, monospace" }}>Выбор режима работы</h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Как ИИ будет отправлять отклики?</p>
        </div>
        <div className="p-5 space-y-3">
          {/* Auto */}
          <motion.button
            onClick={() => onSelect("auto")}
            onHoverStart={() => setHovered("auto")} onHoverEnd={() => setHovered(null)}
            className="w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 min-h-[100px]"
            style={{ borderColor: hovered === "auto" ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.2)", background: hovered === "auto" ? "rgba(139,92,246,0.08)" : "transparent" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)" }}>
                <BrainCircuit size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground" style={{ fontFamily: "Oxanium, monospace" }}>Полный автопилот</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border border-[var(--neon-violet)]/30">Рекомендуется</span>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed">ИИ самостоятельно находит вакансии, генерирует письмо и отправляет отклик. Вы только наблюдаете за статистикой.</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Максимальный охват", "Без участия пользователя", "5–12 сек пауза между откликами"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-1" />
            </div>
          </motion.button>

          {/* Manual */}
          <motion.button
            onClick={() => onSelect("manual")}
            onHoverStart={() => setHovered("manual")} onHoverEnd={() => setHovered(null)}
            className="w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 min-h-[100px]"
            style={{ borderColor: hovered === "manual" ? "rgba(6,182,212,0.5)" : "rgba(6,182,212,0.15)", background: hovered === "manual" ? "rgba(6,182,212,0.06)" : "transparent" }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}>
                <Hand size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-foreground" style={{ fontFamily: "Oxanium, monospace" }}>Ручной контроль</span>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed">ИИ генерирует письмо, но вы сами решаете — отправить, переписать или пропустить вакансию.</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Полный контроль", "Редактирование письма", "Одобрение каждого отклика"].map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-1" />
            </div>
          </motion.button>
        </div>
        <div className="px-5 py-4 border-t border-border">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-border text-sm font-mono text-muted-foreground hover:text-foreground transition-all min-h-[44px]">Отмена</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Manual Review Panel ──────────────────────────────────────────────────────
export function ManualReviewPanel({ vacancy, queue, onApply, onRegenerate, onSkip, onStop }: {
  vacancy: PendingVacancy; queue: number;
  onApply: () => void; onRegenerate: () => void; onSkip: () => void; onStop: () => void;
}) {
  const [letter, setLetter] = useState(vacancy.letter);
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { setLetter(vacancy.letter); setEditing(false); }, [vacancy.id]);

  const handleRegen = async () => {
    setRegenerating(true);
    await new Promise(r => setTimeout(r, 1800));
    setLetter(`Здравствуйте, команда ${vacancy.company}!\n\nПосле детального изучения вашей вакансии "${vacancy.title}" я убеждён, что мой опыт будет максимально полезен. ${vacancy.skills.slice(0, 2).join(" и ")} — технологии, с которыми я работаю ежедневно на протяжении последних лет.\n\nГотов обсудить детали в удобное для вас время.`);
    setRegenerating(false);
    onRegenerate();
  };

  const charCount = letter.length;

  return (
    <motion.div className="mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      {/* Mode banner */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/8 text-[var(--neon-cyan)] text-xs font-mono">
            <Hand size={11} /><span>Ручной контроль</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{queue} в очереди</span>
        </div>
        <button onClick={onStop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/8 text-red-400 text-xs font-mono hover:bg-red-500/15 transition-all min-h-[36px]">
          <Square size={11} />Стоп
        </button>
      </div>

      {/* Vacancy card */}
      <div className="rounded-2xl border border-[var(--neon-violet)]/25 bg-card overflow-hidden" style={{ boxShadow: "0 0 30px rgba(139,92,246,0.08)" }}>
        {/* Vacancy header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "Oxanium, monospace" }}>{vacancy.title}</h3>
              <div className="flex items-center gap-1.5 text-[var(--neon-violet)] text-sm font-medium mb-2">
                <Building2 size={14} />{vacancy.company}
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin size={11} />{vacancy.location}</span>
                <span className="flex items-center gap-1"><Briefcase size={11} />{vacancy.experience}</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">{vacancy.salary}</span>
              </div>
            </div>
            <a href={vacancy.url} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-lg text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center border border-border">
              <ExternalLink size={14} />
            </a>
          </div>
          <p className="text-xs text-foreground/60 leading-relaxed mb-3">{vacancy.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {vacancy.skills.map(s => (
              <span key={s} className="px-2 py-0.5 rounded-md bg-[var(--neon-violet)]/10 border border-[var(--neon-violet)]/20 text-[var(--neon-violet)] text-[10px] font-mono">{s}</span>
            ))}
          </div>
        </div>

        {/* Letter */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Bot size={14} className="text-[var(--neon-violet)]" />
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Сопроводительное письмо</span>
              {regenerating && <Loader2 size={11} className="text-violet-400 animate-spin" />}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono ${charCount > 800 ? "text-red-400" : "text-muted-foreground"}`}>{charCount}/800</span>
              <CopyButton text={letter} />
              <button onClick={() => setEditing(!editing)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-all min-h-[32px] ${editing ? "bg-[var(--neon-violet)]/15 text-[var(--neon-violet)] border-[var(--neon-violet)]/40" : "border-border text-muted-foreground hover:text-foreground"}`}>
                <Pencil size={11} />{editing ? "Просмотр" : "Изменить"}
              </button>
            </div>
          </div>
          {editing ? (
            <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={7}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--neon-violet)]/40 bg-input-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] resize-none transition-all" />
          ) : (
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{regenerating ? "ИИ переписывает письмо..." : letter}</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 grid grid-cols-3 gap-2">
          <button onClick={onSkip}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all min-h-[64px]">
            <SkipForward size={16} />
            <span className="text-[11px] font-mono">Пропустить</span>
          </button>
          <button onClick={handleRegen} disabled={regenerating}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-amber-400/30 text-amber-400 hover:bg-amber-400/8 transition-all min-h-[64px] disabled:opacity-50">
            <RotateCcw size={16} className={regenerating ? "animate-spin" : ""} />
            <span className="text-[11px] font-mono">Переписать</span>
          </button>
          <button onClick={onApply} disabled={charCount > 800}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 min-h-[64px]"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 16px rgba(139,92,246,0.4)" }}>
            <ThumbsUp size={16} />
            <span className="text-[11px] font-mono">Откликнуться</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────────
export function OnboardingScreen({ onAddPosition }: { onAddPosition: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}>
        <div className="relative mb-6 inline-flex">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #06b6d4)", boxShadow: "0 0 40px rgba(139,92,246,0.4)" }}>
            <Zap size={28} className="text-white" />
          </div>
          <div className="absolute -inset-2 rounded-2xl border border-[var(--neon-violet)]/20 animate-pulse" />
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Oxanium, monospace" }}>
          Добро пожаловать в HuntPulse<span className="text-[var(--neon-violet)]">_</span>AI
        </h1>
        <p className="text-muted-foreground text-sm font-mono max-w-sm mx-auto mb-8 leading-relaxed">
          ИИ-агент автоматических откликов на HeadHunter. Добавьте первую позицию, чтобы начать.
        </p>

        {/* Steps preview */}
        <div className="flex items-center justify-center gap-0 mb-10 max-w-xs mx-auto">
          {[
            { icon: <Key size={13} />, label: "Профиль HH" },
            { icon: <Target size={13} />, label: "Параметры" },
            { icon: <Rocket size={13} />, label: "Запуск" },
          ].map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground">{s.icon}</div>
                <span className="text-[9px] font-mono text-muted-foreground">{s.label}</span>
              </div>
              {i < 2 && <div className="w-8 h-px bg-border mx-1 mb-4" />}
            </div>
          ))}
        </div>

        <motion.button
          onClick={onAddPosition}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 mx-auto min-h-[52px]"
          style={{ background: "linear-gradient(135deg, #8B5CF6, #7c3aed)", boxShadow: "0 0 30px rgba(139,92,246,0.45)" }}
        >
          <Plus size={18} />Добавить позицию
        </motion.button>

        <p className="text-[11px] font-mono text-muted-foreground mt-4">Ваши данные хранятся только в браузере</p>
      </motion.div>
    </div>
  );
}
