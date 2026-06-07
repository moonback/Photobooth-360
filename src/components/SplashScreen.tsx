import { useEffect, useState, useRef } from "react";
import { Sparkles, Play, Camera, Zap, Star, Gift } from "lucide-react";
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
  type: "dot" | "star" | "spark";
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
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-8, 8]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    
    // Generate initial 3D particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 2,
        color: i % 3 === 0 ? 'rgba(99,102,241,0.6)' : 
               i % 3 === 1 ? 'rgba(168, 85, 247,0.5)' : 
               'rgba(251,191,36,0.4)',
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 3,
        depth: Math.random() * 100,
        type: i % 4 === 0 ? 'star' : i % 4 === 1 ? 'spark' : 'dot',
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
    }, 450);
  };

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-8 text-neuro-text safe-top safe-bottom cursor-pointer"
      style={{ 
        background: "linear-gradient(180deg, #0a0a1a 0%, #141428 50%, #0a0a1a 100%)",
        perspective: 1500 
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 30% 40%, rgba(99,102,241,0.12) 0%, transparent 60%)",
            "radial-gradient(circle at 70% 60%, rgba(168,85,247,0.10) 0%, transparent 60%)",
            "radial-gradient(circle at 50% 30%, rgba(251,191,36,0.08) 0%, transparent 60%)",
            "radial-gradient(circle at 30% 40%, rgba(99,102,241,0.12) 0%, transparent 60%)"
          ]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Animated 3D particles background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.type === "dot" ? particle.color : "transparent",
              boxShadow: particle.type === "dot" ? `0 0 ${particle.size * 2.5}px ${particle.color}` : "none",
              zIndex: Math.floor(particle.depth),
            }}
            animate={{
              y: [0, -40 - particle.depth * 0.3, 0],
              x: [0, 15, -10, 0],
              opacity: [0.1, 0.7, 0.1],
              scale: [1, 1.5, 1],
              rotateY: [0, 180, 360],
              rotateX: [0, 90, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          >
            {particle.type === "star" && <Star className="w-full h-full" style={{ color: particle.color }} />}
            {particle.type === "spark" && <Zap className="w-full h-full" style={{ color: particle.color }} />}
          </motion.div>
        ))}
        
        {/* Main 3D blobs */}
        <motion.div
          className="absolute left-1/2 top-[28%] h-80 w-80 -translate-x-1/2 rounded-full"
          style={{ 
            background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
            filter: "blur(45px)"
          }}
          animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0.2, 0.5, 0.2],
            rotateY: [0, 90, 180, 270, 360],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
        <motion.div
          className="absolute bottom-[20%] right-[-5rem] h-64 w-64 rounded-full"
          style={{ 
            background: "radial-gradient(circle, rgba(168,85,247,0.20) 0%, transparent 70%)",
            filter: "blur(40px)"
          }}
          animate={{ 
            y: [0, -30, 0], 
            x: [0, 18, 0], 
            opacity: [0.15, 0.4, 0.15],
            rotateX: [0, 180, 360],
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* 3D content container */}
      <motion.div
        className="relative z-10 flex w-full max-w-[450px] flex-col items-center text-center"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ y: 50, opacity: 0, filter: "blur(25px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Professional Floating 3D logo */}
        <motion.div
          className="mb-10 relative"
          animate={{ 
            y: [0, -12, 0],
            rotateY: [0, 8, -8, 0],
            rotateZ: [0, 1.5, -1.5, 0],
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          {/* Outer glow ring */}
          <motion.div
            className="absolute -inset-8 rounded-[2.5rem] opacity-60"
            style={{ 
              background: "conic-gradient(from 0deg, rgba(99,102,241,0.4), rgba(168,85,247,0.3), rgba(251,191,36,0.2), rgba(99,102,241,0.4))",
              filter: "blur(25px)"
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.25, 0.55, 0.25],
              rotate: [0, 360],
            }}
            transition={{
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            }}
          />
          
          {/* Middle glow layer */}
          <motion.div
            className="absolute -inset-5 rounded-[2.2rem] opacity-40"
            style={{ 
              background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
              filter: "blur(15px)"
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main logo container - Professional Glass Morphism */}
          <motion.div
            className="relative flex h-36 w-36 items-center justify-center rounded-[2.2rem] border border-white/25 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_60px_rgba(99,102,241,0.15)]"
            animate={{
              rotateX: [0, 4, -4, 0],
              rotateY: [0, 8, -8, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo de l'événement" 
                className="max-h-28 max-w-28 rounded-[1.5rem] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]" 
              />
            ) : (
              <motion.div
                className="flex h-24 w-24 items-center justify-center rounded-[1.8rem] bg-gradient-to-br from-neuro-accent via-neuro-violet to-neuro-accent shadow-[0_0_40px_rgba(99,102,241,0.5)]"
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 3, -3, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="h-14 w-14 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]" />
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Event name - Professional Typography */}
        <motion.h1
          className="text-[38px] font-bold leading-[1.05] tracking-[-0.04em] text-white sm:text-[50px]"
          style={{ 
            textShadow: "0 4px 20px rgba(99,102,241,0.4), 0 0 40px rgba(168,85,247,0.2)" 
          }}
          initial={{ y: 25, opacity: 0, z: -80 }}
          animate={{ y: 0, opacity: 1, z: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
        >
          {settings.eventName}
        </motion.h1>

        {/* Subtitle - Professional */}
        <motion.p
          className="mt-5 text-white/60 text-base font-normal max-w-[320px]"
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Capturez vos moments les plus précieux et créez des souvenirs qui dureront toujours.
        </motion.p>

        {/* Professional CTA button */}
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleClick(e); }}
          className="mt-14 min-h-[72px] w-full rounded-full bg-gradient-to-r from-white via-zinc-50 to-white px-12 py-5 text-[17px] font-bold text-black shadow-[0_10px_40px_rgba(255,255,255,0.25),0_0_80px_rgba(99,102,241,0.2)] relative overflow-hidden group"
          whileTap={{ scale: 0.94, rotateX: 6 }}
          whileHover={{ 
            scale: 1.03,
            boxShadow: "0 15px 60px rgba(255,255,255,0.35),0_0_120px_rgba(99,102,241,0.3)",
            rotateX: -6,
          }}
          style={{ transformStyle: "preserve-3d" }}
          aria-label="Touchez pour commencer"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            Commencer
            <Play className="w-5 h-5" fill="black" />
          </span>
          
          {/* Animated shine - Professional */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-10 -translate-x-full"
            animate={{
              translateX: ["-200%", "200%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          
          {/* Button depth - Professional */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-200/50 to-white/50 opacity-0 group-hover:opacity-100"
            transition={{ duration: 0.3 }}
          />
        </motion.button>

        {/* Feature icons - Professional */}
        <motion.div
          className="mt-12 flex items-center justify-center gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
        >
          {[
            { icon: Camera, label: "360°" },
            { icon: Zap, label: "Instantané" },
            { icon: Gift, label: "Partage" }
          ].map(({ icon: Icon, label }, i) => (
            <motion.div 
              key={i} 
              className="flex flex-col items-center gap-2"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 3,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-white/8 backdrop-blur-xl border border-white/12">
                <Icon className="h-8 w-8 text-white drop-shadow-[0_2px_6px_rgba(255,255,255,0.2)]" />
              </div>
              <span className="text-white/50 text-xs font-medium tracking-wider">{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Floating indicator dots - Professional */}
        <div className="mt-14 flex items-center gap-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: i === 0 ? "#6366f1" : i === 1 ? "#a855f7" : "#fbbf24",
                boxShadow: `0 0 20px ${i === 0 ? "#6366f1" : i === 1 ? "#a855f7" : "#fbbf24"}`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.35, 0.9, 0.35],
                y: [0, -12 + i * 6, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.35,
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
            className="absolute inset-0 bg-black/92 backdrop-blur-3xl"
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
