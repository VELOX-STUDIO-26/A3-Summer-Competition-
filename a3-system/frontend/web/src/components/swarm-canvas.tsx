"use client";

import { useRef, useEffect } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
  agentType: string;
}

interface DataPacket {
  x: number;
  y: number;
  tx: number;
  ty: number;
  progress: number;
  speed: number;
  color: string;
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "#7C9A6B",
  tutor: "#3498DB",
  planner: "#F39C12",
  faithful: "#2ECC71",
  moderator: "#E74C3C",
  evaluator: "#9B59B6",
  grader: "#1ABC9C",
  recommender: "#E67E22",
  vision: "#8E44AD",
  voice: "#16A085",
  content: "#9B59B6",
  mindmap: "#E67E22",
  quiz: "#1ABC9C",
  media: "#E74C3C",
  code: "#34495E",
};

export function SwarmCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const packetsRef = useRef<DataPacket[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles (50 agents)
    const agents = Object.keys(AGENT_COLORS);
    particlesRef.current = Array.from({ length: 50 }, () => {
      const agentType = agents[Math.floor(Math.random() * agents.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1.5,
        color: AGENT_COLORS[agentType],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        agentType,
      };
    });

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    let lastTime = 0;
    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 2);
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update and draw particles
      particles.forEach((p) => {
        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150 * 0.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Apply velocity
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        p.x = Math.max(0, Math.min(canvas.width, p.x));
        p.y = Math.max(0, Math.min(canvas.height, p.y));

        // Pulse
        p.pulsePhase += p.pulseSpeed * dt;
        const pulse = Math.sin(p.pulsePhase) * 0.3 + 0.7;

        // Draw glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glow.addColorStop(0, p.color + "40");
        glow.addColorStop(1, p.color + "00");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const opacity = (1 - dist / 150) * 0.2;
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Randomly spawn data packet
            if (Math.random() < 0.0005 * dt) {
              packetsRef.current.push({
                x: p1.x,
                y: p1.y,
                tx: p2.x,
                ty: p2.y,
                progress: 0,
                speed: 0.02 + Math.random() * 0.02,
                color: p1.color,
              });
            }
          }
        }
      }

      // Draw and update data packets
      packetsRef.current = packetsRef.current.filter((pkt) => {
        pkt.progress += pkt.speed * dt;
        if (pkt.progress >= 1) return false;

        const x = pkt.x + (pkt.tx - pkt.x) * pkt.progress;
        const y = pkt.y + (pkt.ty - pkt.y) * pkt.progress;
        const opacity = Math.sin(pkt.progress * Math.PI) * 0.8;

        ctx.fillStyle = pkt.color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
