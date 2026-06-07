export function RouteFallback() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-neuro-bg text-neuro-muted" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="h-11 w-11 rounded-full border-4 border-white/10 border-t-neuro-accent animate-spin" aria-hidden="true" />
        <p className="text-sm font-semibold">Chargement de l’expérience…</p>
      </div>
    </div>
  );
}
