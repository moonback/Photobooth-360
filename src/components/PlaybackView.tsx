import { Camera } from "lucide-react";

interface PlaybackViewProps {
  videoUrl: string;
  eventName: string;
}

export default function PlaybackView({ videoUrl, eventName }: PlaybackViewProps) {
  return (
    <div className="relative w-full h-full bg-black">
      <video
        key={videoUrl}
        src={videoUrl}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Watermark — above controls area */}
      <div className="absolute bottom-20 left-5 z-20 flex items-center gap-2 pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-lg">
          <Camera className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold tracking-widest text-base drop-shadow-lg opacity-80 mix-blend-overlay">
          {eventName}
        </span>
      </div>
    </div>
  );
}
