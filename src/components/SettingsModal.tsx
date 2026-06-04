import { useState } from "react";
import { X, Settings, Camera, Clock, Video, Type, Palette } from "lucide-react";

export interface AppSettings {
  eventName: string;
  duration: number;
  facingMode: "user" | "environment";
  resolution: "720p" | "1080p" | "480p";
  countdownSeconds: number;
  accentColor: "indigo" | "rose" | "amber" | "emerald" | "cyan";
}

export const DEFAULT_SETTINGS: AppSettings = {
  eventName: "ÉVÉNEMENT 2026",
  duration: 15000,
  facingMode: "user",
  resolution: "720p",
  countdownSeconds: 3,
  accentColor: "indigo",
};

const ACCENT_COLORS: { value: AppSettings["accentColor"]; label: string; class: string }[] = [
  { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
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

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const handleReset = () => {
    setLocal(DEFAULT_SETTINGS);
  };

  // Sync local state when modal reopens
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Réglages</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
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
              maxLength={40}
              placeholder="Nom affiché sur la vidéo..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    local.duration === value
                      ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700"
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    local.countdownSeconds === value
                      ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700"
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
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                  local.facingMode === "user"
                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                🤳 Frontale
              </button>
              <button
                onClick={() => setLocal({ ...local, facingMode: "environment" })}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                  local.facingMode === "environment"
                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                📷 Arrière
              </button>
            </div>
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
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    local.resolution === value
                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white"
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
                  className={`w-9 h-9 rounded-full ${cls} transition-all ${
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
        <div className="flex items-center justify-between px-6 py-5 border-t border-zinc-800 bg-zinc-900/80">
          <button
            onClick={handleReset}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            Réinitialiser
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
