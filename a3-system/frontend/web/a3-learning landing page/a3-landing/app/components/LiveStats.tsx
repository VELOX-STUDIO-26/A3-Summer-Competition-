"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Route, Workflow } from "lucide-react";

export default function LiveStats() {
  const [stats, setStats] = useState({
    learners: 3334,
    paths: 15292,
    collaborations: 89412,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        learners: prev.learners + Math.floor(Math.random() * 5),
        paths: prev.paths + Math.floor(Math.random() * 10),
        collaborations: prev.collaborations + Math.floor(Math.random() * 20),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const statItems = [
    {
      icon: Users,
      value: stats.learners.toLocaleString(),
      label: "learners online",
    },
    {
      icon: Route,
      value: stats.paths.toLocaleString(),
      label: "paths today",
    },
    {
      icon: Workflow,
      value: stats.collaborations.toLocaleString(),
      label: "collaborations",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center px-4"
    >
      {/* Glassmorphic pill container */}
      <div className="glass-premium rounded-2xl md:rounded-full px-4 sm:px-6 md:px-8 py-3 md:py-4 border border-white/50 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-8">
          {statItems.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sage-400/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-3.5 h-3.5 text-sage-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm sm:text-base font-semibold text-deep-charcoal tabular-nums">
                  {stat.value}
                </span>
                <span className="text-xs text-deep-charcoal/50 whitespace-nowrap">{stat.label}</span>
              </div>
              {i < statItems.length - 1 && (
                <div className="hidden md:block w-px h-5 bg-sage-200 ml-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
