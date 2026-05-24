"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

const COLORS = ["#7C9A6B", "#8E6BA8", "#4A90B8", "#D4854A", "#3AA89A", "#D4A03A", "#C75B5B"];

export default function Confetti({ trigger }: { trigger: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (trigger) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.3,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setPieces(newPieces);

      // Clear after animation
      const timer = setTimeout(() => setPieces([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{ 
                y: -20, 
                x: `${piece.x}vw`,
                opacity: 1,
                rotate: 0,
                scale: piece.scale
              }}
              animate={{ 
                y: "110vh",
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2.5 + Math.random(),
                delay: piece.delay,
                ease: [0.23, 0.8, 0.32, 1]
              }}
              className="absolute"
              style={{ left: `${piece.x}%` }}
            >
              {Math.random() > 0.5 ? (
                // Circle
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: piece.color }}
                />
              ) : Math.random() > 0.5 ? (
                // Square
                <div 
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: piece.color }}
                />
              ) : (
                // Star
                <svg width="12" height="12" viewBox="0 0 12 12" fill={piece.color}>
                  <path d="M6 0l1.5 4.5L12 6l-4.5 1.5L6 12l-1.5-4.5L0 6l4.5-1.5z" />
                </svg>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
