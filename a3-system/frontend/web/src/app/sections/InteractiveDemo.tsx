"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Zap, Download, CheckCircle } from "lucide-react";
import ScrollReveal from "../components/landing/ScrollReveal";

const quickPrompts = [
  { icon: "🏛️", label: "Map the Roman Empire", prompt: "Create a learning path for understanding the rise and fall of the Roman Empire" },
  { icon: "⚛️", label: "Quantum via Python", prompt: "Explain quantum computing basics using Python code examples" },
  { icon: "💼", label: "Executive Micro-MBA", prompt: "Design a 6-week micro-MBA curriculum for busy executives" },
];

const agentSequence = [
  { id: "orchestrator", name: "Orchestrator", color: "#7C9A6B", duration: 800, status: "Delegating tasks...", icon: "🎯" },
  { id: "planner", name: "Path Planner", color: "#F39C12", duration: 1200, status: "Calculating prerequisites...", icon: "🗺️" },
  { id: "scholar", name: "Scholar", color: "#9B59B6", duration: 1000, status: "Compiling curriculum...", icon: "📚" },
  { id: "mapper", name: "Mapper", color: "#E67E22", duration: 800, status: "Building knowledge graph...", icon: "🔗" },
  { id: "sage", name: "Sage", color: "#1ABC9C", duration: 900, status: "Generating assessments...", icon: "❓" },
  { id: "faithful", name: "Faithful Checker", color: "#2ECC71", duration: 600, status: "Verifying accuracy...", icon: "✅" },
];

// Floating agents for idle state
const floatingAgents = [
  { id: 1, icon: "🎯", color: "#7C9A6B", name: "Orchestrator", x: 20, y: 25, delay: 0 },
  { id: 2, icon: "📚", color: "#9B59B6", name: "Scholar", x: 75, y: 20, delay: 0.5 },
  { id: 3, icon: "🗺️", color: "#F39C12", name: "Planner", x: 15, y: 70, delay: 1 },
  { id: 4, icon: "🔗", color: "#E67E22", name: "Mapper", x: 80, y: 65, delay: 1.5 },
  { id: 5, icon: "❓", color: "#1ABC9C", name: "Sage", x: 50, y: 15, delay: 0.3 },
  { id: 6, icon: "✅", color: "#2ECC71", name: "Checker", x: 45, y: 75, delay: 0.8 },
  { id: 7, icon: "🎬", color: "#E74C3C", name: "Director", x: 85, y: 40, delay: 1.2 },
  { id: 8, icon: "💻", color: "#34495E", name: "Architect", x: 10, y: 45, delay: 0.6 },
];

export default function InteractiveDemo() {
  const [input, setInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [logs, setLogs] = useState<{ agent: string; message: string; time: string }[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const startSimulation = (prompt: string) => {
    setInput(prompt);
    setIsSimulating(true);
    setCurrentAgent(0);
    setProgress(0);
    setIsComplete(false);
    setLogs([]);

    // Simulate agent sequence
    let agentIndex = 0;
    const runAgent = () => {
      if (agentIndex >= agentSequence.length) {
        setIsComplete(true);
        setIsSimulating(false);
        return;
      }

      const agent = agentSequence[agentIndex];
      setCurrentAgent(agentIndex);
      setProgress(((agentIndex + 1) / agentSequence.length) * 100);

      // Add log entry
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
      setLogs((prev) => [...prev, { agent: agent.name, message: agent.status, time }]);

      setTimeout(() => {
        agentIndex++;
        runAgent();
      }, agent.duration);
    };

    runAgent();
  };

  // Scroll within the log container only, not the whole page
  useEffect(() => {
    if (logEndRef.current && logEndRef.current.parentElement) {
      logEndRef.current.parentElement.scrollTop = logEndRef.current.parentElement.scrollHeight;
    }
  }, [logs]);

  return (
    <section id="demo" className="py-16 sm:py-24 md:py-32 lg:py-40 bg-sand-100 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 mesh-gradient opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <ScrollReveal className="text-center mb-8 sm:mb-12">
          <span
            className="text-[10px] sm:text-[11px] font-mono font-medium tracking-[0.15em] text-sage-500 uppercase"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Interactive Sandbox
          </span>
          <h2
            className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-deep-charcoal"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
          >
            Simulate the Swarm
          </h2>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg text-deep-charcoal/60 max-w-xl mx-auto">
            Watch 15+ agents map a topic in real-time.
          </p>
        </ScrollReveal>

        {/* Main Workspace */}
        <ScrollReveal delay={0.2}>
          <div className="grid lg:grid-cols-[35%_65%] gap-4 sm:gap-6">
            {/* Left: Inputs */}
            <div className="space-y-3 sm:space-y-4">
              {/* Input Field */}
              <div className="glass-premium rounded-xl sm:rounded-2xl p-3 sm:p-5">
                <label className="text-xs font-mono font-semibold tracking-wider text-deep-charcoal/40 uppercase mb-3 block">
                  Your Learning Goal
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white/70 border border-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400/50"
                    disabled={isSimulating}
                  />
                  <button
                    onClick={() => input && startSimulation(input)}
                    disabled={isSimulating || !input.trim()}
                    className="w-11 h-11 rounded-xl bg-sage-400 text-[#111111] flex items-center justify-center hover:bg-sage-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Prompts */}
              <div className="glass-premium rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/50">
                <label className="text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-deep-charcoal/40 uppercase mb-3 sm:mb-4 block flex items-center gap-2">
                  <Zap className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-500" />
                  Try a Blueprint
                </label>
                <div className="space-y-2 sm:space-y-3">
                  {quickPrompts.map((prompt, i) => (
                    <motion.button
                      key={prompt.label}
                      onClick={() => startSimulation(prompt.prompt)}
                      disabled={isSimulating}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl bg-white/70 hover:bg-white text-left transition-all border border-sand-200 hover:border-sage-300 hover:shadow-md group disabled:opacity-50"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-sand-100 group-hover:bg-sage-400/10 flex items-center justify-center text-base sm:text-xl transition-colors shrink-0">
                        {prompt.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-deep-charcoal group-hover:text-sage-600 transition-colors block truncate">
                          {prompt.label}
                        </span>
                        <p className="text-[9px] sm:text-[10px] text-deep-charcoal/40 mt-0.5 truncate hidden sm:block">
                          {prompt.prompt.slice(0, 40)}...
                        </p>
                      </div>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sage-400/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Send className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-sage-500" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Stats - hidden on mobile to save space */}
              <div className="hidden sm:block glass-premium rounded-2xl p-5 border border-white/50">
                <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    className="text-center p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-colors cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg group-hover:scale-110 transition-transform">🤖</span>
                      <div className="text-2xl font-mono font-bold text-sage-500">15+</div>
                    </div>
                    <div className="text-[10px] font-mono text-deep-charcoal/40 uppercase mt-1">Agents</div>
                  </motion.div>
                  <motion.div 
                    className="text-center p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-colors cursor-pointer group"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg group-hover:scale-110 transition-transform">⚡</span>
                      <div className="text-2xl font-mono font-bold text-sage-500">~4s</div>
                    </div>
                    <div className="text-[10px] font-mono text-deep-charcoal/40 uppercase mt-1">Gen Time</div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right: Live Generation Engine */}
            <div
              className="glass-premium rounded-2xl sm:rounded-3xl overflow-hidden"
              style={{
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.02), 0 24px 48px rgba(0,0,0,0.08)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/20 bg-white/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-deep-charcoal/60 uppercase">
                    {isSimulating ? "Orchestrating" : isComplete ? "Complete" : "Standby"}
                  </span>
                </div>
                {isSimulating && (
                  <span className="text-[10px] sm:text-xs font-mono text-sage-500">{Math.round(progress)}%</span>
                )}
              </div>

              {/* Content Area */}
              <div className="min-h-[280px] sm:min-h-[400px] bg-white/20 relative flex flex-col">
                <AnimatePresence mode="wait">
                  {!isSimulating && !isComplete ? (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 overflow-hidden"
                    >
                      {/* Background orbital rings */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] opacity-20" viewBox="0 0 300 300">
                          <circle cx="150" cy="150" r="40" fill="none" stroke="#7C9A6B" strokeWidth="1" strokeDasharray="4 6" />
                          <circle cx="150" cy="150" r="80" fill="none" stroke="#7C9A6B" strokeWidth="1" strokeDasharray="4 6" />
                          <circle cx="150" cy="150" r="120" fill="none" stroke="#7C9A6B" strokeWidth="1" strokeDasharray="4 6" />
                        </svg>
                      </div>

                      {/* Center NOBOGYAN Hub */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-xl"
                          style={{ boxShadow: "0 0 40px rgba(124,154,107,0.3)" }}
                        >
                          <img src="/nobogyan-logo.png" alt="NOBOGYAN" className="w-10 h-10 sm:w-14 sm:h-14" />
                        </motion.div>
                        <motion.div
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute -inset-3 sm:-inset-4 rounded-2xl sm:rounded-3xl border-2 border-sage-400/30"
                        />
                      </div>

                      {/* Floating Agent Nodes - fewer on mobile */}
                      {floatingAgents.slice(0, 4).map((agent) => (
                        <motion.div
                          key={agent.id}
                          className="absolute group cursor-pointer hidden sm:block"
                          style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1,
                            y: [0, -8, 0],
                          }}
                          transition={{ 
                            opacity: { delay: agent.delay, duration: 0.5 },
                            scale: { delay: agent.delay, duration: 0.5 },
                            y: { delay: agent.delay, duration: 3 + agent.delay, repeat: Infinity, ease: "easeInOut" }
                          }}
                        >
                          <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-lg shadow-lg transition-transform group-hover:scale-110"
                            style={{ backgroundColor: agent.color }}
                          >
                            {agent.icon}
                          </div>
                          {/* Connection line to center */}
                          <svg 
                            className="absolute top-1/2 left-1/2 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                            style={{ 
                              width: "200px", 
                              height: "200px",
                              transform: "translate(-50%, -50%)"
                            }}
                          >
                            <line 
                              x1="100" y1="100" 
                              x2={agent.x < 50 ? 150 : 50} 
                              y2={agent.y < 50 ? 150 : 50}
                              stroke={agent.color}
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                          </svg>
                          {/* Tooltip */}
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-white/90 shadow-sm text-deep-charcoal/70">
                              {agent.name}
                            </span>
                          </div>
                        </motion.div>
                      ))}

                      {/* Animated particles - hidden on mobile */}
                      <div className="hidden sm:block">
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={`particle-${i}`}
                            className="absolute w-1.5 h-1.5 rounded-full bg-sage-400/40"
                            style={{ left: `${30 + i * 10}%`, top: "50%" }}
                            animate={{
                              x: [0, 50, 0],
                              y: [0, -30 + i * 10, 0],
                              opacity: [0, 0.6, 0],
                            }}
                            transition={{
                              duration: 3,
                              delay: i * 0.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>

                      {/* Bottom CTA */}
                      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 text-center px-4">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/60 border border-sage-300/30 shadow-sm"
                        >
                          <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 text-sage-500" />
                          <span className="text-[10px] sm:text-xs font-medium text-deep-charcoal/60">
                            Tap a topic to activate
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 p-3 sm:p-6 flex flex-col"
                    >
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-sage-400 to-green-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>

                      {/* Current Agent */}
                      {isSimulating && currentAgent < agentSequence.length && (
                        <motion.div 
                          key={currentAgent}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="mb-6 flex items-center gap-4 p-4 rounded-xl bg-white/50 border border-sand-200/50"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                            style={{ backgroundColor: agentSequence[currentAgent].color }}
                          >
                            {agentSequence[currentAgent].icon}
                          </motion.div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-deep-charcoal">
                                {agentSequence[currentAgent].name}
                              </span>
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[10px] font-mono text-amber-600">Active</span>
                              </div>
                            </div>
                            <span className="text-xs text-deep-charcoal/50">
                              {agentSequence[currentAgent].status}
                            </span>
                            <div className="mt-2 h-2 bg-sand-200 rounded-full overflow-hidden w-40">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: agentSequence[currentAgent].color }}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: agentSequence[currentAgent].duration / 1000 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Activity Log - Enhanced */}
                      <div className={`glass rounded-xl p-4 border border-sand-200/50 ${isComplete ? "" : "flex-1"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono font-semibold text-deep-charcoal/40 uppercase tracking-wider">Agent Activity Log</span>
                          <span className="text-[10px] font-mono text-sage-500">{logs.length}/{agentSequence.length} complete</span>
                        </div>
                        <div className={`space-y-2 overflow-y-auto pr-2 ${isComplete ? "max-h-[100px]" : "max-h-[180px]"}`}>
                          {logs.map((log, i) => {
                            const agent = agentSequence.find(a => a.name === log.agent);
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                              >
                                <div 
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                                  style={{ backgroundColor: agent?.color || "#7C9A6B" }}
                                >
                                  {agent?.icon || "🎯"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-deep-charcoal">{log.agent}</span>
                                    <span className="text-[10px] text-deep-charcoal/40">{log.message}</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-deep-charcoal/30">{log.time}</span>
                                </div>
                                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                              </motion.div>
                            );
                          })}
                          <div ref={logEndRef} />
                        </div>
                      </div>

                      {/* Email Gateway - Enhanced (inline) */}
                      {isComplete && !emailSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 glass-premium rounded-2xl p-6 border border-green-400/30 bg-gradient-to-r from-green-400/5 to-emerald-400/10"
                          style={{ boxShadow: "0 4px 20px rgba(46,204,113,0.1)" }}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg"
                            >
                              <span className="text-xl">🎉</span>
                            </motion.div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-semibold text-deep-charcoal">Your Roadmap is Ready!</h4>
                                <span className="text-[10px] font-mono text-green-600 bg-green-400/20 px-2 py-0.5 rounded-full">COMPLETE</span>
                              </div>
                              <p className="text-xs text-deep-charcoal/50 mt-0.5">Enter your email to download the complete learning package</p>
                            </div>
                          </div>
                          
                          {/* What's included */}
                          <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-white/50">
                            {[
                              { icon: "📚", label: "Notes" },
                              { icon: "🗺️", label: "Mind Map" },
                              { icon: "❓", label: "Quiz" },
                              { icon: "📅", label: "Schedule" },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="text-sm">{item.icon}</span>
                                <span className="text-[10px] font-medium text-deep-charcoal/60">{item.label}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex gap-3">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="flex-1 px-4 py-3 rounded-xl bg-white/80 border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-300"
                            />
                            <button
                              onClick={() => email && setEmailSubmitted(true)}
                              disabled={!email}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-sage-400 to-sage-500 text-white text-sm font-semibold hover:from-sage-500 hover:to-sage-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success State - Enhanced */}
                <AnimatePresence>
                  {emailSubmitted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/95 to-green-50/90"
                    >
                      {/* Confetti-like particles */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 rounded-full"
                          style={{ 
                            backgroundColor: ["#7C9A6B", "#F39C12", "#9B59B6", "#E67E22", "#1ABC9C", "#2ECC71", "#3498DB", "#E74C3C"][i],
                            left: `${20 + i * 10}%`,
                            top: "30%"
                          }}
                          animate={{
                            y: [0, -50, 100],
                            x: [0, (i % 2 === 0 ? 20 : -20), 0],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            delay: i * 0.1,
                            repeat: Infinity,
                            repeatDelay: 1,
                          }}
                        />
                      ))}
                      
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-xl"
                      >
                        <motion.span 
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className="text-4xl"
                        >
                          🎉
                        </motion.span>
                      </motion.div>
                      
                      <motion.h4 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl font-semibold text-deep-charcoal"
                      >
                        Check Your Inbox!
                      </motion.h4>
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm text-deep-charcoal/50 mt-2 text-center max-w-xs"
                      >
                        Your personalized learning roadmap is on its way to <span className="font-medium text-sage-600">{email}</span>
                      </motion.p>
                      
                      {/* Package preview */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-3 mt-6 p-3 rounded-xl bg-white/80 border border-sand-200"
                      >
                        {[
                          { icon: "📚", label: "Notes" },
                          { icon: "🗺️", label: "Map" },
                          { icon: "❓", label: "Quiz" },
                          { icon: "📅", label: "Plan" },
                        ].map((item, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 + i * 0.1 }}
                            className="flex flex-col items-center gap-1 px-3"
                          >
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-[9px] font-mono text-deep-charcoal/50">{item.label}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                      
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        onClick={() => {
                          setIsComplete(false);
                          setEmailSubmitted(false);
                          setEmail("");
                          setInput("");
                          setLogs([]);
                        }}
                        className="mt-8 px-6 py-3 rounded-xl bg-sage-400 text-white text-sm font-semibold hover:bg-sage-500 transition-colors shadow-md hover:shadow-lg"
                      >
                        Try Another Topic
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
