"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e?: React.FormEvent) => void;
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
}

export default function MagneticButton({
  children,
  className,
  onClick,
  variant = "primary",
  disabled = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current!.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPosition({ x: x * 0.3, y: y * 0.3 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const variantStyles = {
    primary: "bg-sage-400 text-[#111111] font-bold hover:bg-sage-500",
    secondary: "bg-deep-charcoal text-white hover:bg-black",
    outline: "border-2 border-sage-400 text-sage-400 hover:bg-sage-400 hover:text-white",
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      className={cn(
        "px-6 py-3 rounded-full font-medium text-sm transition-colors duration-300 cursor-pointer",
        variantStyles[variant],
        disabled && "opacity-70 cursor-not-allowed",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
