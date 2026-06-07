import { useEffect, useState, useRef } from "react";
import { Sparkles, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppSettings } from "./SettingsModal";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

interface SplashScreenProps {
  settings: AppSettings;
  onEnter: () => void;
}

export default function SplashScreen({ settings, onEnter }: SplashScreenProps) {
  const [visible, setVisible] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    
    // Generate initial particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        color: i % 2 === 0 ? 'rgba(99, 102, 241, 0.6)' : 'rgba(168, 85, 247, 0.5)',
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2,
      });
    }
    setParticles(newParticles);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>) => {
    setClicked(true);
    setTimeout(() => {
      onEnter();
    }, 400);
  };

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden premium-gradient px-6 text-neuro-text safe-top safe-bottom"
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {/* Animated particles background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 10, -5, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
        
        {/* Main blobs */}
        <motion.div
          className="absolute left-1/2 top-[24%] h-60 w-60 -translate-x-1/2 rounded-full bg-neuro-accent/22 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.32, 0.7, 0.32] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[18%] right-[-5rem] h-52 w-52 rounded-full bg-neuro-violet/18 blur-3xl"
          animate={{ y: [0, -25, 0], x: [0, 10, 0], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/35 to-transparent" />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex w-full max-w-[350px] flex-col items-center text-center"
        initial={{ y: 25, opacity: 0, filter: "blur(12px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo with animated gradient border */}
        <motion.div
          className="mb-6 relative"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute -inset-2 rounded-[1.85rem] bg-gradient-to-r from-neuro-accent via-neuro-violet to-neuro-accent opacity-70"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              backgroundSize: ["200% 200%", "200% 200%"],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.65rem] border border-white/10 bg-black/40 backdrop-blur-xl">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo de l'événement" className="max-h-18 max-w-18 rounded-2xl object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-neuro-accent to-neuro-violet">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Event name with staggered animation */}
        <motion.h1
          className="text-[30px] font-black leading-[1.02] tracking-[-0.05em] text-white drop-shadow-2xl sm:text-[38px]"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          {settings.eventName}
        </motion.h1>

        {/* CTA button with cool effects */}
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleClick(e); }}
          className="mt-8 min-h-13 w-full rounded-full bg-white px-5 py-3.5 text-[15px] font-bold text-black shadow-[0_0_34px_rgba(255,255,255,0.24)] relative overflow-hidden"
          whileTap={{ scale: 0.95 }}
          whileHover={{ 
            scale: 1.03,
            boxShadow: "0 0 60px rgba(99, 102, 241, 0.5)",
          }}
          aria-label="Touchez pour commencer"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Touchez pour commencer
            <Play className="w-4 h-4" fill="black" />
          </span>
          
          {/* Button gradient shine */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 -translate-x-full"
            animate={{
              translateX: ["-200%", "200%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.button>

        {/* Pulsing indicator dots */}
        <div className="mt-6 flex items-center gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-neuro-accent"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Exit animation overlay */}
      <AnimatePresence>
        {clicked && (
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
