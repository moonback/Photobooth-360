import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-label text-neuro-muted mb-2">
      {children}
    </p>
  );
}

export function PanelBlock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`glass-panel overflow-hidden rounded-2xl ${className}`}>
      {children}
    </section>
  );
}

export function Segment<T extends string | number>({
  value, selected, label, sub, onClick, compact,
}: {
  value: T; selected: boolean; label: string; sub?: string; onClick: (v: T) => void; compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-xl border text-center transition-all touch-manipulation active:scale-[0.97] ${
        compact ? "min-h-[2.5rem] px-1.5 py-1.5" : "min-h-[2.75rem] px-2 py-2"
      } ${
        selected
          ? "border-neuro-accent bg-neuro-accent/12 text-white shadow-[0_0_12px_rgba(99,102,241,0.12)]"
          : "border-white/10 bg-white/[0.04] text-neuro-muted"
      }`}
      aria-pressed={selected}
    >
      <span className="block text-[12px] font-bold leading-none">{label}</span>
      {sub && <span className="mt-0.5 block text-[9px] opacity-55">{sub}</span>}
    </button>
  );
}

export function Toggle({ checked, onChange, label, compact, description }: {
  checked: boolean; onChange: () => void; label: string; compact?: boolean; description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex w-full items-center justify-between gap-3 border-b border-white/6 px-4 text-left transition-colors active:bg-white/5 touch-manipulation last:border-b-0 ${
        compact ? "min-h-[3rem] py-2.5" : "min-h-[3.25rem] py-3"
      }`}
      aria-pressed={checked}
    >
      <div className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-white">{label}</span>
        {description && <span className="mt-0.5 block text-caption text-neuro-muted">{description}</span>}
      </div>
      <span className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-neuro-accent" : "bg-white/15"}`}>
        <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
      </span>
    </button>
  );
}

export function HubRow({
  icon, title, summary, onClick, accent,
}: {
  icon: ReactNode; title: string; summary: string; onClick: () => void; accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[3.5rem] w-full items-center gap-3 border-b border-white/6 px-4 py-3 text-left transition-colors active:bg-white/5 touch-manipulation last:border-b-0"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-neuro-accent/18 text-neuro-accent" : "bg-white/8 text-neuro-muted"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white leading-tight">{title}</p>
        <p className="truncate text-caption text-neuro-muted mt-0.5">{summary}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
    </button>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-neuro-accent/20 bg-neuro-accent/8 px-3.5 py-2.5 text-caption leading-relaxed text-indigo-200/90">
      {children}
    </p>
  );
}

export function FieldInput({
  value, onChange, placeholder, type = "text", inputMode,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: "numeric" | "text";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      inputMode={inputMode}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-[16px] text-white placeholder:text-neuro-muted/50 transition-colors focus:border-neuro-accent/50 focus:bg-white/[0.06] focus:outline-none sm:text-[13px]"
    />
  );
}

export function PanelActionButton({
  children, onClick, disabled, variant = "default",
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "default" | "danger" | "accent";
}) {
  const colors = {
    default: "bg-white/8 text-white",
    danger: "bg-red-500/12 text-red-300",
    accent: "bg-neuro-accent/15 text-neuro-accent",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[3.5rem] w-full items-center gap-3 border-b border-white/6 px-4 py-3 text-left transition-colors active:bg-white/5 touch-manipulation last:border-b-0 disabled:opacity-45 ${colors[variant]}`}
    >
      {children}
    </button>
  );
}
