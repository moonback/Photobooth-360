import { useEffect, useState } from "react";
import { Camera, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface CameraInfo {
  deviceId: string;
  label: string;
  kind: string;
}

export default function CameraDiagnostic() {
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [error, setError] = useState<string>("");
  const [currentCamera, setCurrentCamera] = useState<any>(null);

  useEffect(() => {
    const checkCameras = async () => {
      try {
        // First, request permission by getting a stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Now enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Caméra ${device.deviceId.substring(0, 8)}`,
            kind: device.kind
          }));
        
        setCameras(videoDevices);
        
        // Get current stream info
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings();
        const capabilities = videoTrack?.getCapabilities?.();
        
        setCurrentCamera({
          label: videoTrack?.label,
          settings: settings,
          capabilities: capabilities,
        });
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    checkCameras();
  }, []);

  return (
    <motion.div
      className="fixed inset-4 z-[200] overflow-y-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="glass-panel mx-auto max-w-lg rounded-2xl p-6 text-white">
        <div className="mb-4 flex items-center gap-3">
          <Camera className="h-6 w-6 text-indigo-400" />
          <h2 className="text-lg font-bold">Diagnostic Caméra</h2>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-bold text-indigo-300">Caméras disponibles ({cameras.length})</h3>
            {cameras.length === 0 ? (
              <p className="text-sm text-white/60">Aucune caméra détectée ou permissions refusées</p>
            ) : (
              <ul className="space-y-2">
                {cameras.map((cam, idx) => (
                  <li key={cam.deviceId} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold">#{idx + 1}: {cam.label}</p>
                    <p className="mt-1 font-mono text-xs text-white/50">ID: {cam.deviceId.substring(0, 20)}...</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {currentCamera && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-emerald-300">Caméra actuelle</h3>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">{currentCamera.label}</p>
                {currentCamera.settings && (
                  <div className="mt-2 space-y-1 text-xs text-white/60">
                    <p>facingMode: {currentCamera.settings.facingMode || "non disponible"}</p>
                    <p>Résolution: {currentCamera.settings.width}x{currentCamera.settings.height}</p>
                    <p>Device ID: {currentCamera.settings.deviceId?.substring(0, 20)}...</p>
                  </div>
                )}
                {currentCamera.capabilities && currentCamera.capabilities.facingMode && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-indigo-300">
                      Modes supportés: {Array.isArray(currentCamera.capabilities.facingMode) 
                        ? currentCamera.capabilities.facingMode.join(", ") 
                        : currentCamera.capabilities.facingMode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-200">
              <strong>Note:</strong> Si vous ne voyez qu'une seule caméra, votre appareil ne dispose peut-être que d'une caméra avant, 
              ou les permissions pour la caméra arrière n'ont pas été accordées.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
