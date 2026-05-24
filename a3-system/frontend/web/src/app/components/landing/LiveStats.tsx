"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Ticket, TrendingUp } from "lucide-react";

export default function LiveStats() {
  const [stats, setStats] = useState({
    waitlist: 2547,
    betaSlots: 500,
    pathsGenerated: 15234,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        waitlist: prev.waitlist + Math.floor(Math.random() * 3),
        betaSlots: prev.betaSlots,
        pathsGenerated: prev.pathsGenerated + Math.floor(Math.random() * 8),
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const statItems = [
    {
      icon: Users,
      value: stats.waitlist.toLocaleString() + "+",
      label: "on waitlist",
      highlight: false,
    },
    {
      icon: Ticket,
      value: stats.betaSlots.toString(),
      label: "beta slots left",
      highlight: true,
    },
    {
      icon: TrendingUp,
      value: stats.pathsGenerated.toLocaleString() + "+",
      label: "paths generated",
      highlight: false,
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
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                stat.highlight ? "bg-amber-400/20" : "bg-sage-400/10"
              }`}>
                <stat.icon className={`w-3.5 h-3.5 ${
                  stat.highlight ? "text-amber-500" : "text-sage-500"
                }`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-sm sm:text-base font-semibold tabular-nums ${
                  stat.highlight ? "text-amber-600" : "text-deep-charcoal"
                }`}>
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
