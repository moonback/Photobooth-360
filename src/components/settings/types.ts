import type { MusicSelection } from "../../lib/backgroundMusic";
import type { TriggerSoundId } from "../../lib/triggerSounds";
import type { PresentationBackgroundId, PresentationTemplateId } from "../../lib/presentationTemplates";

export interface AppSettings {
  eventName: string;
  duration: number;
  facingMode: "user" | "environment";
  resolution: "720p" | "1080p" | "480p";
  countdownSeconds: number;
  accentColor: "indigo" | "rose" | "amber" | "emerald" | "cyan";
  recordAudio: boolean;
  logoUrl?: string;
  emailCaptureEnabled: boolean;
  emailSendEnabled: boolean;
  motorEnabled: boolean;
  motorSpeed: number;
  motorDirection: "CW" | "CCW";
  motorTurns: number;
  motorBackend: "serial" | "usb";
  motorAutoStart: boolean;
  motorSyncMode: "ack" | "delay" | "none";
  motorSyncDelay: number;
  kioskEnabled: boolean;
  adminPin: string;
  introUrl?: string;
  outroUrl?: string;
  jingleEnabled: boolean;
  introMode: "upload" | "template";
  outroMode: "upload" | "template";
  introTemplate: PresentationTemplateId;
  outroTemplate: PresentationTemplateId;
  introTitle: string;
  introSubtitle: string;
  introImageUrl?: string;
  outroTitle: string;
  outroSubtitle: string;
  outroImageUrl?: string;
  introBackground: PresentationBackgroundId;
  outroBackground: PresentationBackgroundId;
  introDurationSeconds: number;
  outroDurationSeconds: number;
  backgroundMusicEnabled: boolean;
  backgroundMusicDefault: MusicSelection;
  backgroundMusicVolume: number;
  appBackground: PresentationBackgroundId;
  appBackgroundUrl?: string;
  triggerSoundEnabled: boolean;
  triggerSound: TriggerSoundId;
  triggerSoundVolume: number;
  triggerSoundUrl?: string;
  slowMotionEnabled: boolean;
  slowMotionSpeed: 0.5 | 0.25;
}

export const DEFAULT_SETTINGS: AppSettings = {
  eventName: "NEUROBOOTH",
  duration: 15000,
  facingMode: "user",
  resolution: "720p",
  countdownSeconds: 3,
  accentColor: "indigo",
  recordAudio: false,
  logoUrl: "",
  emailCaptureEnabled: true,
  emailSendEnabled: true,
  motorEnabled: false,
  motorSpeed: 50,
  motorDirection: "CW",
  motorTurns: 1,
  motorBackend: "serial",
  motorAutoStart: true,
  motorSyncMode: "ack",
  motorSyncDelay: 500,
  kioskEnabled: true,
  adminPin: "1234",
  jingleEnabled: false,
  introUrl: "",
  outroUrl: "",
  introMode: "template",
  outroMode: "template",
  introTemplate: "spotlight",
  outroTemplate: "gradient",
  introTitle: "Bienvenue",
  introSubtitle: "Préparez-vous pour votre expérience 360°",
  introImageUrl: "",
  outroTitle: "Merci !",
  outroSubtitle: "Scannez, partagez et revivez votre moment",
  outroImageUrl: "",
  introBackground: "midnight",
  outroBackground: "violet",
  introDurationSeconds: 3,
  outroDurationSeconds: 3,
  backgroundMusicEnabled: false,
  backgroundMusicDefault: "none",
  backgroundMusicVolume: 35,
  appBackground: "midnight",
  appBackgroundUrl: "",
  triggerSoundEnabled: true,
  triggerSound: "beep",
  triggerSoundVolume: 70,
  triggerSoundUrl: "",
  slowMotionEnabled: true,
  slowMotionSpeed: 0.5,
};

export const ACCENT_COLORS: { value: AppSettings["accentColor"]; label: string; bg: string }[] = [
  { value: "indigo", label: "Indigo", bg: "bg-indigo-500" },
  { value: "rose", label: "Rose", bg: "bg-rose-500" },
  { value: "amber", label: "Ambre", bg: "bg-amber-500" },
  { value: "emerald", label: "Émeraude", bg: "bg-emerald-500" },
  { value: "cyan", label: "Cyan", bg: "bg-cyan-500" },
];

export const DURATIONS = [10000, 15000, 30000, 60000, 120000];
export const COUNTDOWNS = [0, 3, 5, 10];
export const RESOLUTIONS: { value: AppSettings["resolution"]; label: string; sub: string }[] = [
  { value: "480p", label: "480p", sub: "SD" },
  { value: "720p", label: "720p", sub: "HD" },
  { value: "1080p", label: "1080p", sub: "FHD" },
];

export function fmtDuration(ms: number) {
  return ms >= 60000 ? `${ms / 60000}min` : `${ms / 1000}s`;
}

export type SettingsPanel =
  | "hub"
  | "identity"
  | "capture"
  | "email"
  | "motor"
  | "kiosk"
  | "jingle"
  | "music"
  | "trigger-sound"
  | "intro"
  | "outro";
