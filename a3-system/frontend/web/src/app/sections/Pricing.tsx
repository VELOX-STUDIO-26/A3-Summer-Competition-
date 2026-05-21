"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "../components/landing/ScrollReveal";

// Mini agent dots for feature list
function AgentDots() {
  const agents = [
    { id: "T", color: "#3498DB" },
    { id: "P", color: "#F39C12" },
    { id: "S", color: "#1ABC9C" },
  ];
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {agents.map((agent, i) => (
        <motion.span
          key={agent.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
          style={{ backgroundColor: agent.color }}
        >
          {agent.id}
        </motion.span>
      ))}
    </span>
  );
}

interface PlanFeature {
  text: string;
  tooltip?: string;
  hasAgentDots?: boolean;
  highlight?: boolean;
  isInherited?: boolean;
}

const plans: {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  period: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  popular: boolean;
}[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    period: "forever",
    description: "Perfect for getting started",
    features: [
      { text: "Core swarm agents", hasAgentDots: true, tooltip: "Access to Tutor, Planner, and Sage agents" },
      { text: "5 chats per day", tooltip: "Resets daily at midnight UTC" },
      { text: "Basic learning paths" },
      { text: "Standard quizzes" },
      { text: "Community support", tooltip: "Discord community access" },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    monthlyPrice: 12,
    yearlyPrice: 9,
    period: "/month",
    description: "For serious learners",
    features: [
      { text: "Full swarm access (15+ agents)", highlight: true, tooltip: "All content, system, and assessment agents" },
      { text: "Unlimited chats", tooltip: "No daily limits" },
      { text: "Advanced analytics", tooltip: "Track progress, identify weak points, view learning velocity" },
      { text: "Voice input & output", tooltip: "Speak questions, hear explanations" },
      { text: "Priority support", tooltip: "< 4 hour response time" },
      { text: "Custom learning paths", tooltip: "Create and share your own curricula" },
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Team",
    monthlyPrice: 29,
    yearlyPrice: 23,
    period: "/user/month",
    description: "For organizations",
    features: [
      { text: "Everything in Pro", isInherited: true },
      { text: "Team analytics dashboard", tooltip: "Track team progress and identify knowledge gaps" },
      { text: "Shared resources library", tooltip: "Centralized content repository" },
      { text: "SSO & admin controls", tooltip: "SAML, OIDC, and role-based access" },
      { text: "API access", tooltip: "Integrate NOBOGYAN into your LMS or workflow" },
      { text: "Dedicated support", tooltip: "Named account manager" },
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

// Tooltip component
function FeatureTooltip({ text, children }: { text?: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  if (!text) return <>{children}</>;

  return (
    <span
      className="relative inline-flex items-center gap-1 cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <Info className="w-3 h-3 opacity-40 hover:opacity-70 transition-opacity" />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-deep-charcoal text-white text-xs rounded-lg shadow-xl z-50 whitespace-nowrap"
          >
            {text}
            <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-deep-charcoal" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section id="pricing" className="py-16 md:py-24 lg:py-32 bg-sand-100">
      <div className="max-w-7xl mx-auto px-6">
        <ScrollReveal className="text-center mb-12">
          <span
            className="text-[11px] font-mono font-medium tracking-[0.15em] text-sage-500 uppercase"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Pricing
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-serif font-semibold text-deep-charcoal"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Access the Swarm
          </h2>
        </ScrollReveal>

        {/* Billing toggle */}
        <ScrollReveal delay={0.1} className="flex justify-center mb-8 sm:mb-12 px-4">
          <div className="inline-flex items-center gap-2 sm:gap-4 p-1 sm:p-1.5 rounded-full bg-white border border-sand-200 shadow-sm">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                !isYearly
                  ? "bg-sage-400 text-white shadow-md"
                  : "text-deep-charcoal/60 hover:text-deep-charcoal"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 relative ${
                isYearly
                  ? "bg-sage-400 text-white shadow-md"
                  : "text-deep-charcoal/60 hover:text-deep-charcoal"
              }`}
            >
              Yearly
              {isYearly && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-sm"
                >
                  -25%
                </motion.span>
              )}
            </button>
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-center">
          {plans.map((plan, i) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const displayPrice = price === 0 ? "$0" : `$${price}`;
            const savings = plan.monthlyPrice > 0 ? Math.round((1 - plan.yearlyPrice / plan.monthlyPrice) * 100) : 0;

            return (
              <ScrollReveal key={plan.name} delay={i * 0.1}>
                <div
                  className={`relative rounded-2xl p-5 sm:p-6 flex flex-col transition-all duration-500 ${
                    plan.popular
                      ? "bg-deep-charcoal text-white sm:col-span-2 lg:col-span-1 lg:-my-4 lg:py-10 shadow-2xl shadow-deep-charcoal/30 lg:scale-105 order-first lg:order-none"
                      : "bg-white border border-sand-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-sand-200/50"
                  }`}
                  style={plan.popular ? {
                    boxShadow: `
                      0 0 0 1px rgba(124, 154, 107, 0.3),
                      0 0 60px rgba(124, 154, 107, 0.2),
                      0 30px 60px -15px rgba(0, 0, 0, 0.5)
                    `,
                  } : {}}
                >
                  {/* Glowing border gradient for Pro */}
                  {plan.popular && (
                    <div
                      className="absolute inset-0 rounded-3xl pointer-events-none"
                      style={{
                        background: "linear-gradient(135deg, rgba(124,154,107,0.4) 0%, transparent 40%, transparent 60%, rgba(124,154,107,0.2) 100%)",
                        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        maskComposite: "xor",
                        WebkitMaskComposite: "xor",
                        padding: "1px",
                      }}
                    />
                  )}

                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-sage-400 text-white text-[11px] font-mono font-semibold tracking-wider rounded-full border border-sage-300 shadow-lg">
                      Most Popular
                    </div>
                  )}

                  <div className={`${plan.popular ? "mb-4" : "mb-5"}`}>
                    <h3
                      className={`text-lg font-semibold ${
                        plan.popular ? "text-white" : "text-deep-charcoal"
                      }`}
                    >
                      {plan.name}
                    </h3>

                    {/* Price with animation on toggle */}
                    <div className="mt-3 flex flex-wrap items-baseline gap-2">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${plan.name}-${isYearly}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`text-3xl sm:text-4xl font-serif font-bold tracking-tight ${
                            plan.popular ? "text-white" : "text-deep-charcoal"
                          }`}
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {displayPrice}
                        </motion.span>
                      </AnimatePresence>
                      <span
                        className={`text-sm font-medium ${
                          plan.popular ? "text-white/50" : "text-deep-charcoal/40"
                        }`}
                      >
                        {plan.period}
                      </span>
                      {/* Savings badge for yearly */}
                      {isYearly && savings > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full"
                        >
                          Save {savings}%
                        </motion.span>
                      )}
                    </div>

                    {/* Yearly total */}
                    {isYearly && price > 0 && (
                      <p className={`mt-1 text-xs ${plan.popular ? "text-white/40" : "text-deep-charcoal/40"}`}>
                        ${price * 12}/year billed annually
                      </p>
                    )}

                    <p
                      className={`mt-3 text-sm ${
                        plan.popular ? "text-white/60" : "text-deep-charcoal/50"
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.text}
                        className={`flex items-start gap-2 ${
                          feature.isInherited
                            ? "pt-2 border-t border-sage-400/20 mt-2"
                            : ""
                        }`}
                      >
                        {feature.isInherited ? (
                          <span className="text-xs font-mono text-sage-400/60 uppercase tracking-wider shrink-0">
                            Includes
                          </span>
                        ) : (
                          <Check
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              feature.highlight
                                ? "text-sage-400"
                                : plan.popular
                                ? "text-sage-400"
                                : "text-sage-500"
                            }`}
                          />
                        )}
                        <FeatureTooltip text={feature.tooltip}>
                          <span
                            className={`text-xs leading-relaxed ${
                              feature.isInherited
                                ? "text-deep-charcoal/40 italic"
                                : feature.highlight
                                ? "text-white font-medium"
                                : plan.popular
                                ? "text-white/80"
                                : "text-deep-charcoal/70"
                            }`}
                          >
                            {feature.text}
                            {feature.hasAgentDots && <AgentDots />}
                          </span>
                        </FeatureTooltip>
                      </li>
                    ))}
                  </ul>

                  {/* Custom buttons based on plan */}
                  {plan.popular ? (
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(124,154,107,0.4)" }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-5 py-3 rounded-full font-bold text-sm bg-sage-400 text-[#111111] hover:bg-sage-500 transition-colors duration-300 shadow-lg shadow-sage-400/30"
                    >
                      {plan.cta}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-5 py-3 rounded-full font-semibold text-sm bg-sand-100 text-deep-charcoal border border-sand-300 hover:bg-sand-200 hover:border-sand-400 transition-colors duration-300"
                    >
                      {plan.cta}
                    </motion.button>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
