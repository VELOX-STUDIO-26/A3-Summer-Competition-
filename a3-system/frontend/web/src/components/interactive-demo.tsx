"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const suggestedQuestions = [
  "What is Docker?",
  "Explain K8s pods",
  "Load Balancing",
];

const agentActivities = [
  { agent: "Tutor Engine", status: "Retrieving context...", color: "#3498DB" },
  { agent: "Faithfulness Checker", status: "Verifying claims...", color: "#2ECC71" },
  { agent: "Profile Adapter", status: "Personalizing response...", color: "#9B59B6" },
];

export function InteractiveDemo() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    {
      role: "bot",
      text: "Hi! I'm your AI learning swarm. Ask me about Docker, Kubernetes, System Design, or anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeAgents, setActiveAgents] = useState<typeof agentActivities>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsTyping(true);
    setActiveAgents(agentActivities);

    // Simulate response
    setTimeout(() => {
      setActiveAgents([]);
      const responses: Record<string, string> = {
        "What is Docker?":
          "Docker is a platform that uses OS-level virtualization to deliver software in packages called containers. Containers are isolated from each other and bundle their own software, libraries, and configuration files. Think of it like shipping containers for code — standardized, portable, and efficient.",
        "Explain K8s pods":
          "A Pod is the smallest deployable unit in Kubernetes. It represents a single instance of a running process in your cluster and can contain one or more containers that share storage and network resources. Pods are ephemeral — they can be created, destroyed, and replaced dynamically.",
        "Load Balancing":
          "Load balancing distributes incoming network traffic across multiple servers to ensure no single server bears too much demand. This improves responsiveness, availability, and prevents any one server from becoming a bottleneck.",
      };
      const response =
        responses[text] ||
        "Great question! Let me analyze that through our knowledge graph and provide a personalized explanation based on your learning profile.";
      setMessages((prev) => [...prev, { role: "bot", text: response }]);
      setIsTyping(false);
    }, 2500);
  };

  return (
    <section id="demo" className="py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px]"
          style={{
            background: "radial-gradient(ellipse, rgba(124,154,107,0.06), transparent 70%)",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <p className="text-[11px] text-[#7C9A6B] uppercase tracking-[0.2em] mb-3 font-medium font-[family-name:var(--font-mono)]">
            Interactive Demo
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 font-[family-name:var(--font-display)]">
            Experience the Swarm
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            Ask anything. Watch 15+ agents collaborate in real-time.
          </p>
        </div>

        {/* Chat Widget */}
        <div className="glass-card overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#7C9A6B]/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-[#7C9A6B]" />
              </div>
              <span className="text-sm font-medium text-white">NOBOGYAN Swarm</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ECC71] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2ECC71]" />
              </span>
              <span className="text-xs text-white/40 font-[family-name:var(--font-mono)]">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    msg.role === "bot"
                      ? "bg-[#7C9A6B]/20"
                      : "bg-white/10"
                  )}
                >
                  {msg.role === "bot" ? (
                    <Bot className="w-4 h-4 text-[#7C9A6B]" />
                  ) : (
                    <User className="w-4 h-4 text-white/60" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === "bot"
                      ? "glass-card border-white/5"
                      : "bg-[#7C9A6B]/20 text-white"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7C9A6B]/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#7C9A6B]" />
                </div>
                <div className="glass-card p-4">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-6 pb-4 flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-[#7C9A6B]/30 hover:bg-[#7C9A6B]/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Agent Activity */}
          {activeAgents.length > 0 && (
            <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02]">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-[family-name:var(--font-mono)]">Swarm Activity</p>
              <div className="space-y-2">
                {activeAgents.map((agent) => (
                  <div key={agent.agent} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: agent.color }} />
                    <span className="text-[11px] text-white/50 font-[family-name:var(--font-mono)]">{agent.agent}</span>
                    <span className="text-[11px] text-white/30">{agent.status}</span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ backgroundColor: agent.color, width: "60%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                placeholder="Ask anything..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7C9A6B]/30 transition-colors"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-[#7C9A6B] text-white flex items-center justify-center hover:bg-[#5E7A4F] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-[10px] text-white/20 mt-3">
              No signup required • 3 free questions • See agent activity in real-time
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
