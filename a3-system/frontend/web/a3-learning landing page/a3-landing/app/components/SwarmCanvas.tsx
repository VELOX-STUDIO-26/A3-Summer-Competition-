"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulse: number;
  pulseDir: number;
}

interface SwarmCanvasProps {
  className?: string;
  particleCount?: number;
  dark?: boolean;
  exclusionZone?: { left: number; right: number; top: number; bottom: number }; // 0-1 relative values
}

const AGENT_COLORS = [
  "#9B59B6", "#E67E22", "#1ABC9C", "#E74C3C", "#34495E",
  "#7C9A6B", "#3498DB", "#F39C12", "#2ECC71", "#8E44AD", "#16A085",
];

export default function SwarmCanvas({
  className = "",
  particleCount = 40,
  dark = false,
  exclusionZone,
}: SwarmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const isInExclusionZone = (x: number, y: number) => {
      if (!exclusionZone) return false;
      const rect = canvas.getBoundingClientRect();
      // Convert relative values (0-1) to pixel values
      const left = exclusionZone.left * rect.width;
      const right = exclusionZone.right * rect.width;
      const top = exclusionZone.top * rect.height;
      const bottom = exclusionZone.bottom * rect.height;
      return (
        x >= left &&
        x <= right &&
        y >= top &&
        y <= bottom
      );
    };

    const initParticles = () => {
      const rect = canvas.getBoundingClientRect();
      particles = [];
      let attempts = 0;
      while (particles.length < particleCount && attempts < particleCount * 10) {
        attempts++;
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;

        // Skip particles in exclusion zone
        if (isInExclusionZone(x, y)) continue;

        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 2,
          color: AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)],
          pulse: Math.random() * Math.PI * 2,
          pulseDir: 1,
        });
      }
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > rect.width) p.vx *= -1;
        if (p.y < 0 || p.y > rect.height) p.vy *= -1;

        // Keep particles out of exclusion zone
        if (isInExclusionZone(p.x, p.y)) {
          // Push particle away from exclusion zone center
          const rect = canvas.getBoundingClientRect();
          const zoneCenterX = ((exclusionZone!.left + exclusionZone!.right) / 2) * rect.width;
          const zoneCenterY = ((exclusionZone!.top + exclusionZone!.bottom) / 2) * rect.height;
          const dx = p.x - zoneCenterX;
          const dy = p.y - zoneCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            p.vx += (dx / dist) * 0.5;
            p.vy += (dy / dist) * 0.5;
          }
        }

        // Mouse repulsion
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.vx += (dx / dist) * force * 0.5;
          p.vy += (dy / dist) * force * 0.5;
        }

        // Dampen velocity
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Pulse
        p.pulse += 0.02 * p.pulseDir;
        if (p.pulse > Math.PI * 2) p.pulseDir = -1;
        if (p.pulse < 0) p.pulseDir = 1;

        const glow = Math.sin(p.pulse) * 0.3 + 0.7;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = glow;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        gradient.addColorStop(0, p.color + "40");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.3;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = dark
              ? `rgba(255,255,255,${opacity})`
              : `rgba(26,29,31,${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resize();
    initParticles();
    animate();

    window.addEventListener("resize", () => {
      resize();
      initParticles();
    });
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [particleCount, dark, exclusionZone]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
    />
  );
}
