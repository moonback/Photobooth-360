import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, CloudUpload, Loader2, QrCode, Wifi, WifiOff } from "lucide-react";
import { motion } from "motion/react";
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

function buildCloudShareUrl(uploadedUrl: string) {
  return `${window.location.origin}/share/cloud?url=${btoa(encodeURIComponent(uploadedUrl))}`;
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
  const qrValue = cloudEnabled && uploadStatus === "done" && uploadedUrl
    ? buildCloudShareUrl(uploadedUrl)
    : shareId
      ? `${window.location.origin}/share/${shareId}`
      : "";
  const isReady = Boolean(qrValue);
  const isUploading = cloudEnabled && (uploadStatus === "idle" || uploadStatus === "uploading");

  return (
    <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-2 sm:px-6">
      <motion.div
        className="glass-panel mx-auto flex w-full max-w-sm flex-col items-center rounded-[2rem] p-5 text-center"
        initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-4 flex w-full items-center justify-between gap-3">
          <div className="text-left">
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-neuro-muted">Vidéo prête</p>
            <h2 className="text-title font-black text-white">Scanner pour récupérer</h2>
          </div>
          <span className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-caption font-bold ${cloudEnabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neuro-muted"}`}>
            {cloudEnabled ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {cloudEnabled ? "Cloud" : "Local"}
          </span>
        </div>

        {isUploading && (
          <div className="w-full space-y-3 py-7" aria-live="polite">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/15 text-indigo-300">
              {uploadStatus === "uploading" ? <CloudUpload className="h-8 w-8 animate-pulse" /> : <Loader2 className="h-8 w-8 animate-spin" />}
            </div>
            <div className="flex items-center justify-between text-caption text-neuro-muted">
              <span>{uploadStatus === "uploading" ? "Upload en cours" : "Préparation du QR"}</span>
              <span className="font-mono text-white">{uploadStatus === "uploading" ? `${uploadProgress}%` : "…"}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${accent.bg} rounded-full transition-all duration-300`} style={{ width: `${uploadStatus === "uploading" ? uploadProgress : 12}%` }} />
            </div>
          </div>
        )}

        {cloudEnabled && uploadStatus === "error" && (
          <div className="mb-4 w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-caption font-semibold text-red-200">
            Upload échoué — QR local activé.
          </div>
        )}

        {showLocal && isSavingShare && (
          <div className="flex items-center gap-2 py-8 text-neuro-muted" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
            <span className="text-body">Préparation du lien local…</span>
          </div>
        )}

        {isReady && (
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
          >
            <div className="mb-4 flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-caption font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Succès · prêt à scanner
            </div>
            <div className="rounded-[2rem] bg-white p-4 shadow-[0_0_44px_rgba(99,102,241,0.32)]">
              <QRCodeSVG value={qrValue} size={224} bgColor="#ffffff" fgColor="#09090B" level="M" includeMargin={false} />
            </div>
            <p className="mt-4 max-w-[280px] text-caption text-neuro-muted">
              Scanne le QR code avec ton téléphone, puis télécharge ou applique un effet ralenti.
            </p>
          </motion.div>
        )}

        {!isReady && !isUploading && !isSavingShare && (
          <div className="flex flex-col items-center gap-2 py-8 text-neuro-muted">
            <QrCode className="h-8 w-8" />
            <p className="text-caption">Lien indisponible pour le moment.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
