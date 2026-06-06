import { Fragment, type RefObject } from "react";
import { Image, Lock, Mail, Music, RefreshCw, RotateCcw, RotateCw, Smartphone, Upload } from "lucide-react";
import { BACKGROUND_TRACKS } from "../../lib/backgroundMusic";
import { SUPABASE_CONFIGURED } from "../../lib/supabase";
import { PresentationEditor } from "./PresentationEditor";
import type { AppSettings } from "./types";
import { ACCENT_COLORS, COUNTDOWNS, DURATIONS, RESOLUTIONS, fmtDuration } from "./types";
import type { UploadState } from "./PresentationEditor";
import { FieldInput, InfoNote, PanelBlock, SectionLabel, Segment, Toggle } from "./ui";

interface PanelProps {
  draft: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateFields: (changes: Partial<AppSettings>) => void;
}

interface UploadProps extends PanelProps {
  logoState: UploadState;
  logoError: string;
  onLogo: (file?: File) => void;
  fileRef: RefObject<HTMLInputElement | null>;
}

export function IdentityPanel({ draft, update, logoState, logoError, onLogo, fileRef }: UploadProps) {
  return (
    <div className="space-y-3">
      <PanelBlock className="p-3">
        <SectionLabel>Événement</SectionLabel>
        <FieldInput value={draft.eventName} onChange={(v) => update("eventName", v)} placeholder="Nom de l'événement" />
      </PanelBlock>

      <PanelBlock className="p-3">
        <SectionLabel>Logo</SectionLabel>
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {draft.logoUrl ? <img src={draft.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" /> : <Image className="h-5 w-5 text-neuro-muted" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white text-[12px] font-bold text-black touch-manipulation">
            <Upload className="h-3.5 w-3.5" />{logoState === "uploading" ? "Import…" : "Importer logo"}
          </button>
        </div>
        {!SUPABASE_CONFIGURED && <p className="mt-1.5 text-[10px] text-amber-300">Supabase non configuré</p>}
        {logoError && <p className="mt-1 text-[10px] text-red-400">{logoError}</p>}
      </PanelBlock>

      <PanelBlock className="p-3">
        <SectionLabel>Couleur d'accent</SectionLabel>
        <div className="flex gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => update("accentColor", c.value)}
              className={`flex h-10 flex-1 items-center justify-center rounded-lg border touch-manipulation ${draft.accentColor === c.value ? "border-white bg-white/10" : "border-white/10 bg-white/5"}`}
              aria-label={c.label}
              aria-pressed={draft.accentColor === c.value}
            >
              <span className={`h-4 w-4 rounded-full ${c.bg}`} />
            </button>
          ))}
        </div>
      </PanelBlock>
    </div>
  );
}

export function CapturePanel({ draft, update }: PanelProps) {
  return (
    <div className="space-y-3">
      <PanelBlock className="p-3">
        <SectionLabel>Durée</SectionLabel>
        <div className="grid grid-cols-5 gap-1">
          {DURATIONS.map((d) => (
            <Fragment key={d}>
              <Segment compact value={d} selected={draft.duration === d} label={fmtDuration(d)} onClick={(v) => update("duration", v)} />
            </Fragment>
          ))}
        </div>
      </PanelBlock>

      <PanelBlock className="p-3">
        <SectionLabel>Countdown</SectionLabel>
        <div className="grid grid-cols-4 gap-1">
          {COUNTDOWNS.map((c) => (
            <Fragment key={c}>
              <Segment compact value={c} selected={draft.countdownSeconds === c} label={c === 0 ? "Off" : `${c}s`} onClick={(v) => update("countdownSeconds", v)} />
            </Fragment>
          ))}
        </div>
      </PanelBlock>

      <PanelBlock className="p-3">
        <SectionLabel>Caméra</SectionLabel>
        <div className="mb-2 grid grid-cols-2 gap-1">
          <Segment compact value="user" selected={draft.facingMode === "user"} label="Selfie" sub="Avant" onClick={(v) => update("facingMode", v)} />
          <Segment compact value="environment" selected={draft.facingMode === "environment"} label="Arrière" sub="Kiosque" onClick={(v) => update("facingMode", v)} />
        </div>
        <SectionLabel>Résolution</SectionLabel>
        <div className="grid grid-cols-3 gap-1">
          {RESOLUTIONS.map((r) => (
            <Fragment key={r.value}>
              <Segment compact value={r.value} selected={draft.resolution === r.value} label={r.label} sub={r.sub} onClick={(v) => update("resolution", v)} />
            </Fragment>
          ))}
        </div>
      </PanelBlock>

      <PanelBlock>
        <Toggle checked={draft.recordAudio} onChange={() => update("recordAudio", !draft.recordAudio)} label="Enregistrer le micro" compact />
      </PanelBlock>
    </div>
  );
}

export function EmailPanel({ draft, update }: PanelProps) {
  return (
    <div className="space-y-3">
      <PanelBlock>
        <Toggle checked={draft.emailCaptureEnabled} onChange={() => update("emailCaptureEnabled", !draft.emailCaptureEnabled)} label="Collecter les emails" compact />
        {draft.emailCaptureEnabled && (
          <Toggle checked={draft.emailSendEnabled} onChange={() => update("emailSendEnabled", !draft.emailSendEnabled)} label="Envoi automatique" compact />
        )}
      </PanelBlock>
      {draft.emailCaptureEnabled && draft.emailSendEnabled && (
        <InfoNote>Nécessite la Edge Function <span className="font-mono opacity-70">send-video-email</span> + clé Resend.</InfoNote>
      )}
      {!draft.emailCaptureEnabled && (
        <p className="px-1 text-[11px] text-neuro-muted">Le bouton « Recevoir par email » sera masqué après la capture.</p>
      )}
    </div>
  );
}

export function MotorPanel({ draft, update }: PanelProps) {
  return (
    <div className="space-y-3">
      <PanelBlock>
        <Toggle checked={draft.motorEnabled} onChange={() => update("motorEnabled", !draft.motorEnabled)} label="Activer le plateau tournant" compact />
      </PanelBlock>

      {draft.motorEnabled && (
        <>
          <PanelBlock>
            <Toggle checked={draft.motorAutoStart} onChange={() => update("motorAutoStart", !draft.motorAutoStart)} label="Démarrage auto à l'enregistrement" compact />
          </PanelBlock>

          <PanelBlock className="p-3">
            <SectionLabel>Interface</SectionLabel>
            <div className="mb-3 grid grid-cols-2 gap-1">
              <Segment compact value="serial" selected={draft.motorBackend === "serial"} label="WebSerial" sub="USB-Série" onClick={(v) => update("motorBackend", v)} />
              <Segment compact value="usb" selected={draft.motorBackend === "usb"} label="WebUSB" sub="USB direct" onClick={(v) => update("motorBackend", v)} />
            </div>

            <SectionLabel>Vitesse — {draft.motorSpeed}%</SectionLabel>
            <input type="range" min={5} max={100} step={5} value={draft.motorSpeed} onChange={(e) => update("motorSpeed", Number(e.target.value))} className="mb-3 h-1.5 w-full appearance-none rounded-full bg-white/10 accent-indigo-500" />

            <SectionLabel>Direction</SectionLabel>
            <div className="mb-3 grid grid-cols-2 gap-1">
              <button type="button" onClick={() => update("motorDirection", "CW")} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-bold touch-manipulation ${draft.motorDirection === "CW" ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}>
                <RotateCw className="h-3.5 w-3.5" /> Horaire
              </button>
              <button type="button" onClick={() => update("motorDirection", "CCW")} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-bold touch-manipulation ${draft.motorDirection === "CCW" ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}>
                <RotateCcw className="h-3.5 w-3.5" /> Anti-H.
              </button>
            </div>

            <SectionLabel>Tours</SectionLabel>
            <div className="mb-3 flex flex-wrap gap-1">
              {[0, 1, 2, 3, 5, 10].map((n) => (
                <button key={n} type="button" onClick={() => update("motorTurns", n)} className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-[12px] font-bold touch-manipulation ${draft.motorTurns === n ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}>
                  {n === 0 ? "∞" : n}
                </button>
              ))}
            </div>

            <SectionLabel>Synchronisation</SectionLabel>
            <div className="space-y-1">
              {([
                { value: "ack" as const, label: "Attendre READY", sub: "Firmware confirme" },
                { value: "delay" as const, label: "Délai fixe", sub: `${draft.motorSyncDelay} ms` },
                { value: "none" as const, label: "Aucune", sub: "Simultané" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("motorSyncMode", opt.value)}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left touch-manipulation ${draft.motorSyncMode === opt.value ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}
                >
                  <span className={`h-3 w-3 shrink-0 rounded-full border-2 ${draft.motorSyncMode === opt.value ? "border-neuro-accent bg-neuro-accent" : "border-white/30"}`} />
                  <span>
                    <span className="block text-[12px] font-bold">{opt.label}</span>
                    <span className="text-[10px] opacity-60">{opt.sub}</span>
                  </span>
                </button>
              ))}
            </div>

            {draft.motorSyncMode === "delay" && (
              <div className="mt-2">
                <SectionLabel>Délai — {draft.motorSyncDelay} ms</SectionLabel>
                <input type="range" min={100} max={3000} step={100} value={draft.motorSyncDelay} onChange={(e) => update("motorSyncDelay", Number(e.target.value))} className="h-1.5 w-full appearance-none rounded-full bg-white/10 accent-indigo-500" />
              </div>
            )}
          </PanelBlock>

          <InfoNote>WebSerial / WebUSB nécessite Chrome ou Edge. Le panneau de contrôle apparaît sur l'écran de capture.</InfoNote>
        </>
      )}
    </div>
  );
}

export function KioskPanel({ draft, update }: PanelProps) {
  return (
    <div className="space-y-3">
      <PanelBlock>
        <Toggle checked={draft.kioskEnabled} onChange={() => update("kioskEnabled", !draft.kioskEnabled)} label="Activer le mode kiosque" compact />
      </PanelBlock>

      {draft.kioskEnabled && (
        <>
          <PanelBlock className="p-3">
            <SectionLabel>Code PIN admin</SectionLabel>
            <p className="mb-2 text-[10px] text-white/40">5 taps en haut au centre pour accéder aux réglages.</p>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neuro-muted" />
              <input
                value={draft.adminPin}
                onChange={(e) => update("adminPin", e.target.value)}
                inputMode="numeric"
                placeholder="1234"
                className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-[16px] text-white placeholder:text-zinc-600 sm:text-[13px]"
              />
            </div>
          </PanelBlock>

          <PanelBlock className="space-y-1 p-3 text-[11px] text-indigo-200/70">
            <p className="font-bold text-indigo-300">Mode kiosque verrouille :</p>
            <p>• Plein écran · Écran allumé · Retour bloqué</p>
            <p>• Pull-to-refresh et menu contextuel désactivés</p>
            <p className="text-amber-300">iOS : installer via « Sur l'écran d'accueil ».</p>
          </PanelBlock>
        </>
      )}
    </div>
  );
}

interface JinglePanelProps extends PanelProps {
  onOpenIntro: () => void;
  onOpenOutro: () => void;
}

export function MusicPanel({ draft, update }: PanelProps) {
  return (
    <div className="space-y-3">
      <PanelBlock>
        <Toggle
          checked={draft.backgroundMusicEnabled}
          onChange={() => update("backgroundMusicEnabled", !draft.backgroundMusicEnabled)}
          label="Musique de fond"
          compact
        />
      </PanelBlock>

      {draft.backgroundMusicEnabled && (
        <>
          <PanelBlock className="p-3">
            <SectionLabel>Piste par défaut</SectionLabel>
            <p className="mb-2 text-[10px] text-white/40">
              Proposée par défaut sur la page de partage. L'invité peut la changer ou la désactiver.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => update("backgroundMusicDefault", "none")}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-bold touch-manipulation ${
                  draft.backgroundMusicDefault === "none"
                    ? "border-neuro-accent bg-neuro-accent/15 text-white"
                    : "border-white/10 bg-white/5 text-neuro-muted"
                }`}
              >
                <Music className="h-3.5 w-3.5" /> Aucune
              </button>
              {BACKGROUND_TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => update("backgroundMusicDefault", track.id)}
                  className={`flex h-10 items-center justify-center rounded-lg border px-2 text-[12px] font-bold touch-manipulation ${
                    draft.backgroundMusicDefault === track.id
                      ? "border-neuro-accent bg-neuro-accent/15 text-white"
                      : "border-white/10 bg-white/5 text-neuro-muted"
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>
          </PanelBlock>

          <PanelBlock className="p-3">
            <SectionLabel>Volume musique — {draft.backgroundMusicVolume}%</SectionLabel>
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={draft.backgroundMusicVolume}
              onChange={(e) => update("backgroundMusicVolume", Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-full bg-white/10 accent-indigo-500"
            />
          </PanelBlock>

          <InfoNote>
            Placez 5 fichiers MP3 dans <span className="font-mono opacity-70">public/song/</span> : track1.mp3 à track5.mp3.
          </InfoNote>
        </>
      )}
    </div>
  );
}

export function JinglePanel({ draft, update, onOpenIntro, onOpenOutro }: JinglePanelProps) {
  const introSummary = draft.introMode === "template" ? (draft.introTitle || "Template texte") : "Média importé";
  const outroSummary = draft.outroMode === "template" ? (draft.outroTitle || "Template texte") : "Média importé";

  return (
    <div className="space-y-3">
      <PanelBlock>
        <Toggle checked={draft.jingleEnabled} onChange={() => update("jingleEnabled", !draft.jingleEnabled)} label="Intro / Outro animés" compact />
      </PanelBlock>

      {draft.jingleEnabled && (
        <>
          <PanelBlock>
            <button type="button" onClick={onOpenIntro} className="flex min-h-[3rem] w-full items-center justify-between border-b border-white/6 px-3.5 py-2.5 text-left active:bg-white/5 touch-manipulation">
              <div>
                <p className="text-[13px] font-semibold text-white">Intro (pré-roll)</p>
                <p className="text-[11px] text-neuro-muted">{introSummary}</p>
              </div>
              <span className="text-[11px] text-neuro-accent">Modifier →</span>
            </button>
            <button type="button" onClick={onOpenOutro} className="flex min-h-[3rem] w-full items-center justify-between px-3.5 py-2.5 text-left active:bg-white/5 touch-manipulation">
              <div>
                <p className="text-[13px] font-semibold text-white">Outro (post-roll)</p>
                <p className="text-[11px] text-neuro-muted">{outroSummary}</p>
              </div>
              <span className="text-[11px] text-neuro-accent">Modifier →</span>
            </button>
          </PanelBlock>
          <InfoNote>Templates texte + image ou import MP4, WebM, MOV, JPG, PNG.</InfoNote>
        </>
      )}
    </div>
  );
}

interface IntroOutroPanelProps extends PanelProps {
  kind: "intro" | "outro";
  introState: UploadState;
  introError: string;
  outroState: UploadState;
  outroError: string;
  introImageState: UploadState;
  introImageError: string;
  outroImageState: UploadState;
  outroImageError: string;
  onIntro: (file?: File) => void;
  onOutro: (file?: File) => void;
  onIntroImage: (file?: File) => void;
  onOutroImage: (file?: File) => void;
}

export function IntroOutroPanel(props: IntroOutroPanelProps) {
  const isIntro = props.kind === "intro";
  return (
    <PresentationEditor
      kind={props.kind}
      draft={props.draft}
      updateFields={props.updateFields}
      uploadState={isIntro ? props.introState : props.outroState}
      uploadError={isIntro ? props.introError : props.outroError}
      imageState={isIntro ? props.introImageState : props.outroImageState}
      imageError={isIntro ? props.introImageError : props.outroImageError}
      onUpload={isIntro ? props.onIntro : props.onOutro}
      onImageUpload={isIntro ? props.onIntroImage : props.onOutroImage}
    />
  );
}

export function hubSummaries(draft: AppSettings) {
  return {
    identity: `${draft.eventName}${draft.logoUrl ? " · Logo" : ""}`,
    capture: `${fmtDuration(draft.duration)} · ${draft.countdownSeconds === 0 ? "Sans countdown" : `${draft.countdownSeconds}s`} · ${draft.resolution}${draft.recordAudio ? " · Mic" : ""}`,
    email: draft.emailCaptureEnabled
      ? (draft.emailSendEnabled ? "Collecte + envoi auto" : "Collecte active")
      : "Désactivé",
    motor: draft.motorEnabled
      ? `ON · ${draft.motorSpeed}% · ${draft.motorDirection === "CW" ? "Horaire" : "Anti-H."}`
      : "Désactivé",
    kiosk: draft.kioskEnabled ? `Actif · PIN ${"•".repeat(Math.min(draft.adminPin.length, 4))}` : "Désactivé",
    jingle: draft.jingleEnabled
      ? `${draft.introMode === "template" ? draft.introTitle || "Intro" : "Intro média"} · ${draft.outroMode === "template" ? draft.outroTitle || "Outro" : "Outro média"}`
      : "Désactivé",
    music: draft.backgroundMusicEnabled
      ? (draft.backgroundMusicDefault === "none"
        ? "Activé · sans défaut"
        : `Activé · ${BACKGROUND_TRACKS.find((t) => t.id === draft.backgroundMusicDefault)?.label ?? "Piste"}`)
      : "Désactivé",
  };
}
