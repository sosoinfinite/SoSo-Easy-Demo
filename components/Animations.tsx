
import React from 'react';
import { motion } from 'framer-motion';

export const Waveform: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return <div className="h-16 w-full" />;

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full px-10">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]"
          animate={{
            height: [10, 50, 15, 40, 10],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export const FloatingParticle: React.FC<{ id: string; x: number; type: 'money' | 'zzz'; onComplete: () => void }> = ({ id, x, type, onComplete }) => {
  const content = type === 'money' ? '$' : 'z';
  const color = type === 'money' ? 'text-amber-400' : 'text-sky-300';
  const fontSize = type === 'money' ? 'text-5xl' : 'text-4xl';
  
  // High variance for "explosion" feel
  const duration = 2.5 + Math.random() * 2;
  const driftX = (Math.random() - 0.5) * 400; // Wider explosion
  const rotation = (Math.random() - 0.5) * 720; // Multiple spins

  return (
    <motion.div
      key={id}
      initial={{ y: 0, opacity: 0, scale: 0, rotate: 0, x: 0 }}
      animate={{ 
        y: -window.innerHeight - 200, 
        x: driftX,
        opacity: [0, 1, 1, 0], 
        scale: [0.5, 2, 2.5, 1],
        rotate: [0, rotation]
      }}
      transition={{ 
        duration: duration, 
        ease: "easeOut" 
      }}
      onAnimationComplete={onComplete}
      className={`absolute pointer-events-none font-black z-[60] select-none ${color} ${fontSize} drop-shadow-[0_0_15px_rgba(0,0,0,0.3)]`}
      style={{ left: `${x}%`, bottom: '40%' }}
    >
      {content}
    </motion.div>
  );
};
