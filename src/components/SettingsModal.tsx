import { useEffect, useState, type MouseEvent } from "react";
import { X, Settings, Camera, Clock, Video, Type, Palette, Mic, MicOff } from "lucide-react";

export interface AppSettings {
  eventName: string;
  duration: number;
  facingMode: "user" | "environment";
  resolution: "720p" | "1080p" | "480p";
  countdownSeconds: number;
  accentColor: "indigo" | "rose" | "amber" | "emerald" | "cyan";
  recordAudio: boolean;
}

// Accent classes for pill selection buttons — mirrors ACCENT map in App.tsx
const PILL_ACCENT: Record<AppSettings["accentColor"], {
  activeBg: string;
  activeShadow: string;
  activeBorder: string;
  activeText: string;
  activeLightBg: string;
  focusBorderColor: string;
  focusGlowColor: string;
}> = {
  // "indigo" maps to electric violet (#8B5CF6) — Requirements: 1.3, 14.2, 14.5
  indigo: {
    activeBg: "bg-violet-500",
    activeShadow: "shadow-[0_0_12px_rgba(139,92,246,0.4)]",
    activeBorder: "border-violet-500",
    activeText: "text-violet-300",
    activeLightBg: "bg-violet-500/10",
    focusBorderColor: "#8B5CF6",
    focusGlowColor: "rgba(139,92,246,0.3)",
  },
  rose: {
    activeBg: "bg-rose-500",
    activeShadow: "shadow-[0_0_12px_rgba(244,63,94,0.4)]",
    activeBorder: "border-rose-500",
    activeText: "text-rose-300",
    activeLightBg: "bg-rose-500/10",
    focusBorderColor: "#F43F5E",
    focusGlowColor: "rgba(244,63,94,0.3)",
  },
  amber: {
    activeBg: "bg-amber-500",
    activeShadow: "shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    activeBorder: "border-amber-500",
    activeText: "text-amber-300",
    activeLightBg: "bg-amber-500/10",
    focusBorderColor: "#F59E0B",
    focusGlowColor: "rgba(245,158,11,0.3)",
  },
  emerald: {
    activeBg: "bg-emerald-500",
    activeShadow: "shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    activeBorder: "border-emerald-500",
    activeText: "text-emerald-300",
    activeLightBg: "bg-emerald-500/10",
    focusBorderColor: "#10B981",
    focusGlowColor: "rgba(16,185,129,0.3)",
  },
  // "cyan" stays as neon blue (#06B6D4) — Requirements: 1.3, 14.2, 14.5
  cyan: {
    activeBg: "bg-cyan-500",
    activeShadow: "shadow-[0_0_12px_rgba(6,182,212,0.4)]",
    activeBorder: "border-cyan-500",
    activeText: "text-cyan-300",
    activeLightBg: "bg-cyan-500/10",
    focusBorderColor: "#06B6D4",
    focusGlowColor: "rgba(6,182,212,0.3)",
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  eventName: "ÉVÉNEMENT 2026",
  duration: 15000,
  facingMode: "user",
  resolution: "720p",
  countdownSeconds: 3,
  accentColor: "indigo",
  recordAudio: false, // silent by default — avoids ambient noise at events
};

const ACCENT_COLORS: { value: AppSettings["accentColor"]; label: string; class: string }[] = [
  { value: "indigo", label: "Violet", class: "bg-violet-500" },
  { value: "rose", label: "Rose", class: "bg-rose-500" },
  { value: "amber", label: "Ambre", class: "bg-amber-500" },
  { value: "emerald", label: "Émeraude", class: "bg-emerald-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
];

const RESOLUTIONS: { value: AppSettings["resolution"]; label: string; width: number; height: number }[] = [
  { value: "480p", label: "480p (SD)", width: 854, height: 480 },
  { value: "720p", label: "720p (HD)", width: 1280, height: 720 },
  { value: "1080p", label: "1080p (Full HD)", width: 1920, height: 1080 },
];

const DURATIONS = [
  { value: 10000, label: "10s" },
  { value: 15000, label: "15s" },
  { value: 30000, label: "30s" },
  { value: 60000, label: "60s" },
  { value: 120000, label: "2min" },
];

const COUNTDOWNS = [
  { value: 0, label: "Aucun" },
  { value: 3, label: "3s" },
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [local, setLocal] = useState<AppSettings>(settings);
  const [eventNameFocused, setEventNameFocused] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Derive accent classes from the currently selected (local) accent color
  const pillAccent = PILL_ACCENT[local.accentColor];

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const handleReset = () => {
    setLocal(DEFAULT_SETTINGS);
  };

  // Sync local state when modal reopens
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center glass-backdrop px-4 py-6"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg glass-strong rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/50 glass">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl ${pillAccent.activeLightBg}`}>
              <Settings className={`w-5 h-5 ${pillAccent.activeText}`} />
            </div>
            <h2 className="text-lg font-semibold text-white">Réglages</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-zinc-300 hover:text-white hover:bg-zinc-800 premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98]" aria-label="Fermer les réglages"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-7 overflow-y-auto max-h-[65vh]">

          {/* Event Name */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Type className="w-4 h-4 text-zinc-500" />
              Nom de l'événement (filigrane)
            </label>
            <input
              type="text"
              value={local.eventName}
              onChange={(e) => setLocal({ ...local, eventName: e.target.value })}
              onFocus={() => setEventNameFocused(true)}
              onBlur={() => setEventNameFocused(false)}
              maxLength={40}
              placeholder="Nom affiché sur la vidéo..."
              className="w-full px-4 py-3 rounded-2xl bg-zinc-800 border text-white placeholder-zinc-500 focus:outline-none focus:ring-1 premium-interactive text-sm premium-touch"
              style={{
                borderColor: eventNameFocused ? pillAccent.focusBorderColor : "rgb(63,63,70)",
                boxShadow: eventNameFocused
                  ? `0 0 0 1px ${pillAccent.focusBorderColor}, 0 0 8px ${pillAccent.focusGlowColor}`
                  : undefined,
              }}
            />
          </section>

          {/* Duration */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Clock className="w-4 h-4 text-zinc-500" />
              Durée d'enregistrement
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLocal({ ...local, duration: value })}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98] ${
                    local.duration === value
                      ? `${pillAccent.activeBg} text-white ${pillAccent.activeShadow}`
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Countdown */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Clock className="w-4 h-4 text-zinc-500" />
              Compte à rebours avant enregistrement
            </label>
            <div className="flex flex-wrap gap-2">
              {COUNTDOWNS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLocal({ ...local, countdownSeconds: value })}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98] ${
                    local.countdownSeconds === value
                      ? `${pillAccent.activeBg} text-white ${pillAccent.activeShadow}`
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Camera */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Camera className="w-4 h-4 text-zinc-500" />
              Caméra par défaut
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLocal({ ...local, facingMode: "user" })}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98] border ${
                  local.facingMode === "user"
                    ? `${pillAccent.activeLightBg} ${pillAccent.activeBorder} ${pillAccent.activeText} ${pillAccent.activeShadow}`
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                🤳 Frontale
              </button>
              <button
                onClick={() => setLocal({ ...local, facingMode: "environment" })}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98] border ${
                  local.facingMode === "environment"
                    ? `${pillAccent.activeLightBg} ${pillAccent.activeBorder} ${pillAccent.activeText} ${pillAccent.activeShadow}`
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                📷 Arrière
              </button>
            </div>
          </section>

          {/* Audio */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              {local.recordAudio ? (
                <Mic className="w-4 h-4 text-zinc-500" />
              ) : (
                <MicOff className="w-4 h-4 text-zinc-500" />
              )}
              Son de la vidéo
            </label>
            <button
              onClick={() => setLocal({ ...local, recordAudio: !local.recordAudio })}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98] ${
                local.recordAudio
                  ? `${pillAccent.activeLightBg} ${pillAccent.activeBorder} ${pillAccent.activeShadow}`
                  : "bg-zinc-800 border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                {local.recordAudio ? (
                  <Mic className={`w-5 h-5 ${pillAccent.activeText}`} />
                ) : (
                  <MicOff className="w-5 h-5 text-zinc-500" />
                )}
                <div className="text-left">
                  <div className={`text-sm font-medium ${local.recordAudio ? "text-white" : "text-zinc-400"}`}>
                    {local.recordAudio ? "Son activé" : "Son désactivé"}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {local.recordAudio
                      ? "Le micro sera actif pendant l'enregistrement"
                      : "Recommandé pour les événements bruyants"}
                  </div>
                </div>
              </div>
              {/* Toggle pill */}
              <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                local.recordAudio ? pillAccent.activeBg : "bg-zinc-700"
              }`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  local.recordAudio ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </div>
            </button>
          </section>

          {/* Resolution */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Video className="w-4 h-4 text-zinc-500" />
              Résolution vidéo
            </label>
            <div className="flex flex-col gap-2">
              {RESOLUTIONS.map(({ value, label, width, height }) => (
                <button
                  key={value}
                  onClick={() => setLocal({ ...local, resolution: value })}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98] border ${
                    local.resolution === value
                      ? `${pillAccent.activeLightBg} ${pillAccent.activeBorder} ${pillAccent.activeText} ${pillAccent.activeShadow}`
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-xs text-zinc-500">{width}×{height}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Accent Color */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Palette className="w-4 h-4 text-zinc-500" />
              Couleur d'accentuation
            </label>
            <div className="flex gap-3">
              {ACCENT_COLORS.map(({ value, label, class: cls }) => (
                <button
                  key={value}
                  onClick={() => setLocal({ ...local, accentColor: value })}
                  title={label}
                  className={`w-11 h-11 rounded-full ${cls} premium-interactive premium-touch ${
                    local.accentColor === value
                      ? "ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110"
                      : "opacity-50 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-zinc-800/50 glass">
          <button
            onClick={handleReset}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            Réinitialiser
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98]"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-2xl ${pillAccent.activeBg} text-white text-sm font-semibold premium-interactive premium-touch hover:scale-[1.02] active:scale-[0.98] ${pillAccent.activeShadow}`}
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
