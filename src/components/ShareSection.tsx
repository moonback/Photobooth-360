import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, CloudUpload, Loader2, QrCode, Wifi, WifiOff, ChevronDown, ChevronUp, Mail } from "lucide-react";
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
  
  // Ref pour tracker uniquement une fois par vidéo
  const trackedVideoRef = useRef<string>("");

  // Tracker quand le QR code est prêt
  useEffect(() => {
    if (isReady && qrValue && qrValue !== trackedVideoRef.current) {
      trackedVideoRef.current = qrValue;
      const videoId = shareId || uploadedUrl || `video_${Date.now()}`;
      trackShare(videoId, cloudEnabled ? 'qr_cloud' : 'qr_local');
    }
  }, [isReady, qrValue, shareId, uploadedUrl, cloudEnabled]);

  return (
    <div className="px-4 pb-2 pt-1 sm:px-6">
      <motion.div
        className="glass-panel mx-auto flex w-full max-w-[360px] flex-col items-center rounded-[1.75rem] overflow-hidden text-center"
        initial={{ y: 20, opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header cliquable avec badge cloud */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between gap-3 p-4 pb-3 text-left transition-colors hover:bg-white/5 active:bg-white/8 touch-manipulation"
        >
          <div className="min-w-0 flex-1">
            <motion.p 
              className="text-[11px] font-bold uppercase tracking-[0.2em] text-neuro-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Vidéo prête
            </motion.p>
            <motion.h2 
              className="text-[22px] font-black leading-tight tracking-[-0.04em] text-white"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Scanner
            </motion.h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Badge cloud/local premium */}
            <motion.span 
              className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-lg ${
                cloudEnabled 
                  ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-300 shadow-emerald-500/20" 
                  : "bg-white/8 text-neuro-muted"
              }`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              {cloudEnabled ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {cloudEnabled ? "Cloud" : "Local"}
            </motion.span>
            
            {/* Icône chevron */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="h-5 w-5 text-neuro-muted" />
            </motion.div>
          </div>
        </button>

        {/* Contenu collapsible */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full overflow-hidden"
            >
              <div className="px-5 pb-5">
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
            {/* Badge "Prêt" avec animation pulse */}
            <motion.div 
              className="mb-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300 shadow-lg shadow-emerald-500/20"
              animate={{ 
                boxShadow: [
                  "0 4px 20px rgba(16, 185, 129, 0.2)",
                  "0 4px 30px rgba(16, 185, 129, 0.35)",
                  "0 4px 20px rgba(16, 185, 129, 0.2)",
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Prêt
            </motion.div>
            
            {/* QR Code avec container premium et effet 3D */}
            <motion.div
              className="relative rounded-[1.65rem] bg-white p-4 shadow-[0_8px_50px_rgba(0,0,0,0.35)]"
              animate={{ 
                y: [0, -4, 0],
                boxShadow: [
                  "0 8px 50px rgba(0,0,0,0.35)",
                  "0 12px 60px rgba(99,102,241,0.3)",
                  "0 8px 50px rgba(0,0,0,0.35)",
                ]
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Glow ring animé */}
              <motion.div
                className="absolute inset-0 rounded-[1.65rem] border-2 border-indigo-400/0"
                animate={{
                  borderColor: ["rgba(99,102,241,0)", "rgba(99,102,241,0.4)", "rgba(99,102,241,0)"],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />
              
              <QRCodeSVG value={qrValue} size={200} bgColor="#ffffff" fgColor="#09090B" level="M" includeMargin={false} />
            </motion.div>
            
            {/* Description et bouton email */}
            <motion.div
              className="mt-4 space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="max-w-[260px] text-[13px] font-medium leading-5 text-neuro-muted">
                Scanne pour télécharger<br />ou choisir un effet.
              </p>
              
              {/* Bouton recevoir par email */}
              {onOpenEmailCapture && (
                <motion.button
                  type="button"
                  onClick={onOpenEmailCapture}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-bold text-white transition-all hover:border-white/30 hover:bg-white/10 active:scale-[0.98] touch-manipulation"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Mail className="h-4 w-4" />
                  Recevoir par email
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}

        {!isReady && !isUploading && !isSavingShare && (
          <div className="flex flex-col items-center gap-2 py-6 text-neuro-muted">
            <QrCode className="h-7 w-7" />
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
