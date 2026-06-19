import PageLayout from "../components/PageLayout";
import { Rocket, Bug, Wrench, Plus, Calendar } from "lucide-react";

const releases = [
  {
    version: "1.3.0",
    date: "June 19, 2026",
    type: "minor",
    title: "Site-Wide Audit & UX Overhaul",
    sections: [
      {
        title: "Added",
        items: [
          "Redesigned new-path loading screen: dark constellation animation with progress ring and particle effects",
          "Redesigned new-path preview page: dark gradient hero header with staggered entrance animations",
          "Simulated incremental node appearance during path generation with countdown timer",
        ],
      },
      {
        title: "Fixed",
        items: [
          "Greenlet async error in hierarchical graph service (db.expire → db.refresh)",
          "Tutor session crash: widened current_node_id column from VARCHAR(50) to VARCHAR(500)",
          "Analytics back button now navigates to notebook with correct graph context",
          "New-path back button goes to profile-summary when no active graph exists",
          "Logo link changed from href=\"#\" to href=\"/\"",
          "Removed duplicate \"tap any topic\" hint from graph component",
        ],
      },
      {
        title: "Changed",
        items: [
          "Removed fabricated social proof: fake testimonials, trust bar, metrics, and 2,547+ waitlist counter",
          "Removed fake 4.9-star / 2,000-review aggregateRating from structured data",
          "Replaced all Sparkles icons with contextual alternatives (Target, Zap, BookOpen, etc.)",
          "Rewrote landing page copy: Hero, FinalCTA, AI Tutor, FeatureSpotlight, TheSwarm, Footer",
          "Updated social links in footer and structured data to real accounts (X, YouTube, veloxstudio.tech)",
          "Fixed blog CTAs from external veloxstudio.tech to internal /register",
          "Reframed Partners page: \"Partners & Tech Stack\" with honest iFlytek description",
          "Removed \"Phase 02:\" / \"Phase 03:\" labels from onboarding pages",
          "Deleted 6 dead files (~3,400 lines): page-old.tsx, Metrics.tsx, Testimonials.tsx, TrustBar.tsx, LiveStats.tsx, metrics.tsx",
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    date: "June 18, 2026",
    type: "minor",
    title: "Authentication, Onboarding & Streaming",
    sections: [
      {
        title: "Added",
        items: [
          "JWT authentication on all API endpoints",
          "Onboarding tour for first-time notebook users with panel interaction",
          "Streamed quiz generation for 3-4x faster perceived response",
          "Streamed learning path generation — milestones appear in ~60s, subtopics fill progressively",
        ],
      },
      {
        title: "Fixed",
        items: [
          "Learning path now starts from the first milestone correctly",
          "Onboarding tour text updated to match actual project features",
          "Stale data display and streaming UX issues in path preview",
          "Docker build, Netlify routing, shadowed import, compose deprecation",
        ],
      },
      {
        title: "Changed",
        items: [
          "Prioritized first milestone subtopic generation for faster initial load",
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "June 16-17, 2026",
    type: "minor",
    title: "Kimi k2.6 Migration & Stability Fixes",
    sections: [
      {
        title: "Added",
        items: [
          "Two-pass lazy learning-path generation for better performance",
          "Parallel subtopic materialization",
        ],
      },
      {
        title: "Fixed",
        items: [
          "Quiz results 500 error: select latest attempt instead of scalar_one_or_none",
          "Quiz results 422 error: pass student_id as query param",
          "Mermaid syntax-error crashes in AI tutor: guard partial/streaming diagrams",
          "Code agent truncation and parallelized grading",
          "Faithfulness fail-closed + notes partial-credit gate logic",
          "Milestone progression, navigation, gate tracking, and async remediation (E2E fixes)",
          "Silent template fallbacks in LLM provider",
        ],
      },
      {
        title: "Changed",
        items: [
          "Migrated to Kimi k2.6 as production LLM provider with reasoning toggle",
          "Streamed resources to frontend in real time",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "May 21, 2026",
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
          "Firebase waitlist integration with performance optimizations",
          "SEO: favicon, meta tags, Open Graph, Twitter cards, JSON-LD structured data, robots.txt, sitemap",
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
          "Scholar Agent: Lecture notes and reading materials (Markdown)",
          "Mapper Agent: Interactive visual mind maps (JSON → SVG)",
          "Sage Agent: Adaptive assessments with difficulty scoring",
          "Director Agent: Video scripts with TTS narration",
          "Architect Agent: Programming exercises with Judge0 sandbox integration",
          "Parallel async generation with faithfulness verification",
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
          "Streaming SSE responses with rolling context window (8,000 tokens)",
          "Multimodal input/output (text, voice, image, diagrams)",
          "RAG grounding with Weaviate vector database",
          "Profile-aware responses with auto-generated Mermaid diagrams",
        ],
      },
      {
        title: "Feature 5: Learning Assessment and Analytics",
        items: [
          "Adaptive quiz difficulty based on mastery level",
          "LLM-based short answer grading",
          "Code execution via Judge0 sandbox",
          "Gate-based milestone unlocking",
          "Comprehensive analytics dashboard with LLM-powered insights",
        ],
      },
    ],
  },
];

const roadmap = [
  {
    version: "v1.4.0 — Planned",
    items: [
      "Teacher dashboard with class-level analytics",
      "Video generation from Director agent scripts",
      "Console log cleanup across frontend",
      "Self-hosted fonts (replace external Fontshare CDN)",
      "CORS lockdown for production deployment",
    ],
  },
  {
    version: "v2.0.0 — Future",
    items: [
      "Multi-language support (Chinese, English, more)",
      "Mobile app (React Native)",
      "Offline mode for learning without internet",
      "LMS integration (Moodle, Canvas)",
      "Extended knowledge graphs beyond cloud computing",
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
