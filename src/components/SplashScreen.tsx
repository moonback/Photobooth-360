import { useEffect, useState, useRef } from "react";
import { Sparkles, Play, Camera } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "motion/react";
import { AppSettings } from "./SettingsModal";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  depth: number;
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

  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    
    // Generate initial 3D particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 2,
        color: i % 3 === 0 ? 'rgba(99, 102, 241, 0.6)' : i % 3 === 1 ? 'rgba(168, 85, 247, 0.5)' : 'rgba(251, 191, 36, 0.4)',
        duration: Math.random() * 4 + 2,
        delay: Math.random() * 2,
        depth: Math.random() * 100,
      });
    }
    setParticles(newParticles);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left) / rect.width - 0.5;
    const newY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(newX);
    y.set(newY);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>) => {
    setClicked(true);
    setTimeout(() => {
      onEnter();
    }, 400);
  };

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden premium-gradient px-6 text-neuro-text safe-top safe-bottom cursor-pointer"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      style={{ perspective: 1000 }}
    >
      {/* Animated 3D particles background */}
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
              boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
              zIndex: Math.floor(particle.depth),
            }}
            animate={{
              y: [0, -40 - particle.depth * 0.3, 0],
              x: [0, 15, -10, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.6, 1],
              rotateY: [0, 180, 360],
              rotateX: [0, 90, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
        
        {/* Main 3D blobs */}
        <motion.div
          className="absolute left-1/2 top-[24%] h-60 w-60 -translate-x-1/2 rounded-full bg-neuro-accent/22 blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0.32, 0.7, 0.32],
            rotateY: [0, 90, 180, 270, 360],
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
        <motion.div
          className="absolute bottom-[18%] right-[-5rem] h-52 w-52 rounded-full bg-neuro-violet/18 blur-3xl"
          animate={{ 
            y: [0, -30, 0], 
            x: [0, 15, 0], 
            opacity: [0.25, 0.55, 0.25],
            rotateX: [0, 180, 360],
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/35 to-transparent" />
      </div>

      {/* 3D content container */}
      <motion.div
        className="relative z-10 flex w-full max-w-[350px] flex-col items-center text-center"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ y: 30, opacity: 0, filter: "blur(15px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Floating 3D logo */}
        <motion.div
          className="mb-6 relative"
          animate={{ 
            y: [0, -12, 0],
            rotateY: [0, 10, -10, 0],
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <motion.div
            className="absolute -inset-3 rounded-[1.85rem] bg-gradient-to-r from-neuro-accent via-neuro-violet via-neuro-amber to-neuro-accent opacity-60"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              backgroundSize: ["200% 200%", "200% 200%"],
              rotateZ: [0, 360],
            }}
            transition={{
              backgroundPosition: { duration: 4, repeat: Infinity, ease: "linear" },
              rotateZ: { duration: 10, repeat: Infinity, ease: "linear" },
            }}
          />
          <motion.div
            className="relative flex h-28 w-28 items-center justify-center rounded-[1.85rem] border border-white/15 bg-black/50 backdrop-blur-2xl"
            animate={{
              rotateX: [0, 5, -5, 0],
              rotateY: [0, 10, -10, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo de l'événement" className="max-h-20 max-w-20 rounded-2xl object-contain" />
            ) : (
              <motion.div
                className="flex h-18 w-18 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-neuro-accent to-neuro-violet"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Event name with 3D effect */}
        <motion.h1
          className="text-[32px] font-black leading-[1.02] tracking-[-0.05em] text-white drop-shadow-2xl sm:text-[42px]"
          style={{ textShadow: "0 4px 20px rgba(99,102,241,0.4)" }}
          initial={{ y: 15, opacity: 0, z: -50 }}
          animate={{ y: 0, opacity: 1, z: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        >
          {settings.eventName}
        </motion.h1>

        {/* 3D CTA button */}
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleClick(e); }}
          className="mt-10 min-h-16 w-full rounded-full bg-white px-8 py-4 text-[17px] font-black text-black shadow-[0_10px_40px_rgba(255,255,255,0.3)] relative overflow-hidden group"
          whileTap={{ scale: 0.93, rotateX: 5 }}
          whileHover={{ 
            scale: 1.04,
            boxShadow: "0 15px 60px rgba(99,102,241,0.6)",
            rotateX: -5,
          }}
          style={{ transformStyle: "preserve-3d" }}
          aria-label="Touchez pour commencer"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            Commencer
            <Play className="w-5 h-5" fill="black" />
          </span>
          
          {/* Animated shine */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 -translate-x-full"
            animate={{
              translateX: ["-200%", "200%"],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          
          {/* 3D button depth */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-200 to-white opacity-0 group-hover:opacity-100"
            transition={{ duration: 0.2 }}
          />
        </motion.button>

        {/* 3D floating indicator dots */}
        <div className="mt-8 flex items-center gap-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: i === 0 ? "#6366f1" : i === 1 ? "#a855f7" : "#fbbf24",
                boxShadow: `0 0 20px ${i === 0 ? "#6366f1" : i === 1 ? "#a855f7" : "#fbbf24"}`,
              }}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.5, 1, 0.5],
                y: [0, -10 + i * 5, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* 3D camera icon hint */}
        <motion.div
          className="mt-10 flex items-center gap-2 text-white/60 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Camera className="w-4 h-4" />
          <span>Prêt à capturer des moments incroyables !</span>
        </motion.div>
      </motion.div>

      {/* Exit animation overlay */}
      <AnimatePresence>
        {clicked && (
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-3xl"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
