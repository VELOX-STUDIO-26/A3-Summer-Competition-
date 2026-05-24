"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Brain, GitBranch, Zap, BookOpen, Video, Map } from "lucide-react";

export default function ProductShowcase() {
  const [stage, setStage] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const userMessage = "I need to learn Python data structures for my exam in 2 weeks, but I hate reading long text.";
  const [displayedText, setDisplayedText] = useState("");

  // Typing animation for user message
  useEffect(() => {
    if (stage === 0 && displayedText.length < userMessage.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(userMessage.slice(0, displayedText.length + 1));
      }, 30);
      return () => clearTimeout(timeout);
    } else if (displayedText.length === userMessage.length && stage === 0) {
      setIsTyping(false);
      setTimeout(() => setStage(1), 800);
    }
  }, [displayedText, stage]);

  // Progress through stages
  useEffect(() => {
    if (stage === 1) {
      setTimeout(() => setStage(2), 1200);
    } else if (stage === 2) {
      setTimeout(() => setStage(3), 1500);
    } else if (stage === 3) {
      // Reset after showing full demo
      setTimeout(() => {
        setStage(0);
        setDisplayedText("");
        setIsTyping(true);
      }, 6000);
    }
  }, [stage]);

  return (
    <div className="relative h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-mono text-deep-charcoal/50 tracking-wider uppercase">
            Live Demo
          </span>
        </div>
        <span className="text-[10px] font-mono text-sage-500 bg-sage-400/10 px-2 py-0.5 rounded-full">
          Visual Learner Profile
        </span>
      </div>

      {/* User Input Chat Bubble */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">You</span>
          </div>
          <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 border border-white/60 shadow-sm">
            <p className="text-sm text-deep-charcoal leading-relaxed">
              {displayedText}
              {isTyping && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-0.5 h-4 bg-sage-500 ml-0.5 align-middle"
                />
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* AI Processing Indicator */}
      <AnimatePresence>
        {stage === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 mb-4 px-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="w-4 h-4 text-white" />
              </motion.div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-deep-charcoal/60">Analyzing your profile</span>
              <motion.div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-sage-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Resources Dashboard */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 space-y-3"
          >
            {/* Active Learning Path Header */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-sage-400/20 to-transparent rounded-xl px-4 py-2.5 border border-sage-400/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-sage-600" />
                  <span className="text-xs font-semibold text-deep-charcoal">Active Learning Path</span>
                </div>
                <span className="text-[10px] text-sage-600 font-medium">Data Structures</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[10px] text-deep-charcoal/60">Core Concept</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] text-deep-charcoal/60">Your Gap: Arrays</span>
                </div>
              </div>
            </motion.div>

            {/* Generating Resources Label */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 px-1"
            >
              <Zap className="w-3 h-3 text-sage-500" />
              <span className="text-[10px] text-deep-charcoal/50 uppercase tracking-wider font-medium">
                Generating resources for visual style
              </span>
            </motion.div>

            {/* Resource Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Video Summary Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="relative aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg mb-2 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:bg-sage-400 transition-colors"
                    >
                      <Play className="w-4 h-4 text-deep-charcoal group-hover:text-white ml-0.5" />
                    </motion.div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                    0:58
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Video className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-deep-charcoal">60s Video Summary</span>
                </div>
                <p className="text-[10px] text-deep-charcoal/50 mt-0.5">Arrays explained visually</p>
              </motion.div>

              {/* Interactive Mindmap Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-white/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="relative aspect-video bg-gradient-to-br from-sage-400/20 to-emerald-400/20 rounded-lg mb-2 overflow-hidden p-2">
                  {/* Mini mindmap visualization */}
                  <svg className="w-full h-full" viewBox="0 0 100 60">
                    <motion.circle
                      cx="50" cy="30" r="8"
                      fill="#7C9A6B"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7 }}
                    />
                    {/* Branches */}
                    {[
                      { x: 25, y: 15 },
                      { x: 75, y: 15 },
                      { x: 25, y: 45 },
                      { x: 75, y: 45 },
                    ].map((pos, i) => (
                      <motion.g key={i}>
                        <motion.line
                          x1="50" y1="30"
                          x2={pos.x} y2={pos.y}
                          stroke="#7C9A6B"
                          strokeWidth="1.5"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                        />
                        <motion.circle
                          cx={pos.x} cy={pos.y} r="5"
                          fill="#9BB88A"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.9 + i * 0.1 }}
                        />
                      </motion.g>
                    ))}
                  </svg>
                </div>
                <div className="flex items-center gap-1.5">
                  <Map className="w-3 h-3 text-sage-500" />
                  <span className="text-xs font-medium text-deep-charcoal">Interactive Mindmap</span>
                </div>
                <p className="text-[10px] text-deep-charcoal/50 mt-0.5">Explore connections</p>
              </motion.div>
            </div>

            {/* Progress Bar */}
            {stage >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/60"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-sage-600" />
                    <span className="text-xs font-medium text-deep-charcoal">Your 2-Week Path</span>
                  </div>
                  <span className="text-[10px] text-sage-600 font-semibold">12 modules</span>
                </div>
                <div className="h-2 bg-deep-charcoal/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sage-400 to-sage-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "15%" }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px] text-deep-charcoal/40">Getting Started</span>
                  <span className="text-[9px] text-deep-charcoal/40">Exam Ready</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
