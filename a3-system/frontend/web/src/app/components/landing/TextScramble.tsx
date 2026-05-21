"use client";

import { useEffect, useState } from "react";

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

interface TextScrambleProps {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}

export default function TextScramble({
  text,
  className = "",
  duration = 1500,
  delay = 0,
}: TextScrambleProps) {
  const [display, setDisplay] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const totalFrames = Math.floor(duration / 16);
    const length = text.length;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const revealed = Math.floor(progress * length);

      let result = "";
      for (let i = 0; i < length; i++) {
        if (text[i] === " ") {
          result += " ";
        } else if (i < revealed) {
          result += text[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplay(result);

      if (frame >= totalFrames) {
        setDisplay(text);
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [started, text, duration]);

  return <span className={className}>{display || text.split("").map(() => " ").join("")}</span>;
}
