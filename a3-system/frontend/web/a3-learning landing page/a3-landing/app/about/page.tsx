import PageLayout from "../components/PageLayout";
import { Users, Zap, Brain, Target, BookOpen, Code2, Map, HelpCircle, Video, ShieldCheck, GitBranch, ThumbsUp, Eye, Mic } from "lucide-react";

const contentAgents = [
  { name: "Scholar", desc: "Lecture notes and reading materials", icon: BookOpen },
  { name: "Mapper", desc: "Interactive mind maps and knowledge graphs", icon: Map },
  { name: "Sage", desc: "Adaptive quizzes and assessments", icon: HelpCircle },
  { name: "Director", desc: "Video scripts with narration", icon: Video },
  { name: "Architect", desc: "Programming exercises and code challenges", icon: Code2 },
];

const systemAgents = [
  { name: "Orchestrator", desc: "Task delegation and coordination" },
  { name: "Tutor Engine", desc: "Real-time Q&A and explanations" },
  { name: "Path Planner", desc: "A* algorithm for optimal learning paths" },
  { name: "Recommender", desc: "Content-based and collaborative filtering" },
  { name: "Faithfulness Checker", desc: "Hallucination detection" },
  { name: "Gate Agent", desc: "Milestone validation and unlocking" },
  { name: "Evaluator", desc: "Performance analysis and insights" },
  { name: "Profile Extractor", desc: "Learning profile inference" },
  { name: "Gap Detector", desc: "Knowledge gap identification" },
  { name: "Vision LLM", desc: "Image and diagram analysis" },
  { name: "Voice Agents", desc: "ASR and TTS processing" },
];

const features = [
  { feature: "Conversational Profiling", desc: "Extracts 6-dimension learner profiles through natural chat", innovation: "No forms or explicit questionnaires" },
  { feature: "Multi-Agent Generation", desc: "5 agents generate notes, mind maps, quizzes, video, code simultaneously", innovation: "Parallel async with faithfulness checks" },
  { feature: "Adaptive Path Planning", desc: "A* search over knowledge graphs with real-time replanning", innovation: "Dynamic based on performance signals" },
  { feature: "Multimodal Tutoring", desc: "Text, voice, image, and diagram support in one interface", innovation: "Streaming SSE with context management" },
  { feature: "Assessment & Analytics", desc: "LLM-based evaluation with automatic remediation triggers", innovation: "Closed-loop feedback to profiling" },
];

const metrics = [
  { metric: "Time to First Token", target: "<800ms", achieved: true },
  { metric: "Resource Generation (Text)", target: "<5s", achieved: true },
  { metric: "Resource Generation (Video)", target: "<30s", achieved: true },
  { metric: "Profile Update Latency", target: "<2s", achieved: true },
  { metric: "Path Replanning", target: "<3s", achieved: true },
  { metric: "Concurrent Users", target: "50+", achieved: true },
];

export default function AboutPage() {
  return (
    <PageLayout 
      title="About NOBOGYAN" 
      subtitle="An AI-native personalized education platform"
    >
      {/* Mission */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Target className="w-6 h-6 text-sage-500" />
          Mission
        </h2>
        <p className="text-deep-charcoal/70 leading-relaxed">
          NOBOGYAN is an AI-native personalized education platform that replaces the traditional "one-size-fits-all" curriculum with a dynamic, data-driven approach. Every resource, learning path, and tutoring interaction is customized for each individual student.
        </p>
        <p className="text-deep-charcoal/70 leading-relaxed mt-4">
          Built for the <strong>15th China Software Cup</strong> (iFlytek Track), NOBOGYAN demonstrates how multi-agent AI systems can transform higher education through intelligent orchestration and continuous adaptation.
        </p>
      </section>

      {/* The Story */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">The Story</h2>
        <p className="text-deep-charcoal/70 leading-relaxed mb-4">
          Traditional learning platforms deliver identical content to every student, regardless of their prior knowledge, learning style, or goals. This leads to:
        </p>
        <ul className="space-y-2 mb-4">
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-red-400 mt-2 shrink-0" />
            <span><strong>Boredom</strong> for advanced learners covering known material</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-orange-400 mt-2 shrink-0" />
            <span><strong>Frustration</strong> for struggling learners skipping foundational concepts</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400 mt-2 shrink-0" />
            <span><strong>Inefficiency</strong> with static curricula that can't adapt</span>
          </li>
        </ul>
        <p className="text-deep-charcoal/70 leading-relaxed">
          NOBOGYAN was born from a simple question: <em>What if we could build a system where 15+ AI agents collaborate in real-time to create a unique learning experience for every student?</em>
        </p>
      </section>

      {/* Agent Swarm */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Users className="w-6 h-6 text-sage-500" />
          The Agent Swarm
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Content Agents */}
          <div className="bg-gradient-to-br from-sage-50 to-white rounded-2xl p-6 border border-sage-200/50">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">Content Generation Agents</h3>
            <p className="text-sm text-deep-charcoal/60 mb-4">The Creators</p>
            <div className="space-y-3">
              {contentAgents.map((agent) => (
                <div key={agent.name} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sage-100 flex items-center justify-center shrink-0">
                    <agent.icon className="w-4 h-4 text-sage-600" />
                  </div>
                  <div>
                    <p className="font-medium text-deep-charcoal text-sm">{agent.name}</p>
                    <p className="text-xs text-deep-charcoal/60">{agent.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Agents */}
          <div className="bg-gradient-to-br from-sand-50 to-white rounded-2xl p-6 border border-sand-200/50">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">System Intelligence Agents</h3>
            <p className="text-sm text-deep-charcoal/60 mb-4">The Coordinators</p>
            <div className="space-y-2">
              {systemAgents.map((agent) => (
                <div key={agent.name} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                  <div>
                    <span className="font-medium text-deep-charcoal text-sm">{agent.name}</span>
                    <span className="text-xs text-deep-charcoal/60"> — {agent.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Orchestrator Pattern */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Zap className="w-6 h-6 text-sage-500" />
          Core Innovation: The Orchestrator Pattern
        </h2>
        <p className="text-deep-charcoal/70 leading-relaxed mb-4">
          Unlike single-prompt AI systems, NOBOGYAN uses a coordinating agent that:
        </p>
        <ol className="space-y-2 list-decimal list-inside text-deep-charcoal/70">
          <li>Analyzes the learner's profile and current context</li>
          <li>Decomposes requests into sub-tasks</li>
          <li>Dispatches specialized agents in parallel</li>
          <li>Aggregates and validates outputs</li>
          <li>Delivers a cohesive, multi-format response</li>
        </ol>
        <p className="text-deep-charcoal/70 leading-relaxed mt-4">
          This pattern eliminates reliance on massive prompts and enables true multi-modal generation.
        </p>
      </section>

      {/* Key Features */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Key Features</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Feature</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Description</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Innovation</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={i} className="border-b border-sand-100">
                  <td className="py-3 px-4 font-medium text-deep-charcoal">{f.feature}</td>
                  <td className="py-3 px-4 text-deep-charcoal/70">{f.desc}</td>
                  <td className="py-3 px-4 text-sage-600">{f.innovation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-sand-200 shadow-sm">
              <p className="text-xs text-deep-charcoal/50 mb-1">{m.metric}</p>
              <p className="text-xl font-bold text-deep-charcoal">{m.target}</p>
              <span className="text-xs text-green-600">✓ Achieved</span>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Team</h2>
        <div className="bg-gradient-to-br from-sage-50 to-white rounded-2xl p-6 border border-sage-200/50">
          <h3 className="text-xl font-bold text-deep-charcoal mb-2">VELOX Studio</h3>
          <p className="text-deep-charcoal/70 mb-4">
            A team dedicated to building intelligent educational technology that adapts to each learner's unique needs.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-deep-charcoal/50">Founded</p>
              <p className="font-medium text-deep-charcoal">2026</p>
            </div>
            <div>
              <p className="text-deep-charcoal/50">Focus</p>
              <p className="font-medium text-deep-charcoal">AI-powered adaptive learning</p>
            </div>
            <div>
              <p className="text-deep-charcoal/50">Email</p>
              <a href="mailto:theveloxstudio@gmail.com" className="font-medium text-sage-600 hover:underline">theveloxstudio@gmail.com</a>
            </div>
            <div>
              <p className="text-deep-charcoal/50">Website</p>
              <a href="https://veloxstudio.tech" target="_blank" rel="noopener noreferrer" className="font-medium text-sage-600 hover:underline">veloxstudio.tech</a>
            </div>
          </div>
        </div>
      </section>

      {/* Our Vision */}
      <section className="mb-16">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Our Vision</h2>
        <p className="text-deep-charcoal/70 leading-relaxed mb-4">
          We believe in democratizing quality education through AI. NOBOGYAN is designed to serve:
        </p>
        <ul className="space-y-2 text-deep-charcoal/70">
          <li className="flex items-start gap-2">
            <span className="text-sage-500">•</span>
            Educational institutions seeking adaptive learning platforms
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sage-500">•</span>
            Students who need personalized learning experiences
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sage-500">•</span>
            Professionals looking to upskill efficiently
          </li>
          <li className="flex items-start gap-2">
            <span className="text-sage-500">•</span>
            Organizations investing in employee development
          </li>
        </ul>
      </section>

      {/* Quote */}
      <section className="text-center py-8">
        <p className="text-2xl font-serif italic text-deep-charcoal/80">
          "An entire AI team, learning with you."
        </p>
      </section>
    </PageLayout>
  );
}
