import PageLayout from "../components/PageLayout";
import { Rocket, Bug, Wrench, Plus, Calendar } from "lucide-react";

const releases = [
  {
    version: "1.0.0",
    date: "May 20, 2026",
    type: "major",
    title: "Initial Release",
    sections: [
      {
        title: "Core Platform",
        items: [
          "Multi-Agent Architecture: 15+ specialized AI agents working in coordination",
          "Orchestrator Pattern: Central agent for task delegation and coordination",
          "FastAPI Backend: High-performance async REST API with SSE streaming support",
          "Next.js 16 Frontend: Modern React app with App Router and Server Components",
          "Docker Compose Setup: Complete containerized development environment",
        ],
      },
      {
        title: "Feature 1: Conversational Learner Profiling",
        items: [
          "Natural language dialogue-based profile extraction",
          "Six-dimensional learner model (Knowledge, Cognitive Style, Weak Points, Goals, Pace, Preferences)",
          "Embedding-based gap detection using cosine similarity",
          "Dynamic profile updates with confidence-weighted averaging",
          "Chat-based onboarding UI",
        ],
      },
      {
        title: "Feature 2: Multi-Agent Resource Generation",
        items: [
          "Content Agent: Lecture notes and reading materials (Markdown/PDF)",
          "Mind Map Agent: Interactive visual knowledge graphs (JSON → SVG)",
          "Quiz Agent: Adaptive assessments with difficulty scoring",
          "Media Agent: Video scripts with TTS narration",
          "Code Agent: Programming exercises with Judge0 sandbox integration",
          "Parallel async generation (30-60s total)",
          "Faithfulness verification on every output",
        ],
      },
      {
        title: "Feature 3: Adaptive Learning Path Planning",
        items: [
          "A* search algorithm over knowledge graph",
          "500+ cloud computing topics indexed",
          "Dynamic path replanning based on quiz performance",
          "Milestone-based progression with gates",
          "Content-based + collaborative filtering recommendations",
        ],
      },
      {
        title: "Feature 4: Real-Time AI Tutoring",
        items: [
          "Streaming SSE responses",
          "Multimodal input/output (text, voice, image, diagrams)",
          "RAG grounding with Weaviate vector database",
          "Rolling context window (8,000 tokens) with LLM summarization",
          "Profile-aware responses",
        ],
      },
      {
        title: "Feature 5: Learning Assessment and Analytics",
        items: [
          "Adaptive quiz difficulty based on mastery",
          "LLM-based short answer grading",
          "Code execution via Judge0 sandbox",
          "Gate-based milestone unlocking",
          "Comprehensive analytics dashboard",
        ],
      },
    ],
  },
  {
    version: "0.9.0",
    date: "May 15, 2026",
    type: "minor",
    title: "Visualization & Performance",
    sections: [
      {
        title: "Added",
        items: [
          "Complete agent swarm visualization",
          "Interactive demo widget",
          "Landing page with swarm animations",
          "Performance optimizations for concurrent users",
        ],
      },
      {
        title: "Fixed",
        items: [
          "Database connection pooling issues",
          "WebSocket reconnection handling",
          "Memory leaks in conversation manager",
        ],
      },
    ],
  },
  {
    version: "0.8.0",
    date: "May 10, 2026",
    type: "minor",
    title: "Multimodal Capabilities",
    sections: [
      {
        title: "Added",
        items: [
          "Vision LLM integration for image analysis",
          "Mermaid diagram auto-generation",
          "Voice chat capabilities",
          "Enhanced TTS caching",
        ],
      },
      {
        title: "Changed",
        items: [
          "Improved path planning algorithm with PageRank heuristics",
          "Optimized RAG chunking strategy",
        ],
      },
    ],
  },
  {
    version: "0.7.0",
    date: "May 5, 2026",
    type: "minor",
    title: "Analytics & Evaluation",
    sections: [
      {
        title: "Added",
        items: [
          "Analytics dashboard",
          "Behavioral tracking",
          "Gate agent for milestone validation",
          "Evaluator agent for performance analysis",
        ],
      },
      {
        title: "Fixed",
        items: [
          "Quiz generation JSON truncation issues",
          "Profile update race conditions",
        ],
      },
    ],
  },
  {
    version: "0.6.0",
    date: "April 28, 2026",
    type: "minor",
    title: "Code Execution",
    sections: [
      {
        title: "Added",
        items: [
          "Code execution sandbox (Judge0)",
          "Coding exercise generation",
          "Coding grader agent",
        ],
      },
    ],
  },
  {
    version: "0.5.0",
    date: "April 20, 2026",
    type: "minor",
    title: "Video Generation",
    sections: [
      {
        title: "Added",
        items: [
          "Video generation pipeline",
          "Media agent with TTS integration",
          "Faithfulness checker layer",
        ],
      },
    ],
  },
  {
    version: "0.4.0",
    date: "April 15, 2026",
    type: "minor",
    title: "Mind Maps & Quizzes",
    sections: [
      {
        title: "Added",
        items: [
          "Mind map generation (SVG)",
          "Interactive knowledge graph visualization",
          "Quiz agent with difficulty scoring",
        ],
      },
    ],
  },
  {
    version: "0.3.0",
    date: "April 10, 2026",
    type: "minor",
    title: "Path Planning",
    sections: [
      {
        title: "Added",
        items: [
          "Path planning algorithm (A* search)",
          "Milestone management",
          "Recommendation engine",
        ],
      },
    ],
  },
  {
    version: "0.2.0",
    date: "April 5, 2026",
    type: "minor",
    title: "Content Generation",
    sections: [
      {
        title: "Added",
        items: [
          "Content agent for lecture notes",
          "Profile extraction pipeline",
          "Gap detection via embeddings",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "April 1, 2026",
    type: "minor",
    title: "Project Foundation",
    sections: [
      {
        title: "Added",
        items: [
          "Project scaffolding",
          "Docker compose setup",
          "Basic FastAPI structure",
          "Next.js frontend foundation",
        ],
      },
    ],
  },
];

const roadmap = [
  {
    version: "v1.1.0",
    items: [
      "Mobile app (React Native)",
      "Offline mode support",
      "Advanced analytics with ML predictions",
      "Teacher dashboard",
      "Content authoring tools",
    ],
  },
  {
    version: "v1.2.0",
    items: [
      "Multi-language support",
      "Integration with LMS platforms",
      "Advanced collaboration features",
      "White-label options",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <PageLayout 
      title="Changelog" 
      subtitle="All notable changes to the NOBOGYAN Learning System"
    >
      {/* Timeline */}
      <div className="space-y-12">
        {releases.map((release, idx) => (
          <div key={release.version} className="relative">
            {/* Version Badge */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`px-4 py-2 rounded-full font-mono font-bold text-white ${
                release.type === "major" ? "bg-sage-500" : "bg-sand-400"
              }`}>
                v{release.version}
              </div>
              <div className="flex items-center gap-2 text-deep-charcoal/50">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{release.date}</span>
              </div>
              {release.type === "major" && (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                  Major Release
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">
              {release.title}
            </h2>

            {/* Sections */}
            <div className="space-y-6 pl-4 border-l-2 border-sand-200">
              {release.sections.map((section, sIdx) => (
                <div key={sIdx} className="relative">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-sage-400" />
                  <div className="pl-6">
                    <h3 className="text-lg font-semibold text-deep-charcoal mb-3 flex items-center gap-2">
                      {section.title.includes("Added") && <Plus className="w-4 h-4 text-green-500" />}
                      {section.title.includes("Fixed") && <Bug className="w-4 h-4 text-red-500" />}
                      {section.title.includes("Changed") && <Wrench className="w-4 h-4 text-orange-500" />}
                      {section.title}
                    </h3>
                    <ul className="space-y-2">
                      {section.items.map((item, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-2 text-deep-charcoal/70 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <section className="mt-16 pt-16 border-t border-sand-200">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Rocket className="w-6 h-6 text-sage-500" />
          Future Roadmap
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {roadmap.map((r) => (
            <div key={r.version} className="bg-gradient-to-br from-sage-50 to-white rounded-2xl p-6 border border-sage-200/50">
              <h3 className="text-lg font-bold text-deep-charcoal mb-4">{r.version}</h3>
              <ul className="space-y-2">
                {r.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-deep-charcoal/70 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mt-12 text-center">
        <p className="text-deep-charcoal/60">
          For questions about the changelog:{" "}
          <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">
            theveloxstudio@gmail.com
          </a>
        </p>
      </section>
    </PageLayout>
  );
}
