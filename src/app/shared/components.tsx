import { useState, type JSX } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Loader2, XCircle, SkipForward, Check, Copy, HelpCircle, EyeOff, Eye, ExternalLink, ChevronUp, ChevronDown, Bot } from "lucide-react";
import type { AppRecord, AppStatus, JobSource } from "../domain/types";
import { JOB_SOURCES } from "../data/catalog";

export function StatusBadge({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, { color: string; icon: JSX.Element }> = {
    "Отправлено": { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: <CheckCircle size={11} /> },
    "В процессе": { color: "text-violet-400 bg-violet-400/10 border-violet-400/30", icon: <Loader2 size={11} className="animate-spin" /> },
    "Ошибка": { color: "text-red-400 bg-red-400/10 border-red-400/30", icon: <XCircle size={11} /> },
    "Пропущено": { color: "text-amber-400 bg-amber-400/10 border-amber-400/30", icon: <SkipForward size={11} /> },
  };
  const { color, icon } = map[status];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium border ${color}`}>{icon}{status}</span>;
}

export function PulseDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-violet-400" : "bg-muted-foreground/40"}`} />
    </span>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

export function Field({ label, type = "text", value, onChange, placeholder, textarea, icon, secret, helpId, onHelp }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean; icon?: JSX.Element; secret?: boolean;
  helpId?: string; onHelp?: (id: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {icon && <span className="opacity-60">{icon}</span>}{label}
        </label>
        {helpId && onHelp && (
          <button onClick={() => onHelp(helpId)} className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-[var(--neon-violet)] transition-colors min-h-[28px] px-1.5 rounded-lg hover:bg-[var(--neon-violet)]/8">
            <HelpCircle size={12} /><span className="hidden sm:inline">Как получить?</span>
          </button>
        )}
      </div>
      <div className="relative">
        {textarea ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] focus:border-[var(--neon-violet)]/60 resize-none transition-all" />
        ) : (
          <input type={secret ? (show ? "text" : "password") : type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] focus:border-[var(--neon-violet)]/60 transition-all pr-10" />
        )}
        {secret && !textarea && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function SourceTag({ source }: { source?: JobSource }) {
  if (!source) return null;
  const s = JOB_SOURCES[source];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${s.color} ${s.bg} ${s.border}`}>
      {s.label}
    </span>
  );
}

export function AppCard({ record }: { record: AppRecord }) {
  const [open, setOpen] = useState(false);
  const date = new Date(record.date);
  const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
  return (
    <motion.div layout className="rounded-xl border border-border bg-card overflow-hidden hover:border-[var(--neon-violet)]/30 transition-all duration-200">
      <div className="flex items-center gap-3 p-4 cursor-pointer min-h-[60px]" onClick={() => setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-foreground text-sm" style={{ fontFamily: "Oxanium, monospace" }}>{record.title}</span>
            <StatusBadge status={record.status} />
            <SourceTag source={record.source} />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono flex-wrap">
            <span>{record.company}</span><span className="opacity-40">·</span>
            <span>{record.salary}</span><span className="opacity-40">·</span><span>{dateStr} {timeStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href={record.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="p-2 rounded-lg text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            <ExternalLink size={13} />
          </a>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Bot size={10} /> ИИ-письмо</span>
                <CopyButton text={record.letter} />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{record.letter}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
