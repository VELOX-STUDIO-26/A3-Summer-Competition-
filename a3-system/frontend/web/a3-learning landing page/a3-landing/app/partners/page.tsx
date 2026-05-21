import PageLayout from "../components/PageLayout";
import { Handshake, Building2, GraduationCap, Code, FileText, Shield, Mail } from "lucide-react";

const techStack = [
  { partner: "OpenRouter", tech: "Model aggregation", useCase: "LLM routing and fallbacks" },
  { partner: "PostgreSQL", tech: "Database", useCase: "Primary data storage" },
  { partner: "Redis", tech: "Caching", useCase: "Sessions and performance" },
  { partner: "Weaviate", tech: "Vector DB", useCase: "Semantic search and RAG" },
  { partner: "Docker", tech: "Containerization", useCase: "Deployment and scaling" },
  { partner: "Next.js", tech: "Framework", useCase: "Frontend application" },
  { partner: "FastAPI", tech: "Framework", useCase: "Backend APIs" },
  { partner: "Judge0", tech: "Code execution", useCase: "Coding exercise sandbox" },
];

const partnerBenefits = {
  educational: [
    "Early access to new features",
    "Dedicated support channel",
    "Co-marketing opportunities",
    "Custom integration support",
    "Analytics dashboard access",
  ],
  technology: [
    "API integration support",
    "Joint case studies",
    "Technical documentation",
    "Co-development opportunities",
    "Community recognition",
  ],
};

export default function PartnersPage() {
  return (
    <PageLayout 
      title="Partners" 
      subtitle="Collaborating with leaders in technology and education"
    >
      {/* Intro */}
      <section className="mb-12">
        <p className="text-lg text-deep-charcoal/70 leading-relaxed">
          NOBOGYAN is proud to collaborate with leading technology and education partners who share our vision for personalized, AI-powered learning.
        </p>
      </section>

      {/* iFlytek Partner */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Technology Partners</h2>
        <div className="p-8 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-sage-100 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-sage-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-deep-charcoal">iFlytek</h3>
              <p className="text-sage-600 font-medium">LLM and AI Technology Partner</p>
            </div>
          </div>
          
          <p className="text-deep-charcoal/70 mb-6">
            iFlytek provides the Spark LLM foundation that powers NOBOGYAN's intelligence layer:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white/70 rounded-xl">
              <p className="font-semibold text-deep-charcoal mb-1">Spark LLM v3.5+</p>
              <p className="text-sm text-deep-charcoal/60">Core reasoning and natural language understanding</p>
            </div>
            <div className="p-4 bg-white/70 rounded-xl">
              <p className="font-semibold text-deep-charcoal mb-1">TTS SDK</p>
              <p className="text-sm text-deep-charcoal/60">Voice synthesis for tutoring features</p>
            </div>
            <div className="p-4 bg-white/70 rounded-xl">
              <p className="font-semibold text-deep-charcoal mb-1">ASR</p>
              <p className="text-sm text-deep-charcoal/60">Speech recognition for voice input</p>
            </div>
            <div className="p-4 bg-white/70 rounded-xl">
              <p className="font-semibold text-deep-charcoal mb-1">Content Moderation API</p>
              <p className="text-sm text-deep-charcoal/60">Safety filtering for educational content</p>
            </div>
          </div>

          <div className="border-t border-sage-200/50 pt-6">
            <h4 className="font-semibold text-deep-charcoal mb-3">Partnership Highlights</h4>
            <ul className="space-y-2 text-deep-charcoal/70">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                Integration with iFlytek's advanced Chinese language models
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                WebSocket-based streaming for real-time interactions
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                Enterprise-grade content moderation
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 shrink-0" />
                Competition track alignment (15th China Software Cup)
              </li>
            </ul>
          </div>

          <a 
            href="https://open.xfyun.cn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block mt-6 px-6 py-2 bg-sage-500 text-white rounded-xl font-medium hover:bg-sage-600 transition-colors"
          >
            Visit iFlytek →
          </a>
        </div>
      </section>

      {/* Academic Partners */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-sage-500" />
          Academic Partners
        </h2>
        <div className="p-6 bg-gradient-to-br from-sand-50 to-white rounded-2xl border border-sand-200/50">
          <p className="text-deep-charcoal/70 mb-4">We are actively seeking partnerships with:</p>
          <ul className="space-y-2 text-deep-charcoal/70 mb-6">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
              Universities and colleges
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
              Online learning platforms
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
              Educational research institutions
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
              Technical training centers
            </li>
          </ul>
          <p className="text-sm text-deep-charcoal/60">
            If your institution is interested in piloting NOBOGYAN or collaborating on research, please contact us at{" "}
            <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">
              theveloxstudio@gmail.com
            </a>
          </p>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Code className="w-6 h-6 text-sage-500" />
          Technology Stack Partners
        </h2>
        <p className="text-deep-charcoal/70 mb-6">NOBOGYAN is built on and integrated with:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Partner</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Technology</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Use Case</th>
              </tr>
            </thead>
            <tbody>
              {techStack.map((t, i) => (
                <tr key={i} className="border-b border-sand-100">
                  <td className="py-3 px-4 font-medium text-deep-charcoal">{t.partner}</td>
                  <td className="py-3 px-4 text-deep-charcoal/70">{t.tech}</td>
                  <td className="py-3 px-4 text-sage-600">{t.useCase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Become a Partner */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Handshake className="w-6 h-6 text-sage-500" />
          Become a Partner
        </h2>
        <p className="text-deep-charcoal/70 mb-6">We're looking for partners who share our vision:</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-sand-200 shadow-sm">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-3">Educational Institutions</h3>
            <ul className="space-y-2 text-sm text-deep-charcoal/70">
              <li>• Pilot NOBOGYAN with your students</li>
              <li>• Co-develop curriculum-specific features</li>
              <li>• Research collaboration on adaptive learning</li>
            </ul>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-sand-200 shadow-sm">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-3">Technology Companies</h3>
            <ul className="space-y-2 text-sm text-deep-charcoal/70">
              <li>• Integrate your services into our platform</li>
              <li>• White-label solutions</li>
              <li>• API partnerships</li>
            </ul>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-sand-200 shadow-sm">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-3">Content Providers</h3>
            <ul className="space-y-2 text-sm text-deep-charcoal/70">
              <li>• Integrate your educational content</li>
              <li>• RAG knowledge base partnerships</li>
              <li>• Content licensing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Partner Benefits */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Partner Benefits</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">For Educational Partners</h3>
            <ul className="space-y-2">
              {partnerBenefits.educational.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-deep-charcoal/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-400" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 bg-gradient-to-br from-sand-50 to-white rounded-2xl border border-sand-200/50">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">For Technology Partners</h3>
            <ul className="space-y-2">
              {partnerBenefits.technology.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-deep-charcoal/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-sand-400" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Shield className="w-6 h-6 text-sage-500" />
          Trust & Security
        </h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <p className="text-deep-charcoal/70 mb-4">Partners can trust NOBOGYAN with their data:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <p className="font-semibold text-deep-charcoal">Data Privacy</p>
              <p className="text-sm text-deep-charcoal/60">Strict data handling policies</p>
            </div>
            <div className="text-center p-4">
              <p className="font-semibold text-deep-charcoal">Security</p>
              <p className="text-sm text-deep-charcoal/60">Enterprise-grade practices</p>
            </div>
            <div className="text-center p-4">
              <p className="font-semibold text-deep-charcoal">Compliance</p>
              <p className="text-sm text-deep-charcoal/60">GDPR-aligned protection</p>
            </div>
            <div className="text-center p-4">
              <p className="font-semibold text-deep-charcoal">Transparency</p>
              <p className="text-sm text-deep-charcoal/60">Clear terms & agreements</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="text-center py-8 border-t border-sand-200">
        <h2 className="text-xl font-serif font-semibold text-deep-charcoal mb-4">Contact for Partnerships</h2>
        <a 
          href="mailto:theveloxstudio@gmail.com?subject=[Partnership Inquiry]"
          className="inline-flex items-center gap-2 px-8 py-3 bg-sage-500 text-white rounded-xl font-semibold hover:bg-sage-600 transition-colors"
        >
          <Mail className="w-5 h-5" />
          theveloxstudio@gmail.com
        </a>
        <p className="text-sm text-deep-charcoal/50 mt-4">
          Subject: "[Partnership Inquiry]"
        </p>
      </section>

      {/* Closing */}
      <section className="text-center py-8">
        <p className="text-lg text-deep-charcoal/70 italic">
          Together, we're building the future of personalized education.
        </p>
      </section>
    </PageLayout>
  );
}
