import { useEffect, useRef, useState, type Key, type ReactNode } from "react";
import { Camera, Check, Clock, Image, Lock, Mic, MicOff, Palette, RotateCcw, Type, Upload, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { uploadLogo } from "../lib/uploadLogo";
import { SUPABASE_CONFIGURED } from "../lib/supabase";

export interface AppSettings {
  eventName: string;
  duration: number;
  facingMode: "user" | "environment";
  resolution: "720p" | "1080p" | "480p";
  countdownSeconds: number;
  accentColor: "indigo" | "rose" | "amber" | "emerald" | "cyan";
  recordAudio: boolean;
  /** Admin PIN for protected settings access */
  adminPin: string;
  /** URL of the splash screen logo */
  logoUrl?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  eventName: "ÉVÉNEMENT 2026",
  duration: 15000,
  facingMode: "user",
  resolution: "720p",
  countdownSeconds: 3,
  accentColor: "indigo",
  recordAudio: false,
  adminPin: "1234",
  logoUrl: "",
};

const ACCENT_COLORS: { value: AppSettings["accentColor"]; label: string; bg: string }[] = [
  { value: "indigo", label: "Indigo", bg: "bg-indigo-500" },
  { value: "rose", label: "Rose", bg: "bg-rose-500" },
  { value: "amber", label: "Ambre", bg: "bg-amber-500" },
  { value: "emerald", label: "Émeraude", bg: "bg-emerald-500" },
  { value: "cyan", label: "Cyan", bg: "bg-cyan-500" },
];

const DURATIONS = [10000, 15000, 30000, 60000, 120000];
const COUNTDOWNS = [0, 3, 5, 10];
const RESOLUTIONS: { value: AppSettings["resolution"]; label: string; sub: string }[] = [
  { value: "480p", label: "480p", sub: "SD" },
  { value: "720p", label: "720p", sub: "HD" },
  { value: "1080p", label: "1080p", sub: "Full HD" },
];

function fmtDuration(ms: number) {
  return ms >= 60000 ? `${ms / 60000} min` : `${ms / 1000}s`;
}

function Card({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="glass-panel rounded-[1.75rem] p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-neuro-accent">{icon}</div>
        <div>
          <h3 className="text-body font-bold text-white">{title}</h3>
          {description && <p className="mt-1 text-caption text-neuro-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Segment<T extends string | number>({ value, selected, label, sub, onClick }: { key?: Key; value: T; selected: boolean; label: string; sub?: string; onClick: (value: T) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`min-h-12 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
        selected ? "border-neuro-accent bg-neuro-accent/15 text-white shadow-[0_0_20px_rgba(99,102,241,0.22)]" : "border-white/10 bg-white/5 text-neuro-muted hover:bg-white/10 hover:text-white"
      }`}
      aria-pressed={selected}
    >
      <span className="block text-sm font-bold">{label}</span>
      {sub && <span className="block text-caption opacity-70">{sub}</span>}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" onClick={onChange} className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10 active:scale-[0.98]" aria-pressed={checked}>
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className={`relative h-8 w-14 rounded-full transition-colors ${checked ? "bg-neuro-accent" : "bg-zinc-700"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-lg transition-transform ${checked ? "translate-x-7" : "translate-x-1"}`} />
      </span>
    </button>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

type LogoUploadState = "idle" | "uploading" | "done" | "error";

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [logoState, setLogoState] = useState<LogoUploadState>("idle");
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setLogoState("idle");
      setLogoError("");
    }
  }, [isOpen, settings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogo = async (file?: File) => {
    if (!file) return;
    setLogoState("uploading");
    setLogoError("");
    try {
      const result = await uploadLogo(file, () => undefined);
      if (!result) throw new Error("Supabase logo upload is not configured");
      update("logoUrl", result.publicUrl);
      setLogoState("done");
    } catch (error) {
      console.error(error);
      setLogoState("error");
      setLogoError("Impossible d'importer le logo. Vérifiez Supabase ou réessayez.");
    }
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-xl sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-neuro-bg shadow-2xl sm:rounded-[2rem]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <header className="sticky top-0 z-10 border-b border-white/10 bg-neuro-bg/90 px-5 py-4 backdrop-blur-xl safe-top">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-bold uppercase tracking-[0.2em] text-neuro-accent">Settings</p>
                  <h2 className="text-title font-black text-white">Configuration borne</h2>
                </div>
                <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-neuro-muted transition-all hover:text-white active:scale-95" aria-label="Fermer les réglages">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="space-y-4 overflow-y-auto p-5 pb-28 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 sm:p-6 sm:pb-6">
              <Card icon={<Type className="h-5 w-5" />} title="Identité événement" description="Nom et logo affichés sur le splash et l'overlay caméra.">
                <label className="mb-2 block text-caption font-semibold text-neuro-muted" htmlFor="event-name">Nom de l'événement</label>
                <input id="event-name" value={draft.eventName} onChange={(event) => update("eventName", event.target.value)} className="mb-4 min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-body text-white placeholder:text-zinc-600" placeholder="Nom de l'événement" />
                <div className="flex items-center gap-3">
                  <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {draft.logoUrl ? <img src={draft.logoUrl} alt="Logo configuré" className="h-full w-full object-contain p-2" /> : <Image className="h-7 w-7 text-neuro-muted" />}
                  </div>
                  <div className="flex-1">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleLogo(event.target.files?.[0])} />
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black transition-all hover:bg-zinc-100 active:scale-[0.98]">
                      <Upload className="h-4 w-4" /> {logoState === "uploading" ? "Import…" : "Importer logo"}
                    </button>
                    {!SUPABASE_CONFIGURED && <p className="mt-2 text-caption text-amber-300">Supabase non configuré : stockage local possible selon navigateur.</p>}
                    {logoError && <p className="mt-2 text-caption text-neuro-error">{logoError}</p>}
                    {logoState === "done" && <p className="mt-2 text-caption text-emerald-300">Logo mis à jour.</p>}
                  </div>
                </div>
              </Card>

              <Card icon={<Video className="h-5 w-5" />} title="Capture" description="Réglages rapides adaptés à l'usage événementiel.">
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((duration) => <Segment key={duration} value={duration} selected={draft.duration === duration} label={fmtDuration(duration)} onClick={(value) => update("duration", value)} />)}
                </div>
                <p className="mb-2 mt-4 text-caption font-semibold text-neuro-muted">Countdown</p>
                <div className="grid grid-cols-4 gap-2">
                  {COUNTDOWNS.map((countdown) => <Segment key={countdown} value={countdown} selected={draft.countdownSeconds === countdown} label={countdown === 0 ? "Off" : `${countdown}s`} onClick={(value) => update("countdownSeconds", value)} />)}
                </div>
              </Card>

              <Card icon={<Camera className="h-5 w-5" />} title="Caméra" description="Priorité mobile : choisir optique et qualité avant la session.">
                <div className="grid grid-cols-2 gap-2">
                  <Segment value="user" selected={draft.facingMode === "user"} label="Selfie" sub="Invité" onClick={(value) => update("facingMode", value)} />
                  <Segment value="environment" selected={draft.facingMode === "environment"} label="Arrière" sub="Kiosque" onClick={(value) => update("facingMode", value)} />
                </div>
                <p className="mb-2 mt-4 text-caption font-semibold text-neuro-muted">Résolution</p>
                <div className="grid grid-cols-3 gap-2">
                  {RESOLUTIONS.map((resolution) => <Segment key={resolution.value} value={resolution.value} selected={draft.resolution === resolution.value} label={resolution.label} sub={resolution.sub} onClick={(value) => update("resolution", value)} />)}
                </div>
              </Card>

              <Card icon={draft.recordAudio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />} title="Audio & sécurité" description="Contrôle simple et protégé pour l'exploitant.">
                <Toggle checked={draft.recordAudio} onChange={() => update("recordAudio", !draft.recordAudio)} label="Enregistrer le micro" />
                <label className="mb-2 mt-4 block text-caption font-semibold text-neuro-muted" htmlFor="admin-pin-settings">PIN administrateur</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neuro-muted" />
                  <input id="admin-pin-settings" value={draft.adminPin} onChange={(event) => update("adminPin", event.target.value)} inputMode="numeric" className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-body text-white" />
                </div>
              </Card>

              <Card icon={<Palette className="h-5 w-5" />} title="Accent UI" description="Couleur de marque appliquée aux actions et états actifs.">
                <div className="grid grid-cols-5 gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button key={color.value} type="button" onClick={() => update("accentColor", color.value)} className={`grid min-h-14 place-items-center rounded-2xl border transition-all active:scale-95 ${draft.accentColor === color.value ? "border-white bg-white/10" : "border-white/10 bg-white/5"}`} aria-label={`Couleur ${color.label}`} aria-pressed={draft.accentColor === color.value}>
                      <span className={`h-7 w-7 rounded-full ${color.bg} shadow-lg`} />
                    </button>
                  ))}
                </div>
              </Card>

              <Card icon={<RotateCcw className="h-5 w-5" />} title="Preset premium" description="Revenir aux valeurs recommandées pour borne mobile-first.">
                <button type="button" onClick={() => setDraft(DEFAULT_SETTINGS)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-neuro-muted transition-all hover:text-white active:scale-[0.98]">
                  <Clock className="h-4 w-4" /> Restaurer le preset
                </button>
              </Card>
            </div>

            <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-neuro-bg/90 p-4 backdrop-blur-xl pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:static sm:p-5">
              <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
                <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-white/10 bg-white/5 text-body font-bold text-neuro-muted transition-all hover:text-white active:scale-[0.98]">Annuler</button>
                <button type="button" onClick={handleSave} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-neuro-accent text-body font-black text-white shadow-[0_0_28px_rgba(99,102,241,0.36)] transition-all hover:bg-indigo-500 active:scale-[0.98]">
                  <Check className="h-5 w-5" /> Sauvegarder
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
