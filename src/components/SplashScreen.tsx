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
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    
    // Generate initial 3D particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 2,
        color: i % 4 === 0 ? 'rgba(99, 102, 241, 0.7)' : 
               i % 4 === 1 ? 'rgba(168, 85, 247, 0.6)' : 
               i % 4 === 2 ? 'rgba(251, 191, 36, 0.5)' : 
               'rgba(236, 72, 153, 0.5)',
        duration: Math.random() * 5 + 2,
        delay: Math.random() * 2,
        depth: Math.random() * 100,
        type: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'spark' : 'dot',
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-neuro-text safe-top safe-bottom cursor-pointer"
      style={{ 
        background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)",
        perspective: 1200 
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 80%, rgba(168,85,247,0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 40% 20%, rgba(251,191,36,0.12) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 50%)"
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
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
              boxShadow: particle.type === "dot" ? `0 0 ${particle.size * 3}px ${particle.color}` : "none",
              zIndex: Math.floor(particle.depth),
            }}
            animate={{
              y: [0, -50 - particle.depth * 0.4, 0],
              x: [0, 20, -15, 0],
              opacity: [0.15, 0.9, 0.15],
              scale: [1, 1.8, 1],
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
          className="absolute left-1/2 top-[24%] h-72 w-72 -translate-x-1/2 rounded-full"
          style={{ 
            background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
            filter: "blur(40px)"
          }}
          animate={{ 
            scale: [1, 1.4, 1], 
            opacity: [0.25, 0.6, 0.25],
            rotateY: [0, 90, 180, 270, 360],
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
        <motion.div
          className="absolute bottom-[18%] right-[-4rem] h-60 w-60 rounded-full"
          style={{ 
            background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)",
            filter: "blur(35px)"
          }}
          animate={{ 
            y: [0, -35, 0], 
            x: [0, 20, 0], 
            opacity: [0.2, 0.5, 0.2],
            rotateX: [0, 180, 360],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* 3D content container */}
      <motion.div
        className="relative z-10 flex w-full max-w-[400px] flex-col items-center text-center"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ y: 40, opacity: 0, filter: "blur(20px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Floating 3D logo */}
        <motion.div
          className="mb-8 relative"
          animate={{ 
            y: [0, -15, 0],
            rotateY: [0, 12, -12, 0],
            rotateZ: [0, 2, -2, 0],
          }}
          transition={{ 
            duration: 4.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          {/* Glow layers */}
          <motion.div
            className="absolute -inset-6 rounded-[2rem] opacity-50"
            style={{ 
              background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 60%)",
              filter: "blur(20px)"
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-neuro-accent via-neuro-violet via-neuro-amber to-neuro-accent opacity-50"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              backgroundSize: ["200% 200%", "200% 200%"],
              rotateZ: [0, 360],
            }}
            transition={{
              backgroundPosition: { duration: 4, repeat: Infinity, ease: "linear" },
              rotateZ: { duration: 12, repeat: Infinity, ease: "linear" },
            }}
          />
          <motion.div
            className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/20 bg-black/60 backdrop-blur-3xl"
            animate={{
              rotateX: [0, 6, -6, 0],
              rotateY: [0, 12, -12, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo de l'événement" className="max-h-24 max-w-24 rounded-2xl object-contain" />
            ) : (
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-neuro-accent to-neuro-violet"
                animate={{
                  scale: [1, 1.08, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="h-12 w-12 text-white" />
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Event name with 3D effect */}
        <motion.h1
          className="text-[36px] font-black leading-[1.02] tracking-[-0.06em] text-white sm:text-[48px]"
          style={{ 
            textShadow: "0 6px 30px rgba(99,102,241,0.5), 0 0 60px rgba(168,85,247,0.3)" 
          }}
          initial={{ y: 20, opacity: 0, z: -60 }}
          animate={{ y: 0, opacity: 1, z: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
        >
          {settings.eventName}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-4 text-white/70 text-lg font-medium"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          Créez des souvenirs inoubliables !
        </motion.p>

        {/* 3D CTA button */}
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleClick(e); }}
          className="mt-12 min-h-18 w-full rounded-full bg-gradient-to-r from-white to-zinc-100 px-10 py-5 text-[18px] font-black text-black shadow-[0_15px_60px_rgba(255,255,255,0.35)] relative overflow-hidden group"
          whileTap={{ scale: 0.92, rotateX: 8 }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: "0 20px 80px rgba(99,102,241,0.7)",
            rotateX: -8,
          }}
          style={{ transformStyle: "preserve-3d" }}
          aria-label="Touchez pour commencer"
        >
          <span className="relative z-10 flex items-center justify-center gap-4">
            Commencer l'expérience
            <Play className="w-6 h-6" fill="black" />
          </span>
          
          {/* Animated shine */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 -translate-x-full"
            animate={{
              translateX: ["-200%", "200%"],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          
          {/* 3D button depth */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-300 to-white opacity-0 group-hover:opacity-100"
            transition={{ duration: 0.25 }}
          />
        </motion.button>

        {/* Feature icons */}
        <motion.div
          className="mt-10 flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.75 }}
        >
          {[Camera, Zap, Gift].map((Icon, i) => (
            <motion.div
              key={i}
              className="flex items-center justify-center h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15"
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2.5,
                delay: i * 0.15,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Icon className="h-7 w-7 text-white" />
            </motion.div>
          ))}
        </motion.div>

        {/* 3D floating indicator dots */}
        <div className="mt-10 flex items-center gap-5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-4 w-4 rounded-full"
              style={{
                backgroundColor: i === 0 ? "#6366f1" : i === 1 ? "#a855f7" : "#fbbf24",
                boxShadow: `0 0 30px ${i === 0 ? "#6366f1" : i === 1 ? "#a855f7" : "#fbbf24"}`,
              }}
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.4, 1, 0.4],
                y: [0, -15 + i * 8, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
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
            className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
