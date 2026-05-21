"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "What makes A3 different from ChatGPT?",
    answer: "ChatGPT is a general-purpose assistant. A3 is specifically designed for education with 15+ specialized agents that work together: profiling agents understand your learning style, content agents generate personalized materials, a path planner optimizes your route via A* search, and an assessment system continuously adapts. Every interaction feeds back into your learner profile.",
  },
  {
    question: "How do the 15+ agents work together?",
    answer: "The Orchestrator agent coordinates everything. When you request content, it analyzes your profile and dispatches specialized agents in parallel: Scholar generates notes, Mapper creates mind maps, Sage builds quizzes, Director scripts videos, and Architect prepares coding exercises. All outputs pass through a Faithfulness Checker before delivery.",
  },
  {
    question: "Can I see which agents are active?",
    answer: "Yes! The dashboard shows real-time agent activity with status indicators. You'll see which agents are processing, their progress, and how they collaborate. The demo section above lets you experience this live.",
  },
  {
    question: "Is my data used to train AI models?",
    answer: "No. Your learning data is used only to personalize your experience within A3. We do not use your conversations, quiz answers, or profile information to train external AI models. See our Privacy Policy for full details.",
  },
  {
    question: "How accurate is the faithfulness checker?",
    answer: "Our two-stage validation checks every factual claim against the RAG knowledge base and scans for harmful content. While no AI system is perfect, we target below 2% factual error rate and continuously improve through feedback.",
  },
  {
    question: "What subjects does A3 cover?",
    answer: "Currently focused on cloud computing with 500+ topics including Docker, Kubernetes, AWS, system design, and networking. The knowledge graph architecture supports expansion to any subject area.",
  },
  {
    question: "Do I need coding experience?",
    answer: "Not at all. A3 adapts to your level. Complete beginners start with fundamentals, while experienced learners can jump to advanced topics. The profiling chat automatically assesses your background.",
  },
];

function FAQItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-base md:text-lg font-medium text-white group-hover:text-[#7C9A6B] transition-colors pr-4">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-white/40 shrink-0 transition-transform duration-300",
            isOpen && "rotate-180 text-[#7C9A6B]"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-96 opacity-100 pb-6" : "max-h-0 opacity-0"
        )}
      >
        <p className="text-white/50 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p
            className={cn(
              "text-[11px] text-[#7C9A6B] uppercase tracking-[0.2em] mb-3 font-medium font-[family-name:var(--font-mono)] transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            FAQ
          </p>
          <h2
            className={cn(
              "text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-display)] transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Questions? Answered.
          </h2>
        </div>

        <div
          className={cn(
            "glass-card p-6 md:p-10 transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
