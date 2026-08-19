import { type JSX } from "react";

export function Field({ label, type = "text", value, onChange, placeholder, icon }: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: JSX.Element;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon && <span className="opacity-60">{icon}</span>}{label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-background text-foreground text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--neon-violet)] focus:border-[var(--neon-violet)]/60 transition-all"
      />
    </label>
  );
}
