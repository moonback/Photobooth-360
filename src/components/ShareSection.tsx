import { QRCodeSVG } from "qrcode.react";
import { CloudUpload, Loader2, Wifi, WifiOff } from "lucide-react";
import { UploadStatus } from "../lib/uploadVideo";

interface AccentStyle {
  bg: string;
  text: string;
}

interface ShareSectionProps {
  cloudEnabled: boolean;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadedUrl: string;
  shareId: string;
  isSavingShare: boolean;
  accent: AccentStyle;
}

export default function ShareSection({
  cloudEnabled,
  uploadStatus,
  uploadProgress,
  uploadedUrl,
  shareId,
  isSavingShare,
  accent,
}: ShareSectionProps) {
  const showLocal = !cloudEnabled || uploadStatus === "error";

  return (
    <div className="px-5 py-6 flex flex-col items-center gap-5">
      {/* Header row */}
      <div className="w-full flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Récupérer sur ton téléphone</p>
        <span
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
            cloudEnabled
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {cloudEnabled ? (
            <><Wifi className="w-3 h-3" /> Cloud</>
          ) : (
            <><WifiOff className="w-3 h-3" /> Local</>
          )}
        </span>
      </div>

      {/* ── CLOUD ── */}
      {cloudEnabled && (
        <>
          {(uploadStatus === "idle") && (
            <div className="flex items-center gap-2 text-zinc-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Préparation…</span>
            </div>
          )}

          {uploadStatus === "uploading" && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
                  Upload en cours…
                </span>
                <span className="font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${accent.bg} rounded-full transition-all duration-300`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadStatus === "done" && uploadedUrl && (
            <>
              <div className="bg-white p-4 rounded-2xl shadow-xl">
                <QRCodeSVG
                  value={`${window.location.origin}/share/cloud?url=${btoa(encodeURIComponent(uploadedUrl))}`}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#09090b"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-zinc-500 text-center max-w-[240px] leading-relaxed">
                Scanne depuis n'importe quel téléphone pour accéder à ta vidéo et choisir un effet.
              </p>
            </>
          )}

          {uploadStatus === "error" && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center w-full">
              Upload échoué — mode local activé.
            </p>
          )}
        </>
      )}

      {/* ── LOCAL FALLBACK ── */}
      {showLocal && (
        <>
          {isSavingShare ? (
            <div className="flex items-center gap-2 text-zinc-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Préparation du lien local…</span>
            </div>
          ) : shareId ? (
            <>
              <div className="bg-white p-4 rounded-2xl shadow-xl">
                <QRCodeSVG
                  value={`${window.location.origin}/share/${shareId}`}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#09090b"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-zinc-500 text-center max-w-[240px] leading-relaxed">
                Scanne depuis le même réseau Wi-Fi. Configure Supabase pour un accès global.
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-600">Lien indisponible.</p>
          )}
        </>
      )}
    </div>
  );
}
