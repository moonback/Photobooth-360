import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { AppSettings } from "./SettingsModal";

interface SplashScreenProps {
  settings: AppSettings;
  /** Called to simply dismiss the splash and enter the app */
  onEnter: () => void;
  /** Called when admin PIN is validated — dismiss splash AND open settings */
  onAdmin: () => void;
}

export default function SplashScreen({ settings, onEnter, onAdmin }: SplashScreenProps) {
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);

  // Fade-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Auto-dismiss to main app after 8 seconds (not to settings)
  useEffect(() => {
    const timer = setTimeout(() => {
      onEnter();
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handlePinSubmit = () => {
    if (pinInput === settings.adminPin) {
      onAdmin(); // correct PIN → open settings
    } else {
      setError(true);
      setPinInput("");
    }
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => {
        // Tap anywhere on the backdrop (not on the pin panel) → enter app
        if (!showPin) onEnter();
      }}
    >
      {/* Animated glow background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Logo */}
      {settings.logoUrl && (
        <img
          src={settings.logoUrl}
          alt="Event logo"
          className="mb-8 max-h-40 object-contain rounded-2xl shadow-2xl"
        />
      )}

      {/* Event name */}
      <h1 className="text-5xl font-extrabold tracking-tight mb-3 drop-shadow-lg text-center px-8">
        {settings.eventName}
      </h1>
      <p className="text-zinc-400 text-lg mb-12">
        Appuyez pour commencer
      </p>

      {/* Admin button — stops event propagation so tap doesn't dismiss */}
      <button
        className="absolute bottom-8 right-6 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setShowPin(true);
        }}
      >
        <Lock className="w-3.5 h-3.5" />
        Admin
      </button>

      {/* PIN overlay */}
      {showPin && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900/95 border border-zinc-700 rounded-2xl p-6 w-72 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Accès administrateur</h2>
            </div>

            <label className="block text-xs text-zinc-400 mb-2">Code PIN</label>
            <input
              type="password"
              value={pinInput}
              autoFocus
              onChange={(e) => { setPinInput(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••"
            />
            {error && (
              <p className="text-red-400 text-xs mt-1.5">Code incorrect</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowPin(false); setPinInput(""); setError(false); }}
                className="flex-1 py-2.5 text-sm rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handlePinSubmit}
                className="flex-1 py-2.5 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Déverrouiller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
