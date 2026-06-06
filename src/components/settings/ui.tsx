import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neuro-muted">
      {children}
    </p>
  );
}

export function PanelBlock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-white/8 bg-white/[0.03] ${className}`}>
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
      className={`rounded-lg border text-center transition-all active:scale-95 touch-manipulation ${
        compact ? "min-h-[2.25rem] px-1.5 py-1.5" : "min-h-[2.5rem] px-2 py-1.5"
      } ${
        selected
          ? "border-neuro-accent bg-neuro-accent/15 text-white"
          : "border-white/10 bg-white/5 text-neuro-muted"
      }`}
      aria-pressed={selected}
    >
      <span className="block text-[12px] font-bold leading-none">{label}</span>
      {sub && <span className="mt-0.5 block text-[9px] opacity-60">{sub}</span>}
    </button>
  );
}

export function Toggle({ checked, onChange, label, compact }: { checked: boolean; onChange: () => void; label: string; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex w-full items-center justify-between border-b border-white/6 px-3.5 text-left transition-all active:bg-white/5 touch-manipulation last:border-b-0 ${
        compact ? "min-h-[2.75rem] py-2" : "min-h-[3rem] py-2.5"
      }`}
      aria-pressed={checked}
    >
      <span className="text-[13px] font-medium text-white">{label}</span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-neuro-accent" : "bg-zinc-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
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
      className="flex min-h-[3.25rem] w-full items-center gap-3 border-b border-white/6 px-3.5 py-2.5 text-left transition-colors active:bg-white/5 touch-manipulation last:border-b-0"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent ? "bg-neuro-accent/20 text-neuro-accent" : "bg-white/8 text-neuro-muted"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white leading-tight">{title}</p>
        <p className="truncate text-[11px] text-neuro-muted">{summary}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
    </button>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[11px] leading-relaxed text-indigo-300">
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
      className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-[16px] text-white placeholder:text-zinc-600 sm:text-[13px]"
    />
  );
}
