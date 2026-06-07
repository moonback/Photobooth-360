import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ErrorBoundary] React runtime error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private reload = () => {
    window.location.reload();
  };

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-dvh bg-neuro-bg px-5 py-[calc(env(safe-area-inset-top)+2rem)] text-neuro-text">
        <section className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center text-center">
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-3xl border border-rose-400/30 bg-rose-500/10 text-rose-200 shadow-[0_24px_80px_rgb(244_63_94_/_0.22)]">
            <AlertTriangle className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-200/80">Incident applicatif</p>
          <h1 className="mt-3 text-balance text-3xl font-black tracking-[-0.05em] text-white">NeuroBooth doit se relancer.</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            Une erreur inattendue a été isolée sans exposer l’expérience kiosque. Rechargez l’application pour reprendre la capture.
          </p>
          <button
            type="button"
            onClick={this.reload}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-black shadow-2xl transition active:scale-95"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Recharger l’application
          </button>
        </section>
      </main>
    );
  }
}
