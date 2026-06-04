import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { AppSettings } from "./SettingsModal"; // Adjusted import path

interface SplashScreenProps {
  settings: AppSettings;
  onUnlock: () => void; // called when admin PIN is correct
}

export default function SplashScreen({ settings, onUnlock }: SplashScreenProps) {
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pinInput === settings.adminPin) {
      onUnlock();
    } else {
      setError(true);
      setPinInput("");
    }
  };

  // Automatic transition after 5 seconds (optional, can be removed)
  useEffect(() => {
    const timer = setTimeout(() => {
      onUnlock();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950/70 backdrop-blur-sm text-white relative">
      {settings.logoUrl && (
        <img src={settings.logoUrl} alt="Event logo" className="mb-4 max-h-48 rounded-lg shadow-lg" />
      )}
      <h1 className="text-5xl font-extrabold mb-2 drop-shadow-md">{settings.eventName}</h1>
      <p className="text-xl text-zinc-300">Welcome!</p>

      {/* Admin entry button */}
      <button
        className="absolute top-4 right-4 text-sm underline hover:text-indigo-400 transition-colors"
        onClick={() => setShowPin(true)}
      >
        Admin
      </button>

      {showPin && (
        <div className="mt-6 bg-zinc-800/80 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-zinc-700">
          <label className="block text-sm mb-2">Enter PIN:</label>
          <input
            type="password"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            className="px-3 py-2 rounded bg-zinc-700 text-white w-32 focus:outline-none"
          />
          <button
            className="ml-2 px-4 py-1 bg-indigo-600 rounded hover:bg-indigo-500 transition-colors"
            onClick={handleSubmit}
          >
            Unlock
          </button>
          {error && <p className="text-red-400 mt-2">Incorrect PIN</p>}
        </div>
      )}
    </div>
  );
}
