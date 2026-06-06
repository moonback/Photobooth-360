/**
 * MotorControlPanel
 *
 * Floating panel to control the 360° turntable motor via WebSerial / WebUSB.
 * Shows connection state, speed / direction / turns controls, and start/stop/reset.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  RefreshCw,
  RotateCcw,
  RotateCw,
  Square,
  Unplug,
  Usb,
  Zap,
  ZapOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useMotor, type MotorBackend, type MotorDirection } from "../hooks/useMotor";
import type { AppSettings } from "./SettingsModal";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MotorControlPanelProps {
  /** Motor defaults pulled from app settings */
  settings: AppSettings;
  /** Whether the panel is visible */
  visible: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectionBadge({ state }: { state: string }) {
  const map: Record<string, { color: string; label: string }> = {
    disconnected: { color: "bg-zinc-500", label: "Déconnecté" },
    connecting:   { color: "bg-amber-400 animate-pulse", label: "Connexion…" },
    connected:    { color: "bg-emerald-400", label: "Connecté" },
    error:        { color: "bg-red-500", label: "Erreur" },
  };
  const { color, label } = map[state] ?? map.disconnected;

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-white/70">{label}</span>
    </span>
  );
}

function SpeedSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Vitesse</span>
        <span className="text-[13px] font-black text-white">{value}%</span>
      </div>
      <input
        type="range"
        min={5}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="motor-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500"
        aria-label="Vitesse moteur"
      />
      <div className="flex justify-between text-[10px] text-white/30">
        <span>Lent</span>
        <span>Rapide</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MotorControlPanel({ settings, visible }: MotorControlPanelProps) {
  const motor = useMotor();

  // Local config state (driven by settings defaults, user-adjustable)
  const [speed, setSpeed]         = useState(settings.motorSpeed ?? 50);
  const [direction, setDirection] = useState<MotorDirection>(settings.motorDirection ?? "CW");
  const [turns, setTurns]         = useState(settings.motorTurns ?? 1);
  const [backend, setBackend]     = useState<MotorBackend>(settings.motorBackend ?? "serial");
  const [collapsed, setCollapsed] = useState(false);

  const isConnected = motor.connectionState === "connected";

  const handleConnect = async () => {
    try {
      await motor.connect(backend);
    } catch {
      // error state already set inside hook
    }
  };

  const handleStart = async () => {
    if (!isConnected) return;
    await motor.startMotor({ speed, direction, turns, baudRate: 115200, backend });
  };

  const handleStop = async () => {
    if (!isConnected) return;
    await motor.stopMotor();
  };

  const handleReset = async () => {
    if (!isConnected) return;
    await motor.resetMotor();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-auto absolute right-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 w-[min(88vw,22rem)] overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-2xl sm:right-5"
          initial={{ x: 24, opacity: 0, scale: 0.96 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 24, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="region"
          aria-label="Contrôle moteur"
        >
          {/* Header */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left active:bg-white/5 touch-manipulation"
            aria-expanded={!collapsed}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-black text-white leading-none">Plateau tournant</p>
              <div className="mt-0.5">
                <ConnectionBadge state={motor.connectionState} />
              </div>
            </div>
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronUp className="h-4 w-4 text-white/40" />
            )}
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 px-4 pb-4">

                  {/* Error banner */}
                  {motor.error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="break-words">{motor.error}</span>
                    </div>
                  )}

                  {/* Backend selector + Connect / Disconnect */}
                  <div className="flex gap-2">
                    {/* Backend toggle — Serial only for ESP32, USB kept for future */}
                    {!isConnected && (
                      <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                        {(["serial", "usb"] as MotorBackend[]).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBackend(b)}
                            className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12px] font-bold transition-all touch-manipulation ${
                              backend === b
                                ? "bg-indigo-500 text-white shadow"
                                : "text-white/40 hover:text-white/70"
                            }`}
                            aria-pressed={backend === b}
                          >
                            {b === "serial" ? (
                              <Unplug className="h-3.5 w-3.5" />
                            ) : (
                              <Usb className="h-3.5 w-3.5" />
                            )}
                            {b === "serial" ? "USB-Serial" : "WebUSB"}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Connect / Disconnect button */}
                    <motion.button
                      type="button"
                      onClick={isConnected ? motor.disconnect : handleConnect}
                      disabled={motor.connectionState === "connecting"}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-[13px] font-black transition-all active:scale-[0.97] touch-manipulation ${
                        isConnected
                          ? "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25"
                          : motor.connectionState === "connecting"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 cursor-wait"
                          : "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:brightness-110"
                      } ${!isConnected ? "flex-1" : ""}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      aria-label={isConnected ? "Déconnecter le moteur" : "Connecter le moteur"}
                    >
                      {isConnected ? (
                        <><ZapOff className="h-4 w-4" /> Déco</>
                      ) : motor.connectionState === "connecting" ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> …</>
                      ) : (
                        <><Zap className="h-4 w-4" /> Connecter</>
                      )}
                    </motion.button>
                  </div>

                  {/* Controls — only when connected */}
                  <AnimatePresence>
                    {isConnected && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {/* Speed */}
                        <SpeedSlider value={speed} onChange={setSpeed} />

                        {/* Direction */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Direction</span>
                          <div className="grid grid-cols-2 gap-2">
                            {(["CW", "CCW"] as MotorDirection[]).map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDirection(d)}
                                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition-all active:scale-[0.97] touch-manipulation ${
                                  direction === d
                                    ? "border-indigo-500 bg-indigo-500/15 text-white shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                                    : "border-white/10 bg-white/5 text-white/50"
                                }`}
                                aria-pressed={direction === d}
                                aria-label={d === "CW" ? "Sens horaire" : "Sens antihoraire"}
                              >
                                {d === "CW" ? (
                                  <RotateCw className="h-4 w-4" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                                {d === "CW" ? "Horaire" : "Anti-H."}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Turns */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Tours</span>
                            <span className="text-[13px] font-black text-white">
                              {turns === 0 ? "∞ continu" : `${turns} tour${turns > 1 ? "s" : ""}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTurns((t) => Math.max(0, t - 1))}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[18px] font-black text-white active:scale-95 touch-manipulation"
                              aria-label="Réduire le nombre de tours"
                            >
                              −
                            </button>
                            <div className="flex-1 text-center">
                              <div className="flex justify-center gap-1 flex-wrap">
                                {[0, 1, 2, 3, 5, 10].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => setTurns(n)}
                                    className={`h-8 min-w-[2.25rem] rounded-lg border px-2 text-[12px] font-bold transition-all active:scale-95 touch-manipulation ${
                                      turns === n
                                        ? "border-indigo-500 bg-indigo-500/20 text-white"
                                        : "border-white/10 bg-white/5 text-white/40"
                                    }`}
                                  >
                                    {n === 0 ? "∞" : n}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setTurns((t) => Math.min(99, t + 1))}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[18px] font-black text-white active:scale-95 touch-manipulation"
                              aria-label="Augmenter le nombre de tours"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Start */}
                          <motion.button
                            type="button"
                            onClick={motor.isRunning ? handleStop : handleStart}
                            className={`col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl text-[14px] font-black transition-all active:scale-[0.97] touch-manipulation ${
                              motor.isRunning
                                ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            aria-label={motor.isRunning ? "Arrêter le moteur" : "Démarrer le moteur"}
                          >
                            {motor.isRunning ? (
                              <><Square className="h-5 w-5 fill-white" /> Arrêter</>
                            ) : (
                              <><RefreshCw className="h-5 w-5" /> Démarrer</>
                            )}
                          </motion.button>

                          {/* Reset */}
                          <motion.button
                            type="button"
                            onClick={handleReset}
                            className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-all hover:text-white active:scale-[0.97] touch-manipulation"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            aria-label="Réinitialiser la position"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </motion.button>
                        </div>

                        {/* Status */}
                        {motor.lastStatus && (
                          <p className="truncate rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center font-mono text-[11px] text-white/40">
                            {motor.lastStatus}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Not supported warning */}
                  {!motor.isSupported && (
                    <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-300">
                      WebSerial / WebUSB non disponible. Utilisez Chrome ou Edge sur desktop.
                    </p>
                  )}

                  {/* ESP32 info — shown when disconnected and supported */}
                  {motor.isSupported && !isConnected && (
                    <p className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-white/35 leading-relaxed">
                      ESP32 via USB · <span className="font-mono">115200 baud</span><br />
                      Sélectionner <span className="font-mono">CP2102</span> ou <span className="font-mono">CH340</span> dans le dialog
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
