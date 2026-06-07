import { useRef, type ReactNode } from "react";
import { Film, Image, Upload, Video } from "lucide-react";
import { PRESENTATION_BACKGROUNDS, PRESENTATION_TEMPLATES } from "../../lib/presentationTemplates";
import type { AppSettings } from "./types";
import { FieldInput, SectionLabel } from "./ui";

export type UploadState = "idle" | "uploading" | "done" | "error";

interface PresentationEditorProps {
  kind: "intro" | "outro";
  draft: AppSettings;
  updateFields: (changes: Partial<AppSettings>) => void;
  uploadState: UploadState;
  uploadError: string;
  imageState: UploadState;
  imageError: string;
  onUpload: (file?: File) => void;
  onImageUpload: (file?: File) => void;
}

export function PresentationEditor({
  kind, draft, updateFields, uploadState, uploadError, imageState, imageError, onUpload, onImageUpload,
}: PresentationEditorProps) {
  const isIntro = kind === "intro";
  const mode = isIntro ? draft.introMode : draft.outroMode;
  const title = isIntro ? draft.introTitle : draft.outroTitle;
  const subtitle = isIntro ? draft.introSubtitle : draft.outroSubtitle;
  const imageUrl = isIntro ? draft.introImageUrl : draft.outroImageUrl;
  const template = isIntro ? draft.introTemplate : draft.outroTemplate;
  const background = isIntro ? draft.introBackground : draft.outroBackground;
  const duration = isIntro ? draft.introDurationSeconds : draft.outroDurationSeconds;
  const url = isIntro ? draft.introUrl : draft.outroUrl;
  const label = isIntro ? "Intro" : "Outro";
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const set = (changes: Partial<AppSettings>) => updateFields(changes);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <ModeBtn active={mode === "template"} onClick={() => set(isIntro ? { introMode: "template" } : { outroMode: "template" })} label="Texte" />
        <ModeBtn active={mode === "upload"} onClick={() => set(isIntro ? { introMode: "upload" } : { outroMode: "upload" })} label="Média" />
      </div>

      {mode === "template" ? (
        <>
          <PreviewCard label={label} title={title} subtitle={subtitle} imageUrl={imageUrl} background={background} />

          <div>
            <SectionLabel>Titre</SectionLabel>
            <FieldInput
              value={title}
              onChange={(v) => set(isIntro ? { introTitle: v } : { outroTitle: v })}
              placeholder="Titre"
            />
          </div>
          <div>
            <SectionLabel>Sous-titre</SectionLabel>
            <textarea
              value={subtitle}
              onChange={(e) => set(isIntro ? { introSubtitle: e.target.value } : { outroSubtitle: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[16px] text-white placeholder:text-neuro-muted/50 transition-colors focus:border-neuro-accent/50 focus:outline-none sm:text-[13px]"
              placeholder="Sous-titre"
            />
          </div>

          <div>
            <SectionLabel>Image</SectionLabel>
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
                {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <Image className="h-4 w-4 text-neuro-muted" />}
              </div>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => onImageUpload(e.target.files?.[0])} />
              <button type="button" onClick={() => imageRef.current?.click()} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white text-[12px] font-bold text-black touch-manipulation">
                <Upload className="h-3 w-3" />{imageState === "uploading" ? "…" : "Importer"}
              </button>
              <button type="button" disabled={!imageUrl} onClick={() => set(isIntro ? { introImageUrl: "" } : { outroImageUrl: "" })} className="h-9 rounded-lg border border-white/10 px-3 text-[12px] font-bold text-neuro-muted disabled:opacity-40">
                ✕
              </button>
            </div>
            {imageError && <p className="mt-1 text-[10px] text-red-400">{imageError}</p>}
          </div>

          <div>
            <SectionLabel>Style</SectionLabel>
            <div className="grid grid-cols-3 gap-1">
              {PRESENTATION_TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => set(isIntro ? { introTemplate: item.id } : { outroTemplate: item.id })}
                  className={`min-h-11 rounded-lg border px-1.5 py-1.5 text-left touch-manipulation ${template === item.id ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}
                  aria-pressed={template === item.id}
                >
                  <span className="block text-[11px] font-bold leading-none">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Fond</SectionLabel>
            <div className="grid grid-cols-4 gap-1">
              {PRESENTATION_BACKGROUNDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => set(isIntro ? { introBackground: item.id } : { outroBackground: item.id })}
                  className={`rounded-lg border p-1 touch-manipulation ${background === item.id ? "border-white" : "border-white/10"}`}
                  aria-label={item.name}
                  aria-pressed={background === item.id}
                >
                  <span className="block h-6 rounded-md" style={{ background: `linear-gradient(135deg, ${item.colors.join(", ")})` }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Durée — {duration}s</SectionLabel>
            <input
              type="range" min={1} max={8} step={1} value={duration}
              onChange={(e) => set(isIntro ? { introDurationSeconds: Number(e.target.value) } : { outroDurationSeconds: Number(e.target.value) })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500"
            />
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {url ? (
              url.match(/\.(mp4|webm|mov)$/i) ? <Video className="h-4 w-4 text-neuro-accent" /> : <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Film className="h-4 w-4 text-neuro-muted" />
            )}
          </div>
          <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white text-[12px] font-bold text-black touch-manipulation">
            <Upload className="h-3 w-3" />{uploadState === "uploading" ? "Import…" : `Importer ${label.toLowerCase()}`}
          </button>
        </div>
      )}
      {uploadError && <p className="text-[10px] text-red-400">{uploadError}</p>}
    </div>
  );
}

function ModeBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[2.25rem] rounded-lg border text-[12px] font-bold touch-manipulation ${active ? "border-neuro-accent bg-neuro-accent/15 text-white" : "border-white/10 bg-white/5 text-neuro-muted"}`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function PreviewCard({ label, title, subtitle, imageUrl, background }: { label: string; title: string; subtitle: string; imageUrl?: string; background: string }) {
  const bg = PRESENTATION_BACKGROUNDS.find((item) => item.id === background);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div
        className="relative flex min-h-20 flex-col justify-center p-3 text-white"
        style={{ background: `radial-gradient(circle at 50% 20%, ${bg?.colors[1]}55, transparent 55%), linear-gradient(135deg, ${bg?.colors.join(", ")})` }}
      >
        {imageUrl && <img src={imageUrl} alt="" className="mb-2 h-10 w-10 rounded-lg border border-white/20 object-cover" />}
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">{label}</p>
        <p className="mt-1 text-[16px] font-black leading-none">{title || label}</p>
        <p className="mt-1 text-[11px] text-white/70">{subtitle || "Votre message"}</p>
      </div>
    </div>
  );
}
