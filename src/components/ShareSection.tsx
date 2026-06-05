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
    <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-1 sm:px-6">
      <motion.div
        className="glass-panel mx-auto flex w-full max-w-[340px] flex-col items-center rounded-[1.65rem] p-4 text-center"
        initial={{ y: 16, opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-3 flex w-full items-center justify-between gap-3">
          <div className="text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neuro-muted">Vidéo prête</p>
            <h2 className="text-[20px] font-black leading-tight tracking-[-0.035em] text-white">Scanner</h2>
          </div>
          <span className={`flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold ${cloudEnabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-neuro-muted"}`}>
            {cloudEnabled ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {cloudEnabled ? "Cloud" : "Local"}
          </span>
        </div>

        {isUploading && (
          <div className="w-full space-y-2 py-5" aria-live="polite">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              {uploadStatus === "uploading" ? <CloudUpload className="h-6 w-6 animate-pulse" /> : <Loader2 className="h-6 w-6 animate-spin" />}
            </div>
            <div className="flex items-center justify-between text-caption text-neuro-muted">
              <span>{uploadStatus === "uploading" ? "Upload" : "Préparation"}</span>
              <span className="font-mono text-white">{uploadStatus === "uploading" ? `${uploadProgress}%` : "…"}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${accent.bg} rounded-full transition-all duration-300`} style={{ width: `${uploadStatus === "uploading" ? uploadProgress : 12}%` }} />
            </div>
          </div>
        )}

        {cloudEnabled && uploadStatus === "error" && (
          <div className="mb-3 w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-caption font-semibold text-red-200">
            Upload échoué — QR local.
          </div>
        )}

        {showLocal && isSavingShare && (
          <div className="flex items-center gap-2 py-6 text-neuro-muted" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
            <span className="text-sm">Lien local…</span>
          </div>
        )}

        {isReady && (
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="mb-3 flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Prêt
            </div>
            <motion.div
              className="rounded-[1.5rem] bg-white p-3.5 shadow-[0_0_38px_rgba(99,102,241,0.28)]"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <QRCodeSVG value={qrValue} size={196} bgColor="#ffffff" fgColor="#09090B" level="M" includeMargin={false} />
            </motion.div>
            <p className="mt-3 max-w-[250px] text-[12px] leading-5 text-neuro-muted">
              Scanne pour télécharger ou choisir un effet.
            </p>
          </motion.div>
        )}

        {!isReady && !isUploading && !isSavingShare && (
          <div className="flex flex-col items-center gap-2 py-6 text-neuro-muted">
            <QrCode className="h-7 w-7" />
            <p className="text-caption">Lien indisponible.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
