import React, { useState } from "react";
import { Lock } from "lucide-react";

interface PinModalProps {
  /** The admin PIN to validate against */
  adminPin: string;
  /** Called when the correct PIN is entered */
  onUnlock: () => void;
  /** Called when the user cancels the modal */
  onCancel: () => void;
}

export default function PinModal({ adminPin, onUnlock, onCancel }: PinModalProps) {
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pinInput === adminPin) {
      onUnlock();
    } else {
      setError(true);
      setPinInput("");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-zinc-900/90 backdrop-blur-md p-6 rounded-xl border border-zinc-700 shadow-xl w-80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Accès administrateur
          </h2>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <label className="block text-sm mb-2 text-zinc-300">Entrez le code PIN</label>
        <input
          type="password"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          className="w-full px-3 py-2 rounded bg-zinc-800 text-white focus:outline-none"
        />
        {error && <p className="text-red-400 mt-2 text-sm">PIN incorrect</p>}
        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-zinc-400 hover:text-white"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
          >
            Déverrouiller
          </button>
        </div>
      </div>
    </div>
  );
}
