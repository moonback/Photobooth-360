import { RefObject } from "react";
import { Camera } from "lucide-react";

interface CameraViewProps {
  liveVideoRef: RefObject<HTMLVideoElement>;
  isRecording: boolean;
  countdown: number | null;
  showFlash: boolean;
  eventName: string;
  hidden: boolean;
}

export default function CameraView({
  liveVideoRef,
  isRecording,
  countdown,
  showFlash,
  eventName,
  hidden,
}: CameraViewProps) {
  return (
    <div className={`relative w-full h-full ${hidden ? "hidden" : "block"}`}>
      <video
        ref={liveVideoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isRecording ? "opacity-100" : "opacity-95"
        }`}
      />

      {/* Recording ring */}
      {isRecording && (
        <div className="absolute inset-0 ring-4 ring-red-500 ring-inset rounded-none pointer-events-none" />
      )}

      {/* Watermark */}
      <div className="absolute bottom-6 left-5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-lg">
          <Camera className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold tracking-widest text-base drop-shadow-lg opacity-80 mix-blend-overlay">
          {eventName}
        </span>
      </div>

      {/* REC badge */}
      {isRecording && (
        <div className="absolute top-5 right-5 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/40 z-30">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-semibold tracking-widest uppercase">REC</span>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-40">
          <span className="text-[160px] font-black text-white drop-shadow-2xl leading-none animate-pulse">
            {countdown}
          </span>
        </div>
      )}

      {/* Flash */}
      {showFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-flash pointer-events-none" />
      )}
    </div>
  );
}
