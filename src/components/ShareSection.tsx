import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, CloudUpload, Loader2, QrCode, Wifi, WifiOff, ChevronDown, Mail } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UploadStatus } from "../lib/uploadVideo";
import { useEffect, useRef, useState } from "react";
import { trackShare } from "../lib/analytics";

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
  onOpenEmailCapture?: () => void;
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
  onOpenEmailCapture,
}: ShareSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const showLocal = !cloudEnabled || uploadStatus === "error";
  const qrValue = cloudEnabled && uploadStatus === "done" && uploadedUrl
    ? buildCloudShareUrl(uploadedUrl)
    : shareId
      ? `${window.location.origin}/share/${shareId}`
      : "";
  const isReady = Boolean(qrValue);
  const isUploading = cloudEnabled && (uploadStatus === "idle" || uploadStatus === "uploading");

  const trackedVideoRef = useRef<string>("");

  useEffect(() => {
    if (isReady && qrValue && qrValue !== trackedVideoRef.current) {
      trackedVideoRef.current = qrValue;
      const videoId = shareId || uploadedUrl || `video_${Date.now()}`;
      trackShare(videoId, cloudEnabled ? 'qr_cloud' : 'qr_local');
    }
  }, [isReady, qrValue, shareId, uploadedUrl, cloudEnabled]);

  return (
    <div className="px-3 pb-1 pt-0 sm:px-4">
      <motion.div
        className="glass-panel-strong mx-auto flex w-full max-w-[340px] flex-col items-center overflow-hidden rounded-2xl text-center"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/5 touch-manipulation"
        >
          <div className="min-w-0 flex-1">
            <p className="text-label text-neuro-muted">Partage</p>
            <h2 className="font-display text-[18px] font-bold leading-tight tracking-[-0.03em] text-white">
              Scanner le QR
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold ${
                cloudEnabled
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/8 text-neuro-muted"
              }`}
            >
              {cloudEnabled ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {cloudEnabled ? "Cloud" : "Local"}
            </span>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="h-4 w-4 text-neuro-muted" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="w-full overflow-hidden"
            >
              <div className="px-4 pb-4">
                {isUploading && (
                  <div className="w-full space-y-2.5 py-4" aria-live="polite">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                      {uploadStatus === "uploading" ? <CloudUpload className="h-5 w-5 animate-pulse" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                    </div>
                    <div className="flex items-center justify-between text-caption text-neuro-muted">
                      <span>{uploadStatus === "uploading" ? "Envoi en cours" : "Préparation"}</span>
                      <span className="font-mono text-white">{uploadStatus === "uploading" ? `${uploadProgress}%` : "…"}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full ${accent.bg} rounded-full transition-all duration-300`} style={{ width: `${uploadStatus === "uploading" ? uploadProgress : 12}%` }} />
                    </div>
                  </div>
                )}

                {cloudEnabled && uploadStatus === "error" && (
                  <div className="mb-3 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-caption font-semibold text-red-200">
                    Upload échoué — QR local disponible.
                  </div>
                )}

                {showLocal && isSavingShare && (
                  <div className="flex items-center justify-center gap-2 py-5 text-neuro-muted" aria-live="polite">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                    <span className="text-body">Génération du lien…</span>
                  </div>
                )}

                {isReady && (
                  <motion.div
                    className="flex flex-col items-center"
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  >
                    <div className="mb-3 flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-label text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Prêt à scanner
                    </div>

                    <div className="relative rounded-2xl bg-white p-3.5 shadow-[0_8px_40px_rgba(0,0,0,0.30)]">
                      <QRCodeSVG value={qrValue} size={180} bgColor="#ffffff" fgColor="#070709" level="M" includeMargin={false} className="h-auto w-full max-w-[180px]" />
                    </div>

                    <p className="mt-3 max-w-[240px] text-caption leading-relaxed text-neuro-muted">
                      Scannez pour télécharger ou appliquer des effets.
                    </p>

                    {onOpenEmailCapture && (
                      <button
                        type="button"
                        onClick={onOpenEmailCapture}
                        className="btn-secondary mt-3 w-full gap-2 rounded-xl text-[13px] touch-manipulation"
                      >
                        <Mail className="h-4 w-4" />
                        Recevoir par email
                      </button>
                    )}
                  </motion.div>
                )}

                {!isReady && !isUploading && !isSavingShare && (
                  <div className="flex flex-col items-center gap-2 py-5 text-neuro-muted">
                    <QrCode className="h-6 w-6" />
                    <p className="text-caption">Lien indisponible.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
