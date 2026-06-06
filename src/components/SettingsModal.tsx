import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, Clock, Image, Lock, Mail, Mic, MicOff, Palette, RotateCcw, RotateCw, Type, Upload, Video, X, BarChart3, ChevronRight, RefreshCw, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { uploadLogo } from "../lib/uploadLogo";
import { SUPABASE_CONFIGURED } from "../lib/supabase";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import EmailListDashboard from "./EmailListDashboard";

export interface AppSettings {
  eventName: string;
  duration: number;
  facingMode: "user" | "environment";
  resolution: "720p" | "1080p" | "480p";
  countdownSeconds: number;
  accentColor: "indigo" | "rose" | "amber" | "emerald" | "cyan";
  recordAudio: boolean;
  adminPin: string;
  logoUrl?: string;
  emailCaptureEnabled: boolean;
  emailSendEnabled: boolean;
  // Motor control
  motorEnabled: boolean;
  motorSpeed: number;
  motorDirection: "CW" | "CCW";
  motorTurns: number;
  motorBackend: "serial" | "usb";
  /** Start motor automatically when recording starts */
  motorAutoStart: boolean;
  /**
   * Sync mode:
   *   'ack'   — wait for firmware READY/RUNNING response before recording
   *   'delay' — wait a fixed number of ms after MOTOR:START before recording
   *   'none'  — fire-and-forget, no wait (legacy behaviour)
   */
  motorSyncMode: "ack" | "delay" | "none";
  /** Fixed delay in ms used when motorSyncMode === 'delay' (default 500 ms) */
  motorSyncDelay: number;
  // Kiosk mode
  kioskEnabled: boolean;
  /** PIN to exit kiosk mode (defaults to adminPin if empty) */
  kioskExitPin: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  eventName: "NEUROBOOTH",
  duration: 15000,
  facingMode: "user",
  resolution: "720p",
  countdownSeconds: 3,
  accentColor: "indigo",
  recordAudio: false,
  adminPin: "1234",
  logoUrl: "",
  emailCaptureEnabled: true,
  emailSendEnabled: true,
  motorEnabled: false,
  motorSpeed: 50,
  motorDirection: "CW",
  motorTurns: 1,
  motorBackend: "serial",
  motorAutoStart: true,
  motorSyncMode: "ack",
  motorSyncDelay: 500,
  kioskEnabled: false,
  kioskExitPin: "",
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
  { value: "1080p", label: "1080p", sub: "FHD" },
];

function fmtDuration(ms: number) {
  return ms >= 60000 ? `${ms / 60000}min` : `${ms / 1000}s`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neuro-muted">
      {children}
    </p>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/8 text-neuro-accent">
          {icon}
        </div>
        <h3 className="text-[14px] font-bold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Segment<T extends string | number>({
  value, selected, label, sub, onClick,
}: {
  value: T; selected: boolean; label: string; sub?: string; onClick: (v: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`min-h-[2.75rem] rounded-xl border px-2 py-2 text-center transition-all active:scale-95 touch-manipulation ${
        selected
          ? "border-neuro-accent bg-neuro-accent/15 text-white shadow-[0_0_16px_rgba(99,102,241,0.25)]"
          : "border-white/10 bg-white/5 text-neuro-muted"
      }`}
      aria-pressed={selected}
    >
      <span className="block text-[13px] font-bold leading-none">{label}</span>
      {sub && <span className="mt-0.5 block text-[10px] opacity-60">{sub}</span>}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex min-h-[3rem] w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 text-left transition-all active:scale-[0.98] touch-manipulation"
      aria-pressed={checked}
    >
      <span className="text-[14px] font-semibold text-white">{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-neuro-accent" : "bg-zinc-700"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEmailList, setShowEmailList] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setLogoState("idle");
      setLogoError("");
    }
  }, [isOpen, settings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleLogo = async (file?: File) => {
    if (!file) return;
    setLogoState("uploading");
    setLogoError("");
    try {
      const result = await uploadLogo(file, () => undefined);
      if (!result) throw new Error("not configured");
      update("logoUrl", result.publicUrl);
      setLogoState("done");
    } catch {
      setLogoState("error");
      setLogoError("Import impossible. Vérifiez Supabase.");
    }
  };

  const handleSave = () => { onSave(draft); onClose(); };

  return (
    <>
      <AnimatePresence>
        {showAnalytics && (
          <Fragment key="analytics">
            <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
          </Fragment>
        )}
      </AnimatePresence>

      <EmailListDashboard
        isOpen={showEmailList}
        onClose={() => setShowEmailList(false)}
        eventId={draft.eventName || "default"}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end bg-black/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t border-white/10 bg-neuro-bg shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <header className="flex items-center justify-between px-5 py-3 shrink-0">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neuro-accent">Réglages</p>
                  <h2 className="text-[20px] font-black text-white leading-tight">Configuration borne</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-neuro-muted active:scale-90 touch-manipulation"
                  aria-label="Fermer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </header>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 space-y-3">

                {/* Identité */}
                <Card icon={<Type className="h-4 w-4" />} title="Identité">
                  <SectionLabel>Nom de l'événement</SectionLabel>
                  <input
                    value={draft.eventName}
                    onChange={(e) => update("eventName", e.target.value)}
                    className="mb-3 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-[14px] text-white placeholder:text-zinc-600"
                    placeholder="Nom de l'événement"
                  />
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {draft.logoUrl
                        ? <img src={draft.logoUrl} alt="Logo" className="h-full w-full object-contain p-1.5" />
                        : <Image className="h-6 w-6 text-neuro-muted" />}
                    </div>
                    <div className="flex-1">
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleLogo(e.target.files?.[0])} />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-bold text-black active:scale-[0.98] touch-manipulation"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {logoState === "uploading" ? "Import…" : "Logo"}
                      </button>
                      {!SUPABASE_CONFIGURED && (
                        <p className="mt-1.5 text-[11px] text-amber-300">Supabase non configuré.</p>
                      )}
                      {logoError && <p className="mt-1.5 text-[11px] text-red-400">{logoError}</p>}
                      {logoState === "done" && <p className="mt-1.5 text-[11px] text-emerald-400">✓ Logo mis à jour</p>}
                    </div>
                  </div>
                </Card>

                {/* Durée */}
                <Card icon={<Video className="h-4 w-4" />} title="Durée de capture">
                  <div className="grid grid-cols-5 gap-1.5">
                    {DURATIONS.map((d) => (
                      <Fragment key={d}>
                        <Segment value={d} selected={draft.duration === d} label={fmtDuration(d)} onClick={(v) => update("duration", v)} />
                      </Fragment>
                    ))}
                  </div>
                  <SectionLabel>Countdown</SectionLabel>
                  <div className="grid grid-cols-4 gap-1.5">
                    {COUNTDOWNS.map((c) => (
                      <Fragment key={c}>
                        <Segment value={c} selected={draft.countdownSeconds === c} label={c === 0 ? "Off" : `${c}s`} onClick={(v) => update("countdownSeconds", v)} />
                      </Fragment>
                    ))}
                  </div>
                </Card>

                {/* Caméra */}
                <Card icon={<Camera className="h-4 w-4" />} title="Caméra">
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    <Segment value="user" selected={draft.facingMode === "user"} label="Selfie" sub="Avant" onClick={(v) => update("facingMode", v)} />
                    <Segment value="environment" selected={draft.facingMode === "environment"} label="Arrière" sub="Kiosque" onClick={(v) => update("facingMode", v)} />
                  </div>
                  <SectionLabel>Résolution</SectionLabel>
                  <div className="grid grid-cols-3 gap-1.5">
                    {RESOLUTIONS.map((r) => (
                      <Fragment key={r.value}>
                        <Segment value={r.value} selected={draft.resolution === r.value} label={r.label} sub={r.sub} onClick={(v) => update("resolution", v)} />
                      </Fragment>
                    ))}
                  </div>
                </Card>

                {/* Audio & PIN — inline sur mobile */}
                <Card icon={draft.recordAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} title="Audio & Sécurité">
                  <Toggle checked={draft.recordAudio} onChange={() => update("recordAudio", !draft.recordAudio)} label="Enregistrer le micro" />
                  <SectionLabel>PIN administrateur</SectionLabel>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neuro-muted" />
                    <input
                      value={draft.adminPin}
                      onChange={(e) => update("adminPin", e.target.value)}
                      inputMode="numeric"
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-[14px] text-white"
                    />
                  </div>
                </Card>

                {/* Email marketing */}
                <Card icon={<Mail className="h-4 w-4" />} title="Email marketing">
                  <div className="space-y-2">
                    <Toggle
                      checked={draft.emailCaptureEnabled}
                      onChange={() => update("emailCaptureEnabled", !draft.emailCaptureEnabled)}
                      label="Collecter les emails"
                    />
                    <AnimatePresence>
                      {draft.emailCaptureEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <Toggle
                            checked={draft.emailSendEnabled}
                            onChange={() => update("emailSendEnabled", !draft.emailSendEnabled)}
                            label="Envoi automatique"
                          />
                          {draft.emailSendEnabled && (
                            <p className="mt-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[12px] text-indigo-300">
                              Nécessite la Supabase Edge Function <br /><span className="font-mono opacity-70">send-video-email</span> + clé Resend.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!draft.emailCaptureEnabled && (
                      <p className="text-[12px] text-neuro-muted">
                        Le bouton "Recevoir par email" sera masqué après la capture.
                      </p>
                    )}
                  </div>
                </Card>

                {/* Moteur */}
                <Card icon={<RefreshCw className="h-4 w-4" />} title="Plateau tournant">
                  <div className="space-y-2">
                    <Toggle
                      checked={draft.motorEnabled}
                      onChange={() => update("motorEnabled", !draft.motorEnabled)}
                      label="Activer le contrôle moteur"
                    />
                    <AnimatePresence>
                      {draft.motorEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 pt-1">
                            {/* Auto-start */}
                            <Toggle
                              checked={draft.motorAutoStart}
                              onChange={() => update("motorAutoStart", !draft.motorAutoStart)}
                              label="Démarrage auto à l'enregistrement"
                            />

                            {/* Backend */}
                            <div>
                              <SectionLabel>Interface</SectionLabel>
                              <div className="grid grid-cols-2 gap-1.5">
                                <Segment value="serial" selected={draft.motorBackend === "serial"} label="WebSerial" sub="USB-Série" onClick={(v) => update("motorBackend", v)} />
                                <Segment value="usb" selected={draft.motorBackend === "usb"} label="WebUSB" sub="USB direct" onClick={(v) => update("motorBackend", v)} />
                              </div>
                            </div>

                            {/* Speed */}
                            <div>
                              <SectionLabel>Vitesse par défaut — {draft.motorSpeed}%</SectionLabel>
                              <input
                                type="range"
                                min={5}
                                max={100}
                                step={5}
                                value={draft.motorSpeed}
                                onChange={(e) => update("motorSpeed", Number(e.target.value))}
                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500"
                                aria-label="Vitesse moteur par défaut"
                              />
                            </div>

                            {/* Direction */}
                            <div>
                              <SectionLabel>Direction par défaut</SectionLabel>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => update("motorDirection", "CW")}
                                  className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition-all touch-manipulation ${draft.motorDirection === "CW" ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}
                                  aria-pressed={draft.motorDirection === "CW"}
                                >
                                  <RotateCw className="h-4 w-4" /> Horaire
                                </button>
                                <button
                                  type="button"
                                  onClick={() => update("motorDirection", "CCW")}
                                  className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition-all touch-manipulation ${draft.motorDirection === "CCW" ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}
                                  aria-pressed={draft.motorDirection === "CCW"}
                                >
                                  <RotateCcw className="h-4 w-4" /> Anti-H.
                                </button>
                              </div>
                            </div>

                            {/* Turns */}
                            <div>
                              <SectionLabel>Tours par défaut</SectionLabel>
                              <div className="flex flex-wrap gap-1.5">
                                {[0, 1, 2, 3, 5, 10].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => update("motorTurns", n)}
                                    className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl border px-3 text-[13px] font-bold transition-all touch-manipulation ${draft.motorTurns === n ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}
                                    aria-pressed={draft.motorTurns === n}
                                  >
                                    {n === 0 ? "∞" : n}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Sync mode */}
                            <div>
                              <SectionLabel>Synchronisation déclenchement</SectionLabel>
                              <div className="space-y-1.5">
                                {(
                                  [
                                    { value: "ack",   label: "Attendre READY",  sub: "Firmware confirme la vitesse" },
                                    { value: "delay", label: "Délai fixe",       sub: `${draft.motorSyncDelay} ms après START` },
                                    { value: "none",  label: "Aucune",           sub: "Simultané (non-synchronisé)" },
                                  ] as { value: AppSettings["motorSyncMode"]; label: string; sub: string }[]
                                ).map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => update("motorSyncMode", opt.value)}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all touch-manipulation ${
                                      draft.motorSyncMode === opt.value
                                        ? "border-neuro-accent bg-neuro-accent/15 text-white"
                                        : "border-white/10 bg-white/5 text-neuro-muted"
                                    }`}
                                    aria-pressed={draft.motorSyncMode === opt.value}
                                  >
                                    <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${draft.motorSyncMode === opt.value ? "border-neuro-accent bg-neuro-accent" : "border-white/30"}`} />
                                    <span>
                                      <span className="block text-[13px] font-bold leading-none">{opt.label}</span>
                                      <span className="mt-0.5 block text-[11px] opacity-60">{opt.sub}</span>
                                    </span>
                                  </button>
                                ))}
                              </div>

                              {/* Delay input — shown only in delay mode */}
                              {draft.motorSyncMode === "delay" && (
                                <div className="mt-2">
                                  <SectionLabel>Délai (ms) — {draft.motorSyncDelay} ms</SectionLabel>
                                  <input
                                    type="range"
                                    min={100}
                                    max={3000}
                                    step={100}
                                    value={draft.motorSyncDelay}
                                    onChange={(e) => update("motorSyncDelay", Number(e.target.value))}
                                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500"
                                    aria-label="Délai de synchronisation moteur"
                                  />
                                  <div className="flex justify-between text-[10px] text-white/30 mt-1">
                                    <span>100 ms</span>
                                    <span>3 000 ms</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <p className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[12px] text-indigo-300">
                              WebSerial / WebUSB nécessite Chrome ou Edge sur desktop. Le panneau de contrôle apparaît sur l'écran de capture.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>

                {/* Kiosque */}
                <Card icon={<Smartphone className="h-4 w-4" />} title="Mode Kiosque">
                  <div className="space-y-2">
                    <Toggle
                      checked={draft.kioskEnabled}
                      onChange={() => update("kioskEnabled", !draft.kioskEnabled)}
                      label="Activer le mode kiosque"
                    />
                    <AnimatePresence>
                      {draft.kioskEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 pt-1">
                            <SectionLabel>PIN de sortie kiosque</SectionLabel>
                            <p className="text-[11px] text-white/40 -mt-1">
                              Laisser vide pour utiliser le PIN admin. Accès par 5 taps rapides sur la barre de statut.
                            </p>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neuro-muted" />
                              <input
                                value={draft.kioskExitPin}
                                onChange={(e) => update("kioskExitPin", e.target.value)}
                                inputMode="numeric"
                                placeholder={`PIN admin (${draft.adminPin || "vide"})`}
                                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-[14px] text-white placeholder:text-zinc-600"
                              />
                            </div>

                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5 space-y-1.5">
                              <p className="text-[12px] font-bold text-indigo-300">Ce que verrouille le mode kiosque</p>
                              <ul className="space-y-1 text-[11px] text-indigo-200/70">
                                <li>• Plein écran natif (Android Chrome / PWA)</li>
                                <li>• Écran toujours allumé (Wake Lock)</li>
                                <li>• Touche Retour et geste navigation bloqués</li>
                                <li>• Pull-to-refresh désactivé</li>
                                <li>• Menu contextuel supprimé</li>
                              </ul>
                              <p className="text-[11px] text-amber-300 pt-1">
                                iOS : installer l'app via "Sur l'écran d'accueil" pour le vrai plein écran.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>

                {/* Accent — compact row */}
                <Card icon={<Palette className="h-4 w-4" />} title="Couleur d'accent">
                  <div className="flex gap-3 justify-between">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => update("accentColor", c.value)}
                        className={`flex h-12 flex-1 items-center justify-center rounded-xl border transition-all active:scale-90 touch-manipulation ${
                          draft.accentColor === c.value ? "border-white bg-white/10" : "border-white/10 bg-white/5"
                        }`}
                        aria-label={c.label}
                        aria-pressed={draft.accentColor === c.value}
                      >
                        <span className={`h-5 w-5 rounded-full ${c.bg} shadow-md`} />
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Actions — Reset + Stats + Emails */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft(DEFAULT_SETTINGS)}
                    className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-[13px] font-bold text-neuro-muted active:scale-[0.97] touch-manipulation"
                  >
                    <RotateCcw className="h-4 w-4" /> Réinitialiser
                  </button>

                  {SUPABASE_CONFIGURED ? (
                    <button
                      type="button"
                      onClick={() => setShowAnalytics(true)}
                      className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-[13px] font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] active:scale-[0.97] touch-manipulation"
                    >
                      <BarChart3 className="h-4 w-4" /> Statistiques
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-[13px] font-bold text-neuro-muted/40 cursor-not-allowed"
                    >
                      <BarChart3 className="h-4 w-4" /> Stats (off)
                    </button>
                  )}

                  {/* Bouton emails sur toute la largeur */}
                  {SUPABASE_CONFIGURED ? (
                    <button
                      type="button"
                      onClick={() => setShowEmailList(true)}
                      className="col-span-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-[13px] font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-[0.97] touch-manipulation"
                    >
                      <Mail className="h-4 w-4" /> Emails collectés
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="col-span-2 flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-[13px] font-bold text-neuro-muted/40 cursor-not-allowed"
                    >
                      <Mail className="h-4 w-4" /> Emails (off)
                    </button>
                  )}
                </div>

              </div>

              {/* Footer sticky */}
              <footer className="shrink-0 border-t border-white/10 bg-neuro-bg px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-12 rounded-xl border border-white/10 bg-white/5 text-[14px] font-bold text-neuro-muted active:scale-[0.97] touch-manipulation"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-neuro-accent text-[14px] font-black text-white shadow-[0_0_24px_rgba(99,102,241,0.4)] active:scale-[0.97] touch-manipulation"
                  >
                    <Check className="h-4.5 w-4.5" /> Sauvegarder
                  </button>
                </div>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
