import React, { useState, useEffect, useRef } from "react";
import {
  X, Camera, Clock, Video, Type, Palette, Mic, MicOff,
  ChevronDown, RotateCcw, Check, Lock, Upload, Image,
} from "lucide-react";
import { uploadLogo } from "../lib/uploadLogo";
import { SUPABASE_CONFIGURED } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
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


// ─── Static data ──────────────────────────────────────────────────────────────
const ACCENT_COLORS: { value: AppSettings["accentColor"]; label: string; bg: string; ring: string }[] = [
  { value: "indigo",  label: "Indigo",   bg: "bg-indigo-500",  ring: "ring-indigo-400"  },
  { value: "rose",    label: "Rose",     bg: "bg-rose-500",    ring: "ring-rose-400"    },
  { value: "amber",   label: "Ambre",    bg: "bg-amber-500",   ring: "ring-amber-400"   },
  { value: "emerald", label: "Émeraude", bg: "bg-emerald-500", ring: "ring-emerald-400" },
  { value: "cyan",    label: "Cyan",     bg: "bg-cyan-500",    ring: "ring-cyan-400"    },
];

const ACCENT_STYLES: Record<AppSettings["accentColor"], { activeBg: string; activeBorder: string; activeText: string; glow: string }> = {
  indigo:  { activeBg: "bg-indigo-500/15",  activeBorder: "border-indigo-500",  activeText: "text-indigo-300",  glow: "shadow-[0_0_14px_rgba(99,102,241,0.45)]"  },
  rose:    { activeBg: "bg-rose-500/15",    activeBorder: "border-rose-500",    activeText: "text-rose-300",    glow: "shadow-[0_0_14px_rgba(244,63,94,0.45)]"    },
  amber:   { activeBg: "bg-amber-500/15",   activeBorder: "border-amber-500",   activeText: "text-amber-300",   glow: "shadow-[0_0_14px_rgba(245,158,11,0.45)]"   },
  emerald: { activeBg: "bg-emerald-500/15", activeBorder: "border-emerald-500", activeText: "text-emerald-300", glow: "shadow-[0_0_14px_rgba(16,185,129,0.45)]"   },
  cyan:    { activeBg: "bg-cyan-500/15",    activeBorder: "border-cyan-500",    activeText: "text-cyan-300",    glow: "shadow-[0_0_14px_rgba(6,182,212,0.45)]"    },
};

const ACCENT_SOLID: Record<AppSettings["accentColor"], string> = {
  indigo:  "bg-indigo-500 hover:bg-indigo-600",
  rose:    "bg-rose-500 hover:bg-rose-600",
  amber:   "bg-amber-500 hover:bg-amber-600",
  emerald: "bg-emerald-500 hover:bg-emerald-600",
  cyan:    "bg-cyan-500 hover:bg-cyan-600",
};

const DURATIONS   = [10000, 15000, 30000, 60000, 120000];
const COUNTDOWNS  = [0, 3, 5, 10];
const RESOLUTIONS: { value: AppSettings["resolution"]; label: string; sub: string }[] = [
  { value: "480p",  label: "480p",  sub: "SD · 854×480"   },
  { value: "720p",  label: "720p",  sub: "HD · 1280×720"  },
  { value: "1080p", label: "1080p", sub: "FHD · 1920×1080" },
];

function fmtDuration(ms: number) {
  return ms >= 60000 ? `${ms / 60000}min` : `${ms / 1000}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Collapsible section used throughout the sheet */
function Section({
  icon, label, children, defaultOpen = true,
}: { icon: React.ReactNode; label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 px-5 text-left"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-zinc-300">
          <span className="text-zinc-500">{icon}</span>
          {label}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

/** Pill button used for durations / countdowns */
function PillButton({
  active,
  accent,
  onClick,
  children,
}: { active: boolean; accent: AppSettings["accentColor"]; onClick: () => void; children: React.ReactNode; key?: React.Key }) {
  const s = ACCENT_STYLES[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 border ${
        active
          ? `${s.activeBg} ${s.activeBorder} ${s.activeText} ${s.glow}`
          : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

type LogoUploadState = 'idle' | 'uploading' | 'done' | 'error';

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [local, setLocal]         = useState<AppSettings>(settings);
  const [visible, setVisible]     = useState(false);
  const [logoUpload, setLogoUpload] = useState<LogoUploadState>('idle');
  const [logoProgress, setLogoProgress] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!SUPABASE_CONFIGURED) {
      // No cloud — use object URL as local preview
      const url = URL.createObjectURL(file);
      setLocal((l) => ({ ...l, logoUrl: url }));
      return;
    }
    setLogoUpload('uploading');
    setLogoProgress(0);
    try {
      const result = await uploadLogo(file, setLogoProgress);
      if (result) {
        setLocal((l) => ({ ...l, logoUrl: result.publicUrl }));
        setLogoUpload('done');
      } else {
        setLogoUpload('error');
      }
    } catch {
      setLogoUpload('error');
    }
  };

  // Sync local copy every time the sheet opens + trigger enter animation
  useEffect(() => {
    if (isOpen) {
      setLocal(settings);
      // Small delay so the translate transition plays after mount
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const a = ACCENT_STYLES[local.accentColor];

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const handleClose = () => {
    setVisible(false);
    // Wait for slide-down animation before unmounting
    setTimeout(onClose, 250);
  };

  return (
    // Backdrop
    <div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      {/* Bottom sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-zinc-950 rounded-t-[2rem] flex flex-col
                    shadow-[0_-8px_40px_rgba(0,0,0,0.6)] border-t border-zinc-800
                    transition-transform duration-300 ease-out max-h-[92dvh]
                    ${visible ? "translate-y-0" : "translate-y-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2 flex-shrink-0">
          <h2 className="text-base font-bold text-white tracking-tight">Réglages</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white active:scale-90 transition-all"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">

          {/* ── Event name ────────────────────────────────────────── */}
          <Section icon={<Type className="w-4 h-4" />} label="Nom de l'événement">
            <input
              type="text"
              value={local.eventName}
              onChange={(e) => setLocal({ ...local, eventName: e.target.value })}
              maxLength={40}
              placeholder="Affiché en filigrane sur la vidéo…"
              className={`w-full px-4 py-3.5 rounded-2xl bg-zinc-900 border text-white placeholder-zinc-600
                          focus:outline-none transition-colors text-sm
                          ${local.eventName ? `${a.activeBorder} focus:border-current` : "border-zinc-800 focus:border-zinc-600"}`}
            />
          </Section>

          {/* ── Durée ─────────────────────────────────────────────── */}
          <Section icon={<Clock className="w-4 h-4" />} label="Durée d'enregistrement">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((v) => (
                <PillButton
                  key={v} active={local.duration === v}
                  accent={local.accentColor}
                  onClick={() => setLocal({ ...local, duration: v })}
                >
                  {fmtDuration(v)}
                </PillButton>
              ))}
            </div>
          </Section>

          {/* ── Countdown ─────────────────────────────────────────── */}
          <Section icon={<Clock className="w-4 h-4" />} label="Compte à rebours" defaultOpen={false}>
            <div className="flex flex-wrap gap-2">
              {COUNTDOWNS.map((v) => (
                <PillButton
                  key={v} active={local.countdownSeconds === v}
                  accent={local.accentColor}
                  onClick={() => setLocal({ ...local, countdownSeconds: v })}
                >
                  {v === 0 ? "Aucun" : `${v}s`}
                </PillButton>
              ))}
            </div>
          </Section>

          {/* ── Caméra ────────────────────────────────────────────── */}
          <Section icon={<Camera className="w-4 h-4" />} label="Caméra" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-2">
              {(["user", "environment"] as const).map((mode) => {
                const active = local.facingMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLocal({ ...local, facingMode: mode })}
                    className={`flex flex-col items-center gap-2 py-4 rounded-2xl border text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? `${a.activeBg} ${a.activeBorder} ${a.activeText}`
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <span className="text-2xl">{mode === "user" ? "🤳" : "📷"}</span>
                    <span>{mode === "user" ? "Frontale" : "Arrière"}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Audio ─────────────────────────────────────────────── */}
          <Section icon={local.recordAudio ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />} label="Microphone" defaultOpen={false}>
            <button
              type="button"
              onClick={() => setLocal({ ...local, recordAudio: !local.recordAudio })}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
                local.recordAudio
                  ? `${a.activeBg} ${a.activeBorder}`
                  : "bg-zinc-900 border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-3">
                {local.recordAudio
                  ? <Mic className={`w-5 h-5 ${a.activeText}`} />
                  : <MicOff className="w-5 h-5 text-zinc-600" />
                }
                <div className="text-left">
                  <p className={`text-sm font-medium ${local.recordAudio ? "text-white" : "text-zinc-400"}`}>
                    {local.recordAudio ? "Son activé" : "Son désactivé"}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {local.recordAudio
                      ? "Micro actif pendant l'enregistrement"
                      : "Recommandé en environnement bruyant"}
                  </p>
                </div>
              </div>
              {/* Toggle pill */}
              <div className={`relative w-12 h-6.5 h-7 rounded-full flex-shrink-0 transition-colors duration-200 ${
                local.recordAudio ? ACCENT_SOLID[local.accentColor].split(" ")[0] : "bg-zinc-700"
              }`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  local.recordAudio ? "translate-x-6" : "translate-x-1"
                }`} />
              </div>
            </button>
          </Section>

          {/* ── Résolution ────────────────────────────────────────── */}
          <Section icon={<Video className="w-4 h-4" />} label="Résolution" defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {RESOLUTIONS.map(({ value, label, sub }) => {
                const active = local.resolution === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLocal({ ...local, resolution: value })}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border text-sm transition-all active:scale-[0.98] ${
                      active
                        ? `${a.activeBg} ${a.activeBorder}`
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <span className={`font-semibold ${active ? a.activeText : ""}`}>{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{sub}</span>
                      {active && <Check className={`w-4 h-4 ${a.activeText}`} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Section icon={<Image className="w-4 h-4" />} label="Logo de l'écran d'accueil" defaultOpen={false}>
            {/* Preview */}
            {local.logoUrl && (
              <img
                src={local.logoUrl}
                alt="Logo preview"
                className="mb-3 h-16 rounded-xl object-contain bg-zinc-900 w-full"
              />
            )}

            {/* Upload button */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFile}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUpload === 'uploading'}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all active:scale-[0.98] ${
                logoUpload === 'uploading'
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-500 cursor-not-allowed'
                  : `bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600`
              }`}
            >
              <Upload className="w-4 h-4" />
              {logoUpload === 'uploading'
                ? `Envoi… ${logoProgress}%`
                : logoUpload === 'done'
                ? 'Logo envoyé ✓'
                : 'Choisir un fichier'}
            </button>

            {logoUpload === 'error' && (
              <p className="mt-2 text-xs text-red-400">Échec de l'envoi. Vérifiez la connexion.</p>
            )}

            {/* Manual URL fallback */}
            <input
              type="text"
              value={local.logoUrl ?? ""}
              onChange={(e) => setLocal({ ...local, logoUrl: e.target.value })}
              placeholder="Ou collez une URL d'image…"
              className={`mt-2 w-full px-4 py-3 rounded-2xl bg-zinc-900 border text-white placeholder-zinc-600
                          focus:outline-none transition-colors text-sm
                          ${local.logoUrl ? `${a.activeBorder} focus:border-current` : "border-zinc-800 focus:border-zinc-600"}`}
            />
          </Section>

          {/* ── Admin PIN (hidden) ──────────────────────────────────────── */}
          <Section icon={<Lock className="w-4 h-4" />} label="Code PIN admin" defaultOpen={false}>
            <input
              type="password"
              value={local.adminPin}
              onChange={(e) => setLocal({ ...local, adminPin: e.target.value })}
              placeholder="1234"
              className={`w-full px-4 py-3.5 rounded-2xl bg-zinc-900 border text-white placeholder-zinc-600
                          focus:outline-none transition-colors text-sm
                          ${local.adminPin ? `${a.activeBorder} focus:border-current` : "border-zinc-800 focus:border-zinc-600"}`}
            />
          </Section>

          {/* ── Couleur d'accent ──────────────────────────────────── */}
          <Section icon={<Palette className="w-4 h-4" />} label="Couleur d'accentuation" defaultOpen={false}>
            <div className="flex justify-between px-2">
              {ACCENT_COLORS.map(({ value, label, bg, ring }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLocal({ ...local, accentColor: value })}
                  title={label}
                  className={`relative w-10 h-10 rounded-full ${bg} transition-all active:scale-90 ${
                    local.accentColor === value
                      ? `ring-2 ring-offset-2 ring-offset-zinc-950 ${ring} scale-110`
                      : "opacity-40 hover:opacity-80"
                  }`}
                >
                  {local.accentColor === value && (
                    <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* Bottom spacing for safe area */}
          <div className="h-4" />
        </div>

        {/* Footer — sticky */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-t border-zinc-800/60 pb-safe-bottom">
          <button
            type="button"
            onClick={() => setLocal(DEFAULT_SETTINGS)}
            className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all"
            title="Réinitialiser"
            aria-label="Réinitialiser les réglages"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium active:scale-95 transition-all"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold active:scale-95 transition-all ${ACCENT_SOLID[local.accentColor]} ${a.glow}`}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
