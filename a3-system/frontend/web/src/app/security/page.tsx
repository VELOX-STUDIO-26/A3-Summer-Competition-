import PageLayout from "../components/PageLayout";
import { Shield, Lock, Server, Code, Brain, AlertTriangle, CheckCircle, Mail, Clock, Users } from "lucide-react";

const securityMeasures = [
  {
    category: "Data Protection",
    icon: Lock,
    items: [
      { title: "Encryption in Transit", desc: "TLS 1.3 for all data transmission" },
      { title: "Encryption at Rest", desc: "AES-256 encryption for stored data" },
      { title: "Database Security", desc: "Encrypted connections and backups" },
      { title: "API Security", desc: "HTTPS only, no HTTP fallback" },
    ],
  },
  {
    category: "Authentication",
    icon: Users,
    items: [
      { title: "JWT Tokens", desc: "JSON Web Tokens for session management" },
      { title: "Password Hashing", desc: "Secure bcrypt hashing" },
      { title: "MFA Support", desc: "Multi-factor authentication (planned)" },
      { title: "Session Timeout", desc: "Automatic timeout after inactivity" },
    ],
  },
  {
    category: "Infrastructure",
    icon: Server,
    items: [
      { title: "Firewalls", desc: "Network segmentation and protection" },
      { title: "DDoS Protection", desc: "Distributed denial-of-service mitigation" },
      { title: "Containerization", desc: "Docker with isolated environments" },
      { title: "Backup & Recovery", desc: "Automated backups and disaster recovery" },
    ],
  },
  {
    category: "Application Security",
    icon: Code,
    items: [
      { title: "Input Validation", desc: "Sanitization of all user inputs" },
      { title: "SQL Injection Prevention", desc: "Parameterized queries" },
      { title: "XSS Protection", desc: "Output encoding" },
      { title: "CSRF Tokens", desc: "Protection for state-changing operations" },
    ],
  },
];

const aiSafety = [
  { title: "Hallucination Prevention", desc: "Faithfulness checker on all AI outputs" },
  { title: "RAG Grounding", desc: "Verified sources for content generation" },
  { title: "Content Moderation", desc: "iFlytek API integration for safety filtering" },
  { title: "Prompt Injection Protection", desc: "Context isolation between users" },
];

const responseTimeline = [
  { stage: "Initial Response", time: "48 hours" },
  { stage: "Acknowledgment", time: "72 hours" },
  { stage: "Update on Progress", time: "Weekly" },
  { stage: "Resolution", time: "90 days maximum" },
];

const userChecklist = [
  "Use a strong, unique password",
  "Enable MFA when available",
  "Don't share account credentials",
  "Log out on shared devices",
  "Report suspicious activity",
  "Keep your browser updated",
];

const roadmap = {
  current: ["Core encryption and authentication", "Input validation and sanitization", "Rate limiting and DDoS protection", "Content moderation"],
  planned: ["Multi-factor authentication (MFA)", "Advanced threat detection", "Security audit logging", "Penetration testing"],
  future: ["SOC 2 compliance", "Bug bounty program", "Third-party security certifications", "Advanced anomaly detection"],
};

export default function SecurityPage() {
  return (
    <PageLayout 
      title="Security Policy" 
      subtitle="How we protect your data and maintain system security"
      lastUpdated="May 20, 2026"
    >
      {/* Commitment */}
      <section className="mb-12">
        <div className="p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
          <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
            <Shield className="w-6 h-6 text-sage-500" />
            Security Commitment
          </h2>
          <p className="text-deep-charcoal/70 mb-4">We are committed to:</p>
          <ul className="text-deep-charcoal/70 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Protecting user data through industry-standard practices
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Maintaining transparency about security measures
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Promptly addressing security vulnerabilities
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Continuously improving our security posture
            </li>
          </ul>
        </div>
      </section>

      {/* Security Measures */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Security Measures</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {securityMeasures.map((measure, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-sand-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                  <measure.icon className="w-5 h-5 text-sage-600" />
                </div>
                <h3 className="text-lg font-semibold text-deep-charcoal">{measure.category}</h3>
              </div>
              <div className="space-y-3">
                {measure.items.map((item, j) => (
                  <div key={j}>
                    <p className="font-medium text-deep-charcoal text-sm">{item.title}</p>
                    <p className="text-xs text-deep-charcoal/60">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI and Content Safety */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Brain className="w-6 h-6 text-sage-500" />
          AI and Content Safety
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {aiSafety.map((item, i) => (
            <div key={i} className="p-5 bg-gradient-to-br from-sage-50 to-white rounded-xl border border-sage-200/50">
              <h3 className="font-semibold text-deep-charcoal mb-1">{item.title}</h3>
              <p className="text-sm text-deep-charcoal/70">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 p-5 bg-white rounded-xl border border-sand-200">
          <h3 className="font-semibold text-deep-charcoal mb-2">Data Privacy in AI</h3>
          <ul className="text-sm text-deep-charcoal/70 space-y-1">
            <li>• No training on user data without consent</li>
            <li>• Context isolation between users</li>
            <li>• Prompt injection protection</li>
          </ul>
        </div>
      </section>

      {/* Vulnerability Disclosure */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-sage-500" />
          Vulnerability Disclosure
        </h2>

        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 mb-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-4">Reporting Security Issues</h3>
          <p className="text-amber-700 mb-4">
            If you discover a security vulnerability, please report it responsibly:
          </p>
          <div className="bg-white/70 rounded-xl p-4 mb-4">
            <p className="text-amber-800"><strong>Email:</strong> theveloxstudio@gmail.com</p>
            <p className="text-amber-800"><strong>Subject:</strong> "[SECURITY] Vulnerability Report"</p>
          </div>
          <p className="text-amber-700 mb-2">Include in your report:</p>
          <ul className="text-amber-700 space-y-1 ml-4 text-sm">
            <li>• Description of the vulnerability</li>
            <li>• Steps to reproduce</li>
            <li>• Potential impact assessment</li>
            <li>• Suggested mitigation (if any)</li>
            <li>• Your contact information</li>
          </ul>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="text-lg font-semibold text-deep-charcoal mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sage-500" />
            Response Timeline
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Stage</th>
                  <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Timeframe</th>
                </tr>
              </thead>
              <tbody>
                {responseTimeline.map((r, i) => (
                  <tr key={i} className="border-b border-sand-100">
                    <td className="py-3 px-4 text-deep-charcoal/70">{r.stage}</td>
                    <td className="py-3 px-4 font-medium text-sage-600">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-6 bg-green-50 rounded-2xl border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-3">No Legal Action</h3>
          <p className="text-green-700 mb-3">
            We will not take legal action against security researchers who:
          </p>
          <ul className="text-green-700 space-y-1 ml-4">
            <li>• Follow responsible disclosure</li>
            <li>• Do not access others' data</li>
            <li>• Do not cause harm or service disruption</li>
            <li>• Report in good faith</li>
          </ul>
        </div>
      </section>

      {/* User Security Checklist */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Security Checklist for Users</h2>
        <div className="p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
          <div className="grid md:grid-cols-2 gap-4">
            {userChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-deep-charcoal/70">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Roadmap */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Security Roadmap</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-green-50 rounded-2xl border border-green-200">
            <h3 className="font-semibold text-green-800 mb-4">Current (v1.0)</h3>
            <ul className="space-y-2">
              {roadmap.current.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-4">Planned (v1.1)</h3>
            <ul className="space-y-2">
              {roadmap.planned.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-amber-700 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-4">Future (v2.0)</h3>
            <ul className="space-y-2">
              {roadmap.future.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-blue-700 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Compliance</h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="font-semibold text-deep-charcoal mb-4">Standards Alignment</h3>
          <p className="text-deep-charcoal/70 mb-4">Our security practices align with:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-sand-50 rounded-xl text-center">
              <p className="font-semibold text-deep-charcoal">OWASP Top 10</p>
            </div>
            <div className="p-4 bg-sand-50 rounded-xl text-center">
              <p className="font-semibold text-deep-charcoal">GDPR Principles</p>
            </div>
            <div className="p-4 bg-sand-50 rounded-xl text-center">
              <p className="font-semibold text-deep-charcoal">Industry Best Practices</p>
            </div>
            <div className="p-4 bg-sand-50 rounded-xl text-center">
              <p className="font-semibold text-deep-charcoal">Competition Requirements</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-12 p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Mail className="w-6 h-6 text-sage-500" />
          Contact Security Team
        </h2>
        <p className="text-deep-charcoal/70 mb-4">For security-related inquiries:</p>
        <div className="space-y-2 text-deep-charcoal/70">
          <p><strong>Email:</strong> <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">theveloxstudio@gmail.com</a></p>
          <p><strong>Subject:</strong> Please include "[SECURITY]" in subject line</p>
          <p className="text-sm text-deep-charcoal/50 mt-2">PGP Key: Available upon request for encrypted communications</p>
        </div>
      </section>

      {/* Acknowledgments */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Acknowledgments</h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <p className="text-deep-charcoal/70 mb-4">
            We thank the security community for their contributions to making NOBOGYAN safer.
          </p>
          <p className="text-deep-charcoal/70">
            <strong>Hall of Fame:</strong> Security researchers who have responsibly disclosed vulnerabilities will be listed here (with permission).
          </p>
        </div>
      </section>

      {/* Footer */}
      <section className="text-center py-8 border-t border-sand-200">
        <p className="text-deep-charcoal/60 italic">
          Security is an ongoing process. We continuously evaluate and improve our security posture to protect our users and their data.
        </p>
        <p className="text-deep-charcoal/50 mt-4 text-sm">
          Copyright © 2026 VELOX Studio. All rights reserved.
        </p>
      </section>
    </PageLayout>
  );
}
