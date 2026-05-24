"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Volume2,
  FileText,
  GitBranch,
  Lightbulb,
  Clock,
  Brain,
  Zap,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import ScrollReveal from "../components/landing/ScrollReveal";

/* ═══════════════════════════════════════════
   MOCK CHAT DATA
   ═══════════════════════════════════════════ */

const chatMessages = [
  {
    type: "user",
    content: "How does a container talk to another container? I'm stuck on this networking layout.",
    timestamp: "Just now",
  },
  {
    type: "tutor",
    content: "Great question! Containers communicate over an isolated virtual bridge network. Here's exactly how the packet flows:",
    timestamp: "Just now",
    hasVisuals: true,
  },
];

/* ═══════════════════════════════════════════
   MULTIMODAL TABS
   ═══════════════════════════════════════════ */

const multimodalTabs = [
  { id: "text", label: "Text & Code", icon: FileText, color: "#9B59B6" },
  { id: "diagram", label: "Diagrams", icon: GitBranch, color: "#E67E22" },
  { id: "voice", label: "Voice", icon: Volume2, color: "#1ABC9C" },
  { id: "video", label: "Video", icon: Play, color: "#E74C3C" },
];

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */

function NetworkDiagram() {
  return (
    <div className="bg-gradient-to-br from-sage-50 to-white rounded-xl p-4 border border-sage-200/50">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-sage-400/20 flex items-center justify-center">
          <GitBranch className="w-3 h-3 text-sage-600" />
        </div>
        <span className="text-[10px] font-mono text-sage-600 uppercase tracking-wider">Auto-Generated Diagram</span>
      </div>
      <svg viewBox="0 0 340 80" className="w-full h-auto">
        <defs>
          <linearGradient id="bridgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C9A6B" />
            <stop offset="100%" stopColor="#1ABC9C" />
          </linearGradient>
          <filter id="containerShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>
        
        {/* Container A */}
        <g filter="url(#containerShadow)">
          <rect x="10" y="22" width="85" height="44" rx="6" fill="#9B59B6" />
          <text x="52" y="49" textAnchor="middle" fill="white" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600">
            Container A
          </text>
        </g>
        
        {/* Arrow 1 */}
        <motion.path
          d="M 100 44 L 130 44"
          stroke="url(#bridgeGrad)"
          strokeWidth="2"
          strokeDasharray="4 2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.polygon
          points="130,40 138,44 130,48"
          fill="#7C9A6B"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        />
        
        {/* Bridge */}
        <g filter="url(#containerShadow)">
          <rect x="140" y="19" width="50" height="50" rx="25" fill="#7C9A6B" />
          <text x="165" y="41" textAnchor="middle" fill="white" fontSize="8" fontFamily="var(--font-mono)" fontWeight="600">
            Docker
          </text>
          <text x="165" y="51" textAnchor="middle" fill="white" fontSize="8" fontFamily="var(--font-mono)" fontWeight="600">
            Bridge
          </text>
        </g>
        
        {/* Arrow 2 */}
        <motion.path
          d="M 195 44 L 225 44"
          stroke="url(#bridgeGrad)"
          strokeWidth="2"
          strokeDasharray="4 2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        <motion.polygon
          points="225,40 233,44 225,48"
          fill="#1ABC9C"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        />
        
        {/* Container B */}
        <g filter="url(#containerShadow)">
          <rect x="240" y="22" width="85" height="44" rx="6" fill="#1ABC9C" />
          <text x="282" y="49" textAnchor="middle" fill="white" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600">
            Container B
          </text>
        </g>
        
        {/* Animated packet */}
        <motion.circle
          r="4"
          fill="#F39C12"
          initial={{ cx: 52, cy: 44 }}
          animate={{ cx: [52, 165, 282], cy: [44, 44, 44] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}

function VideoPreview() {
  return (
    <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-4 border border-red-200/50 mt-4 mb-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-deep-charcoal">Container Bridging Explained</p>
            <p className="text-[10px] text-deep-charcoal/50">Auto-generated video summary</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded bg-deep-charcoal/10 text-[10px] font-mono text-deep-charcoal/70">0:45</span>
      </div>
      <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-red-500 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "35%" }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
      </div>
    </div>
  );
}

function VoiceWaveform() {
  return (
    <div className="flex items-center gap-3 bg-gradient-to-br from-teal-50 to-white rounded-xl p-4 border border-teal-200/50 mt-4 mb-1">
      <button className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center hover:bg-teal-600 transition-colors">
        <Volume2 className="w-5 h-5 text-white" />
      </button>
      <div className="flex-1 flex items-center gap-0.5 h-8">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-teal-400 rounded-full"
            initial={{ height: "20%" }}
            animate={{ height: `${20 + Math.random() * 80}%` }}
            transition={{ duration: 0.3, repeat: Infinity, repeatType: "reverse", delay: i * 0.02 }}
          />
        ))}
      </div>
      <span className="text-[9px] font-mono text-teal-600 bg-teal-100 px-2 py-1 rounded">iFLYTEK TTS</span>
    </div>
  );
}

function TextCodeView() {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 border border-purple-200/50 mt-4 mb-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded bg-purple-400/20 flex items-center justify-center">
          <FileText className="w-3 h-3 text-purple-600" />
        </div>
        <span className="text-[10px] font-mono text-purple-600 uppercase tracking-wider">Code Explanation</span>
      </div>
      <div className="bg-gray-900 rounded-lg p-3 font-mono text-[11px] text-gray-300 overflow-x-auto">
        <div><span className="text-purple-400">docker</span> <span className="text-green-400">network</span> create my-bridge</div>
        <div className="mt-1"><span className="text-purple-400">docker</span> run --network=my-bridge containerA</div>
        <div className="mt-1"><span className="text-purple-400">docker</span> run --network=my-bridge containerB</div>
      </div>
      <p className="text-[11px] text-deep-charcoal/60 mt-3 leading-relaxed">
        Containers on the same bridge network can communicate using container names as hostnames.
      </p>
    </div>
  );
}

function StuckAlert({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute -top-3 left-4 right-4 z-20"
    >
      <div
        className="rounded-xl p-3 border border-amber-300/50 shadow-lg"
        style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">We noticed you've been on Pod Scheduling for 10 minutes</p>
            <p className="text-[10px] text-amber-700/70 mt-0.5">Click here to let Sage guide you step-by-step.</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-amber-600 hover:text-amber-800 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MockChatInterface() {
  const [activeTab, setActiveTab] = useState("diagram");
  const [showStuckAlert, setShowStuckAlert] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Delayed stuck alert slide-in (proactive feature demo)
    const alertTimer = setTimeout(() => setShowStuckAlert(true), 1200);
    const timer = setTimeout(() => setIsTyping(true), 1800);
    const timer2 = setTimeout(() => setIsTyping(false), 3200);
    return () => {
      clearTimeout(alertTimer);
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="relative">
      {/* Stuck Alert */}
      <AnimatePresence>
        {showStuckAlert && <StuckAlert onDismiss={() => setShowStuckAlert(false)} />}
      </AnimatePresence>

      <div
        className="rounded-2xl border border-white/50 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.9)",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-sage-200/30 bg-gradient-to-r from-sage-50/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-400/15 border border-sage-400/20">
                <div className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
                <span className="text-[10px] font-mono font-semibold text-sage-700">Sage / Tutor Active</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-400/10 border border-purple-400/20">
                <Brain className="w-3 h-3 text-purple-500" />
                <span className="text-[10px] font-mono text-purple-600">Context: Docker Networking</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-deep-charcoal/40">8K token memory</span>
              <div className="w-12 h-1.5 bg-sage-200 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-sage-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="p-4 space-y-4 min-h-[320px]">
          {/* User Message */}
          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-sand-300 flex items-center justify-center text-deep-charcoal text-[10px] font-bold shrink-0">
              You
            </div>
            <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 border border-sand-200 max-w-[85%] shadow-sm">
              <p className="text-sm text-deep-charcoal/80">{chatMessages[0].content}</p>
              <span className="text-[9px] text-gray-500 mt-1 block">{chatMessages[0].timestamp}</span>
            </div>
          </div>

          {/* Tutor Message */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-sage-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              <span className="text-[9px] font-serif font-bold" style={{ fontFamily: "var(--font-serif)" }}>N</span>
            </div>
            <div className="flex-1 max-w-[90%]">
              <div className="bg-sage-50 rounded-2xl rounded-tl-sm px-4 py-3 border border-sage-200/50 shadow-sm">
                <p className="text-sm text-deep-charcoal/80">{chatMessages[1].content}</p>
                
                {/* Network Diagram */}
                <div className="mt-3">
                  <NetworkDiagram />
                </div>

                {/* Multimodal Tabs */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {multimodalTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                        activeTab === tab.id
                          ? "bg-white shadow-sm border border-gray-200"
                          : "bg-transparent hover:bg-white/50"
                      }`}
                      style={{ color: activeTab === tab.id ? tab.color : "rgba(45,55,72,0.5)" }}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Conditional Content based on active tab */}
                <AnimatePresence mode="wait">
                  {activeTab === "text" && (
                    <motion.div
                      key="text"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <TextCodeView />
                    </motion.div>
                  )}
                  {activeTab === "voice" && (
                    <motion.div
                      key="voice"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <VoiceWaveform />
                    </motion.div>
                  )}
                  {activeTab === "video" && (
                    <motion.div
                      key="video"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <VideoPreview />
                    </motion.div>
                  )}
                </AnimatePresence>

                <span className="text-[9px] text-gray-500 mt-3 block">{chatMessages[1].timestamp}</span>
              </div>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 mt-2 ml-2"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-sage-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-sage-500">Sage is thinking...</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-sage-200/30 bg-gradient-to-r from-transparent to-sage-50/30">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-sage-200/50">
              <input
                type="text"
                placeholder="Ask a follow-up question..."
                className="flex-1 text-sm bg-transparent outline-none text-deep-charcoal placeholder:text-deep-charcoal/30"
                disabled
              />
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 rounded-lg hover:bg-sage-100 transition-colors">
                  <Volume2 className="w-4 h-4 text-sage-400" />
                </button>
              </div>
            </div>
            <button className="px-4 py-2.5 rounded-xl bg-sage-400 text-white text-sm font-medium hover:bg-sage-500 transition-colors flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════ */

export default function AITutor() {
  return (
    <section
      id="ai-tutor"
      className="relative bg-gradient-to-b from-sand-50 via-white to-sand-100 overflow-hidden py-24"
    >
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-sage-400/[0.06] blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-400/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <ScrollReveal className="text-center mb-20 lg:mb-24">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sage-400/10 border border-sage-400/20 text-[10px] font-mono font-medium text-sage-600">
            <GraduationCap className="w-3 h-3" />
            omni-channel ai tutor
          </span>
          <h2
            className="mt-4 text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-deep-charcoal"
            style={{ fontFamily: "var(--font-serif)", lineHeight: 1.1 }}
          >
            Your 24/7 Personal Professor
          </h2>
          <p className="mt-4 text-base max-w-2xl mx-auto text-deep-charcoal/60">
            Not a chatbot. A context-aware learning companion that explains concepts through 
            text, diagrams, voice, and video—adapting to how <em>you</em> learn best.
          </p>
        </ScrollReveal>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Value Props with sequential animations */}
          <div className="space-y-8">
            {/* Zero Catch-Up */}
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sage-400 to-sage-500 flex items-center justify-center shrink-0 shadow-lg shadow-sage-400/25">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-semibold text-deep-charcoal" style={{ fontFamily: "var(--font-serif)" }}>
                  Zero Catch-Up Required
                </h3>
                <p className="mt-1 text-sm text-deep-charcoal/60 leading-relaxed">
                  The system tracks your individual progress history and remembers every question 
                  you've asked—saving your time and mental energy.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-sage-100 text-[10px] font-mono text-sage-700">full session memory</span>
                  <span className="px-2 py-1 rounded bg-sage-100 text-[10px] font-mono text-sage-700">deep context retained</span>
                </div>
              </div>
            </motion.div>

            {/* Multimodal Router */}
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-400/25">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-semibold text-deep-charcoal" style={{ fontFamily: "var(--font-serif)" }}>
                  Multimodal Explanations
                </h3>
                <p className="mt-1 text-sm text-deep-charcoal/60 leading-relaxed">
                  Every answer is enriched with auto-generated diagrams, syntax-highlighted code, 
                  voice narration, and short video summaries. Learn the way your brain prefers.
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded bg-purple-100 text-[10px] font-mono text-purple-700">📝 text</span>
                  <span className="px-2 py-1 rounded bg-orange-100 text-[10px] font-mono text-orange-700">🔀 diagrams</span>
                  <span className="px-2 py-1 rounded bg-teal-100 text-[10px] font-mono text-teal-700">🔊 voice</span>
                  <span className="px-2 py-1 rounded bg-red-100 text-[10px] font-mono text-red-700">🎬 video</span>
                </div>
              </div>
            </motion.div>

            {/* Proactive Coaching */}
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-400/25">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-semibold text-deep-charcoal" style={{ fontFamily: "var(--font-serif)" }}>
                  Proactive, Not Passive
                </h3>
                <p className="mt-1 text-sm text-deep-charcoal/60 leading-relaxed">
                  Stuck on an exercise? The platform detects when you're struggling and proactively 
                  offers step-by-step guidance—before you even ask. It's like having a professor 
                  watching over your shoulder.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] text-amber-700">Auto-detects when you need help</span>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div 
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <button className="group flex items-center gap-2 px-6 py-3.5 rounded-xl bg-sage-500 text-white font-medium hover:bg-sage-600 hover:shadow-lg hover:shadow-sage-500/25 transition-all duration-200">
                Experience the Tutor
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </motion.div>
          </div>

          {/* Right: Mock Chat Interface */}
          <ScrollReveal delay={0.2}>
            <MockChatInterface />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
