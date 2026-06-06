import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, BarChart3, Check, Download, ExternalLink, Film, Mail, MonitorPlay, Music, Palette, RefreshCw, RotateCcw, Smartphone, Trash2, Type, Video, X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { uploadLogo } from "../../lib/uploadLogo";
import { uploadJingle } from "../../lib/uploadJingle";
import { SUPABASE_CONFIGURED } from "../../lib/supabase";
import { listVideosFromBucket, clearAllVideosFromBucket } from "../../lib/uploadVideo";
import { exportAllVideosFromBucket } from "../../lib/exportVideos";
import { AnalyticsDashboard } from "../AnalyticsDashboard";
import EmailListDashboard from "../EmailListDashboard";
import {
  CapturePanel, EmailPanel, hubSummaries, IdentityPanel, IntroOutroPanel, JinglePanel, KioskPanel, MotorPanel, MusicPanel,
} from "./panels";
import type { UploadState } from "./PresentationEditor";
import { HubRow, PanelBlock } from "./ui";
import { DEFAULT_SETTINGS, type AppSettings, type SettingsPanel } from "./types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const PANEL_TITLES: Record<Exclude<SettingsPanel, "hub">, string> = {
  identity: "Identité & branding",
  capture: "Capture vidéo",
  email: "Email marketing",
  motor: "Plateau tournant",
  kiosk: "Mode kiosque",
  jingle: "Intro / Outro",
  music: "Musique de fond",
  intro: "Intro (pré-roll)",
  outro: "Outro (post-roll)",
};

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [panel, setPanel] = useState<SettingsPanel>("hub");
  const [logoState, setLogoState] = useState<UploadState>("idle");
  const [logoError, setLogoError] = useState("");
  const [introState, setIntroState] = useState<UploadState>("idle");
  const [introError, setIntroError] = useState("");
  const [outroState, setOutroState] = useState<UploadState>("idle");
  const [outroError, setOutroError] = useState("");
  const [introImageState, setIntroImageState] = useState<UploadState>("idle");
  const [introImageError, setIntroImageError] = useState("");
  const [outroImageState, setOutroImageState] = useState<UploadState>("idle");
  const [outroImageError, setOutroImageError] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEmailList, setShowEmailList] = useState(false);
  const [clearingStorage, setClearingStorage] = useState(false);
  const [exportingVideos, setExportingVideos] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [videoCount, setVideoCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setPanel("hub");
      setLogoState("idle");
      setLogoError("");
      setIntroState("idle");
      setIntroError("");
      setOutroState("idle");
      setOutroError("");
      setIntroImageState("idle");
      setIntroImageError("");
      setOutroImageState("idle");
      setOutroImageError("");
      // Load video count from Supabase bucket
      if (SUPABASE_CONFIGURED) {
        listVideosFromBucket().then(videos => setVideoCount(videos.length)).catch(() => setVideoCount(0));
      } else {
        setVideoCount(0);
      }
    }
  }, [isOpen, settings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const updateFields = (changes: Partial<AppSettings>) =>
    setDraft((prev) => ({ ...prev, ...changes }));

  const handleLogo = async (file?: File) => {
    if (!file) return;
    setLogoState("uploading");
    setLogoError("");
    try {
      const result = await uploadLogo(file, () => undefined);
      if (!result) throw new Error("not configured");
      update("logoUrl", result.publicUrl);
      setLogoState("done");
    } catch {
      setLogoState("error");
      setLogoError("Import impossible. Vérifiez Supabase.");
    }
  };

  const handleJingle = async (kind: "intro" | "outro", file?: File) => {
    if (!file) return;
    const setState = kind === "intro" ? setIntroState : setOutroState;
    const setError = kind === "intro" ? setIntroError : setOutroError;
    setState("uploading");
    setError("");
    try {
      const result = await uploadJingle(file, kind, () => undefined);
      if (!result) throw new Error("not configured");
      update(kind === "intro" ? "introUrl" : "outroUrl", result.publicUrl);
      setState("done");
    } catch {
      setState("error");
      setError("Import impossible. Vérifiez Supabase.");
    }
  };

  const handlePresentationImage = async (kind: "intro" | "outro", file?: File) => {
    if (!file) return;
    const isIntro = kind === "intro";
    const setState = isIntro ? setIntroImageState : setOutroImageState;
    const setError = isIntro ? setIntroImageError : setOutroImageError;
    setState("uploading");
    setError("");
    try {
      const result = await uploadJingle(file, kind, () => undefined);
      if (!result) throw new Error("not configured");
      update(isIntro ? "introImageUrl" : "outroImageUrl", result.publicUrl);
      setState("done");
    } catch {
      setState("error");
      setError("Import image impossible.");
    }
  };

  const handleSave = () => { onSave(draft); onClose(); };

  const handleClearStorage = async () => {
    if (!SUPABASE_CONFIGURED) {
      alert('⚠️ Supabase non configuré');
      return;
    }
    if (videoCount === 0) {
      alert('ℹ️ Aucune vidéo à supprimer');
      return;
    }
    if (!confirm(`⚠️ Effacer ${videoCount} vidéo${videoCount > 1 ? 's' : ''} du bucket Supabase ?\n\nCette action est irréversible.`)) {
      return;
    }
    setClearingStorage(true);
    try {
      const result = await clearAllVideosFromBucket();
      if (result.success) {
        setVideoCount(0);
        alert(`✅ ${result.count} vidéo${result.count > 1 ? 's' : ''} supprimée${result.count > 1 ? 's' : ''} avec succès`);
      } else {
        alert(`❌ Erreur lors de la suppression :\n${result.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
      alert('❌ Erreur lors de l\'effacement du stockage');
    } finally {
      setClearingStorage(false);
    }
  };

  const handleExportVideos = async () => {
    if (!SUPABASE_CONFIGURED) {
      alert('⚠️ Supabase non configuré');
      return;
    }
    if (videoCount === 0) {
      alert('ℹ️ Aucune vidéo à exporter.\n\nCapturez des vidéos d\'abord !');
      return;
    }
    setExportingVideos(true);
    setExportProgress({ current: 0, total: 0 });
    try {
      await exportAllVideosFromBucket((progress) => {
        setExportProgress({ current: progress.current, total: progress.total });
      });
      alert('✅ Export terminé avec succès');
    } catch (error) {
      console.error('Error exporting videos:', error);
      if (error instanceof Error && error.message === 'NO_VIDEOS') {
        alert('ℹ️ Aucune vidéo à exporter');
      } else {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        alert(`❌ Erreur lors de l'export : ${message}`);
      }
    } finally {
      setExportingVideos(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const goBack = () => {
    if (panel === "intro" || panel === "outro") setPanel("jingle");
    else setPanel("hub");
  };

  const summaries = hubSummaries(draft);
  const isSubPanel = panel !== "hub";

  const renderPanel = () => {
    const props = { draft, update, updateFields };
    switch (panel) {
      case "identity":
        return <IdentityPanel {...props} logoState={logoState} logoError={logoError} onLogo={handleLogo} fileRef={fileRef} />;
      case "capture":
        return <CapturePanel {...props} />;
      case "email":
        return <EmailPanel {...props} />;
      case "motor":
        return <MotorPanel {...props} />;
      case "kiosk":
        return <KioskPanel {...props} />;
      case "jingle":
        return <JinglePanel {...props} onOpenIntro={() => setPanel("intro")} onOpenOutro={() => setPanel("outro")} />;
      case "music":
        return <MusicPanel {...props} />;
      case "intro":
      case "outro":
        return (
          <IntroOutroPanel
            {...props}
            kind={panel}
            introState={introState}
            introError={introError}
            outroState={outroState}
            outroError={outroError}
            introImageState={introImageState}
            introImageError={introImageError}
            outroImageState={outroImageState}
            outroImageError={outroImageError}
            onIntro={(f) => handleJingle("intro", f)}
            onOutro={(f) => handleJingle("outro", f)}
            onIntroImage={(f) => handlePresentationImage("intro", f)}
            onOutroImage={(f) => handlePresentationImage("outro", f)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <AnimatePresence>
        {showAnalytics && (
          <Fragment key="analytics">
            <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
          </Fragment>
        )}
      </AnimatePresence>

      <EmailListDashboard
        isOpen={showEmailList}
        onClose={() => setShowEmailList(false)}
        eventId={draft.eventName || "default"}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex h-full w-full flex-col overflow-hidden bg-neuro-bg"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 38 }}
            >
              {/* Header */}
              <header className="shrink-0 border-b border-white/8 pt-[env(safe-area-inset-top)]">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {isSubPanel ? (
                    <button
                      type="button"
                      onClick={goBack}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white active:scale-90 touch-manipulation"
                      aria-label="Retour"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-neuro-muted active:scale-90 touch-manipulation"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neuro-accent">
                      {isSubPanel ? "Réglage" : "Administration"}
                    </p>
                    <h2 className="truncate text-[17px] font-black text-white leading-tight">
                      {isSubPanel ? PANEL_TITLES[panel] : "Configuration borne"}
                    </h2>
                  </div>

                  {!isSubPanel && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-neuro-accent px-3.5 text-[12px] font-black text-white shadow-[0_0_16px_rgba(99,102,241,0.35)] active:scale-95 touch-manipulation"
                    >
                      <Check className="h-3.5 w-3.5" /> OK
                    </button>
                  )}
                </div>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain no-bounce smooth-scroll scrollbar-none px-3 py-3">
                <AnimatePresence mode="wait" initial={false}>
                  {panel === "hub" ? (
                    <motion.div
                      key="hub"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {/* Event preview chip */}
                      <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-3 py-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neuro-accent/20 text-neuro-accent">
                          <Palette className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-white">{draft.eventName}</p>
                          <p className="text-[10px] text-neuro-muted">Borne photobooth 360°</p>
                        </div>
                      </div>

                      {/* Main settings groups */}
                      <PanelBlock>
                        <HubRow icon={<Type className="h-4 w-4" />} title="Identité & branding" summary={summaries.identity} onClick={() => setPanel("identity")} />
                        <HubRow icon={<Video className="h-4 w-4" />} title="Capture vidéo" summary={summaries.capture} onClick={() => setPanel("capture")} />
                        <HubRow icon={<Mail className="h-4 w-4" />} title="Email marketing" summary={summaries.email} onClick={() => setPanel("email")} />
                      </PanelBlock>

                      <PanelBlock>
                        <HubRow icon={<RefreshCw className="h-4 w-4" />} title="Plateau tournant" summary={summaries.motor} onClick={() => setPanel("motor")} />
                        <HubRow icon={<Smartphone className="h-4 w-4" />} title="Mode kiosque" summary={summaries.kiosk} onClick={() => setPanel("kiosk")} />
                        <HubRow icon={<Film className="h-4 w-4" />} title="Intro / Outro" summary={summaries.jingle} onClick={() => setPanel("jingle")} />
                        <HubRow icon={<Music className="h-4 w-4" />} title="Musique de fond" summary={summaries.music} onClick={() => setPanel("music")} />
                      </PanelBlock>

                      <PanelBlock>
                        <button
                          type="button"
                          onClick={() => window.open("/ecran", "_blank", "noopener,noreferrer")}
                          className="flex min-h-[3.25rem] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-white/5 touch-manipulation"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                            <MonitorPlay className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-white">Écran client dédié</p>
                            <p className="text-[11px] text-neuro-muted">Ouvrir la route /ecran avec vidéo et QR code</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-neuro-muted" />
                        </button>
                      </PanelBlock>

                      {/* Tools */}
                      <PanelBlock>
                        {SUPABASE_CONFIGURED ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowAnalytics(true)}
                              className="flex min-h-[3.25rem] w-full items-center gap-3 border-b border-white/6 px-3.5 py-2.5 text-left active:bg-white/5 touch-manipulation"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                                <BarChart3 className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[13px] font-semibold text-white">Statistiques</p>
                                <p className="text-[11px] text-neuro-muted">Analytics de l'événement</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowEmailList(true)}
                              className="flex min-h-[3.25rem] w-full items-center gap-3 border-b border-white/6 px-3.5 py-2.5 text-left active:bg-white/5 touch-manipulation"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                                <Mail className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[13px] font-semibold text-white">Emails collectés</p>
                                <p className="text-[11px] text-neuro-muted">Liste des contacts</p>
                              </div>
                            </button>
                          </>
                        ) : (
                          <p className="px-3.5 py-3 text-[11px] text-neuro-muted">Stats & emails disponibles avec Supabase configuré.</p>
                        )}
                      </PanelBlock>

                      {/* Storage management */}
                      {SUPABASE_CONFIGURED && (
                        <PanelBlock>
                          <button
                            type="button"
                            onClick={handleExportVideos}
                            disabled={exportingVideos || videoCount === 0}
                            className="flex min-h-[3.25rem] w-full items-center gap-3 border-b border-white/6 px-3.5 py-2.5 text-left active:bg-white/5 touch-manipulation disabled:opacity-50"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 text-green-300">
                              <Download className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[13px] font-semibold text-white">
                                {exportingVideos ? `Export en cours... (${exportProgress.current}/${exportProgress.total})` : `Exporter toutes les vidéos${videoCount > 0 ? ` (${videoCount})` : ''}`}
                              </p>
                              <p className="text-[11px] text-neuro-muted">Télécharger un ZIP depuis Supabase</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearStorage}
                            disabled={clearingStorage || videoCount === 0}
                            className="flex min-h-[3.25rem] w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-white/5 touch-manipulation disabled:opacity-50"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[13px] font-semibold text-white">
                                {clearingStorage ? 'Suppression...' : `Effacer le bucket${videoCount > 0 ? ` (${videoCount})` : ''}`}
                              </p>
                              <p className="text-[11px] text-neuro-muted">Supprimer toutes les vidéos Supabase</p>
                            </div>
                          </button>
                        </PanelBlock>
                      )}

                      <button
                        type="button"
                        onClick={() => setDraft(DEFAULT_SETTINGS)}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[12px] font-bold text-neuro-muted active:scale-[0.98] touch-manipulation"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser tous les réglages
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={panel}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.15 }}
                    >
                      {renderPanel()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer — sub-panels only */}
              {isSubPanel && (
                <footer className="shrink-0 border-t border-white/8 bg-neuro-bg px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neuro-accent text-[14px] font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-[0.98] touch-manipulation"
                  >
                    <Check className="h-4 w-4" /> Appliquer
                  </button>
                </footer>
              )}

              {/* Hub footer — cancel */}
              {!isSubPanel && (
                <footer className="shrink-0 border-t border-white/8 bg-neuro-bg px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-11 rounded-xl border border-white/10 bg-white/5 text-[13px] font-bold text-neuro-muted active:scale-[0.98] touch-manipulation"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-neuro-accent text-[13px] font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-[0.98] touch-manipulation"
                    >
                      <Check className="h-4 w-4" /> Sauvegarder
                    </button>
                  </div>
                </footer>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
