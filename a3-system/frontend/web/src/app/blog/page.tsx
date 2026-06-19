import PageLayout from "../components/PageLayout";
import { Calendar, User, Clock, Tag, Zap, Mic, BarChart3, Rocket } from "lucide-react";

const roadmapItems = [
  "Mobile App for iOS and Android",
  "Offline Mode for learning without internet",
  "Teacher Dashboard with analytics",
  "Multi-language Support",
  "LMS Integration",
];

const faqs = [
  { q: "What subjects does NOBOGYAN cover?", a: "Currently focused on cloud computing with 500+ topics. The knowledge graph can be extended to any subject." },
  { q: "How does NOBOGYAN compare to ChatGPT for learning?", a: "ChatGPT is a general-purpose assistant. NOBOGYAN is specifically designed for education with profiling, adaptive paths, multimodal content, and continuous assessment — all working together." },
  { q: "Can I try NOBOGYAN?", a: "We're currently in private beta. Contact us to request early access." },
];

export default function BlogPage() {
  return (
    <PageLayout 
      title="Introducing NOBOGYAN" 
      subtitle="How 15+ AI agents collaborate to build a learning system that actually knows you"
    >
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-deep-charcoal/60">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          May 20, 2026
        </span>
        <span className="flex items-center gap-1">
          <User className="w-4 h-4" />
          VELOX Studio Team
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          8 min read
        </span>
        <span className="flex items-center gap-1">
          <Tag className="w-4 h-4" />
          AI, Education, Technology
        </span>
      </div>

      {/* The Problem */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">The Problem with One-Size-Fits-All Education</h2>
        <p className="text-deep-charcoal/70 leading-relaxed mb-4">
          Think back to your last online course. Did the instructor know your prior knowledge? Did the content adapt when you struggled? Did it accelerate when you already understood the material?
        </p>
        <p className="text-deep-charcoal/70 leading-relaxed mb-4">
          For most of us, the answer is no.
        </p>
        <p className="text-deep-charcoal/70 leading-relaxed">
          Traditional learning platforms deliver identical content to every student. Advanced learners waste time reviewing basics. Struggling learners get left behind. The platform never learns <em>who you are</em>.
        </p>
      </section>

      {/* Meet NOBOGYAN */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Zap className="w-6 h-6 text-sage-500" />
          Meet NOBOGYAN: An Entire AI Team Learning With You
        </h2>
        <p className="text-deep-charcoal/70 leading-relaxed mb-6">
          Today, we're excited to introduce <strong>NOBOGYAN</strong> — an AI learning system that deploys a swarm of 15+ specialized agents, each with a unique role, working together to build a curriculum around you.
        </p>

        <div className="p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50 mb-6">
          <h3 className="text-lg font-semibold text-deep-charcoal mb-4">What Makes NOBOGYAN Different?</h3>
          <p className="text-deep-charcoal/70 mb-4">
            Most AI tools use a single model. NOBOGYAN uses an <strong>orchestrator pattern</strong> where a coordinating agent analyzes your needs and dispatches specialized agents to work in parallel:
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-xl border border-sage-200">
              <p className="font-medium text-deep-charcoal">Scholar</p>
              <p className="text-sm text-deep-charcoal/60">Writes lecture notes tailored to your level</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-sage-200">
              <p className="font-medium text-deep-charcoal">Mapper</p>
              <p className="text-sm text-deep-charcoal/60">Creates mind maps for visual learners</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-sage-200">
              <p className="font-medium text-deep-charcoal">Sage</p>
              <p className="text-sm text-deep-charcoal/60">Generates quizzes that adapt to your weaknesses</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-sage-200">
              <p className="font-medium text-deep-charcoal">Director</p>
              <p className="text-sm text-deep-charcoal/60">Produces video explanations with narration</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-sage-200">
              <p className="font-medium text-deep-charcoal">Architect</p>
              <p className="text-sm text-deep-charcoal/60">Builds coding exercises with instant feedback</p>
            </div>
          </div>
          <p className="text-sm text-deep-charcoal/60 mt-4">
            Behind the scenes, system agents like the <strong>Path Planner</strong>, <strong>Tutor Engine</strong>, and <strong>Faithfulness Checker</strong> work continuously to optimize your experience.
          </p>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Feature Deep Dive</h2>

        {/* Feature 1 */}
        <div className="mb-8 p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="text-xl font-semibold text-deep-charcoal mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 font-bold text-sm">1</span>
            Conversational Profiling: No Forms, Just Chat
          </h3>
          <p className="text-deep-charcoal/70 mb-4">
            Traditional platforms force you through lengthy questionnaires. NOBOGYAN simply chats with you.
          </p>
          <p className="text-deep-charcoal/70 mb-4">
            As you talk about your goals, experience, and learning style, our <strong>Profile Extractor</strong> and <strong>Gap Detector</strong> agents analyze every message to build a six-dimensional learner model:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { title: "Knowledge Base", desc: "What you already know (0.0-1.0 per topic)" },
              { title: "Cognitive Style", desc: "Visual, verbal, or kinesthetic preference" },
              { title: "Weak Points", desc: "Identified gaps via embedding analysis" },
              { title: "Goals & Motivation", desc: "What you're trying to achieve" },
              { title: "Learning Pace", desc: "How fast you absorb new material" },
              { title: "Content Preferences", desc: "Video, text, interactive, or audio" },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-sand-50 rounded-xl">
                <p className="font-medium text-deep-charcoal text-sm">{item.title}</p>
                <p className="text-xs text-deep-charcoal/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature 2 */}
        <div className="mb-8 p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="text-xl font-semibold text-deep-charcoal mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 font-bold text-sm">2</span>
            Multi-Agent Resource Generation: Five Agents, One Click
          </h3>
          <p className="text-deep-charcoal/70 mb-4">
            When you select a topic, the <strong>Orchestrator</strong> dispatches multiple content agents in parallel — generating lecture notes, mind maps, quizzes, video scripts, and coding exercises simultaneously.
          </p>
          <p className="text-deep-charcoal/70">
            Within seconds, you have a complete learning package matched to your profile.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="mb-8 p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="text-xl font-semibold text-deep-charcoal mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 font-bold text-sm">3</span>
            Adaptive Path Planning: A* Search Over Knowledge
          </h3>
          <p className="text-deep-charcoal/70 mb-4">
            NOBOGYAN doesn't just generate resources — it sequences them optimally. Our knowledge graph contains 500+ cloud computing topics connected by prerequisite relationships.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="font-medium text-red-800">Quiz score &lt; 60%</p>
              <p className="text-sm text-red-700">Insert simpler prerequisite resources</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="font-medium text-green-800">Quiz score &gt; 85%</p>
              <p className="text-sm text-green-700">Skip intermediate, unlock advanced</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="font-medium text-amber-800">Stuck too long</p>
              <p className="text-sm text-amber-700">Trigger tutoring intervention</p>
            </div>
          </div>
        </div>

        {/* Feature 4 */}
        <div className="mb-8 p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="text-xl font-semibold text-deep-charcoal mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 font-bold text-sm">4</span>
            <Mic className="w-5 h-5 text-sage-500" />
            Multimodal Tutoring: Text, Voice, Image, Diagram
          </h3>
          <p className="text-deep-charcoal/70 mb-4">
            Need help? The <strong>Tutor Engine</strong> supports:
          </p>
          <ul className="space-y-2 text-deep-charcoal/70">
            <li className="flex items-center gap-2">• <strong>Text chat</strong> with streaming SSE responses</li>
            <li className="flex items-center gap-2">• <strong>Voice input</strong> via iFlytek ASR</li>
            <li className="flex items-center gap-2">• <strong>Voice output</strong> via Edge-TTS with caching</li>
            <li className="flex items-center gap-2">• <strong>Image analysis</strong> for diagram understanding</li>
            <li className="flex items-center gap-2">• <strong>Auto-generated Mermaid charts</strong> for visual explanations</li>
          </ul>
        </div>

        {/* Feature 5 */}
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="text-xl font-semibold text-deep-charcoal mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 font-bold text-sm">5</span>
            <BarChart3 className="w-5 h-5 text-sage-500" />
            Assessment That Adapts With You
          </h3>
          <p className="text-deep-charcoal/70">
            Quizzes aren't static. The <strong>Sage</strong> agent adjusts difficulty based on your mastery. The <strong>Coding Grader</strong> executes your code in a Judge0 sandbox. The <strong>Evaluator</strong> identifies weak topics and automatically triggers remedial resource generation.
          </p>
        </div>
      </section>

      {/* What's Next */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Rocket className="w-6 h-6 text-sage-500" />
          What's Next?
        </h2>
        <p className="text-deep-charcoal/70 mb-4">This is just the beginning. Our roadmap includes:</p>
        <ul className="space-y-2">
          {roadmapItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-deep-charcoal/70">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Try NOBOGYAN */}
      <section className="mb-12 p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Interested in NOBOGYAN?</h2>
        <p className="text-deep-charcoal/70 mb-6">
          We're currently in private beta as we prepare for launch. Contact us to learn more or request early access.
        </p>
        <div className="flex flex-wrap gap-4">
          <a href="/register" className="px-6 py-2 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors">
            Join the Waitlist
          </a>
          <a href="mailto:theveloxstudio@gmail.com" className="px-6 py-2 bg-white text-deep-charcoal rounded-xl font-medium border border-sand-200 hover:border-sage-300 transition-colors">
            Contact Us
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">FAQ</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="p-5 bg-white rounded-xl border border-sand-200">
              <p className="font-semibold text-deep-charcoal mb-2">Q: {faq.q}</p>
              <p className="text-deep-charcoal/70">A: {faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8 border-t border-sand-200">
        <p className="text-lg text-deep-charcoal/70 italic mb-4">
          Ready to experience learning with a swarm of 15+ AI agents?
        </p>
        <a href="/register" className="inline-block px-8 py-3 bg-sage-500 text-white rounded-xl font-semibold hover:bg-sage-600 transition-colors">
          Join the Waitlist →
        </a>
        <p className="text-deep-charcoal/50 mt-6 text-sm">
          Copyright © 2026 VELOX Studio. All rights reserved.
        </p>
      </section>
    </PageLayout>
  );
}
