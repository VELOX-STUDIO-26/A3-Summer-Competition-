"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "../components/ScrollReveal";

// Agent tag component for inline text highlighting
function AgentTag({ id, color, name }: { id: string; color: string; name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium mx-0.5"
      style={{ backgroundColor: `${color}15`, color: color }}
      title={name}
    >
      <span
        className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {id}
      </span>
      {name}
    </span>
  );
}

// Mini agent badge for answer footer
function AgentBadge({ id, color, name }: { id: string; color: string; name: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/10 border border-white/20">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {id}
      </div>
      <span className="text-[10px] font-mono text-white/70">{name}</span>
    </div>
  );
}

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
  agents?: { id: string; name: string; color: string }[];
  isOpen: boolean;
  onClick: () => void;
  index: number;
}

function FAQItem({ question, answer, agents, isOpen, onClick, index }: FAQItemProps) {
  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: isOpen ? "#1A1D1F" : "rgba(248, 247, 244, 0.5)",
        borderColor: isOpen ? "rgba(124, 154, 107, 0.3)" : "rgba(231, 229, 222, 0.5)",
      }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border mb-3 overflow-hidden ${
        isOpen ? "shadow-xl shadow-deep-charcoal/20" : ""
      }`}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 text-left group"
      >
        <span
          className={`text-lg font-medium transition-colors pr-4 ${
            isOpen ? "text-white" : "text-deep-charcoal group-hover:text-sage-500"
          }`}
        >
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isOpen ? "bg-sage-400/20" : "bg-sand-100 group-hover:bg-sand-200"
          }`}
        >
          <ChevronDown
            className={`w-5 h-5 transition-colors duration-300 ${
              isOpen ? "text-sage-400" : "text-deep-charcoal/40"
            }`}
          />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <div className="text-white/80 leading-relaxed max-w-[65ch] text-[15px]">
                {answer}
              </div>
              {agents && agents.length > 0 && (
                <div className="mt-5 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider mr-2">
                    Relevant agents
                  </span>
                  {agents.map((agent) => (
                    <AgentBadge key={agent.id} {...agent} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const faqs = [
  {
    question: "What makes NOBOGYAN different from ChatGPT?",
    answer: (
      <>
        While ChatGPT is a single general-purpose model, NOBOGYAN is a coordinated swarm of 15+ specialized agents — each with a unique role. One agent profiles your learning style, another plans your path, others generate content, tutor you in real-time, and verify accuracy. They collaborate like a team of experts, not a single chatbot.
      </>
    ),
    agents: [
      { id: "P", name: "Profiler", color: "#9B59B6" },
      { id: "T", name: "Tutor", color: "#3498DB" },
      { id: "F", name: "Faithful", color: "#2ECC71" },
    ],
  },
  {
    question: "How do the 15+ agents work together?",
    answer: (
      <>
        The Orchestrator agent coordinates everything. When you ask a question, it dispatches the right agents in parallel — the Tutor Engine retrieves context, the Faithfulness Checker verifies claims, and relevant content agents build supplementary materials. All of this happens in real-time, with results streamed to you live.
      </>
    ),
    agents: [
      { id: "O", name: "Orchestrator", color: "#7C9A6B" },
      { id: "T", name: "Tutor", color: "#3498DB" },
      { id: "F", name: "Faithful", color: "#2ECC71" },
    ],
  },
  {
    question: "Can I see which agents are active?",
    answer: (
      <>
        Absolutely! In the Pro plan, you get a real-time Swarm Activity panel that shows exactly which agents are working, what they&apos;re doing, and how they collaborate. It&apos;s like watching a backstage view of your personal AI team.
      </>
    ),
    agents: [
      { id: "O", name: "Orchestrator", color: "#7C9A6B" },
      { id: "P", name: "Planner", color: "#F39C12" },
      { id: "S", name: "Scholar", color: "#9B59B6" },
    ],
  },
  {
    question: "Is my data used to train AI models?",
    answer: (
      <>
        No. Your conversations, profiles, and learning data are never used to train foundation models. We may use anonymized interaction patterns to improve our orchestration layer, but your personal data stays yours. You can request full deletion at any time.
      </>
    ),
    agents: [],
  },
  {
    question: "How accurate is the faithfulness checker?",
    answer: (
      <>
        Our Faithfulness Checker agent cross-references generated content against source materials, knowledge graphs, and trusted references. In our benchmarks, it catches 94% of factual inconsistencies before they reach you. For code, it runs outputs in a sandbox to verify they actually work.
      </>
    ),
    agents: [
      { id: "F", name: "Faithful Checker", color: "#2ECC71" },
    ],
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 md:py-32 bg-sand-50">
      <div className="max-w-3xl mx-auto px-6">
        <ScrollReveal className="text-center mb-12">
          <span
            className="text-[11px] font-mono font-medium tracking-[0.15em] text-sage-500 uppercase"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            FAQ
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-serif font-semibold text-deep-charcoal"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Frequently Asked Questions
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div>
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                index={i}
                question={faq.question}
                answer={faq.answer}
                agents={faq.agents}
                isOpen={openIndex === i}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
