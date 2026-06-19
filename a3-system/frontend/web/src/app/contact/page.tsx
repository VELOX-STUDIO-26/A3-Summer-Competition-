import PageLayout from "../components/PageLayout";
import { Mail, Globe, Clock, Users, GraduationCap, Code, FlaskConical, MessageSquare } from "lucide-react";

const responseTimes = [
  { type: "Technical Support", time: "24 hours" },
  { type: "Bug Reports", time: "48 hours" },
  { type: "Feature Requests", time: "72 hours" },
  { type: "Partnership Inquiries", time: "5 business days" },
  { type: "General Questions", time: "48 hours" },
];

const audiences = [
  {
    title: "Students",
    icon: GraduationCap,
    desc: "Need help using NOBOGYAN for your studies?",
    items: ["Check our documentation first", "Email with subject \"[Student Help]\""],
  },
  {
    title: "Educators",
    icon: Users,
    desc: "Interested in using NOBOGYAN for your institution?",
    items: ["Pilot programs for your students", "Curriculum co-development", "Research collaboration", "Email with subject \"[Education Partnership]\""],
  },
  {
    title: "Developers",
    icon: Code,
    desc: "Want to contribute or collaborate?",
    items: ["Open-source contributions", "Technical collaboration", "Email with subject \"[Developer Inquiry]\""],
  },
  {
    title: "Researchers",
    icon: FlaskConical,
    desc: "Studying adaptive learning or multi-agent AI?",
    items: ["Collaboration opportunities", "Research partnerships", "Email with subject \"[Research Collaboration]\""],
  },
];

export default function ContactPage() {
  return (
    <PageLayout 
      title="Contact Us" 
      subtitle="Get in touch with the NOBOGYAN team"
    >
      {/* Intro */}
      <section className="mb-12">
        <p className="text-lg text-deep-charcoal/70 leading-relaxed">
          We're here to help you get the most out of the NOBOGYAN Learning System. Whether you're a student, educator, developer, or just curious about our technology, we'd love to hear from you.
        </p>
      </section>

      {/* Main Contact */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">General Inquiries</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <a 
            href="mailto:theveloxstudio@gmail.com"
            className="flex items-center gap-4 p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50 hover:shadow-lg transition-shadow group"
          >
            <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center group-hover:bg-sage-200 transition-colors">
              <Mail className="w-6 h-6 text-sage-600" />
            </div>
            <div>
              <p className="text-sm text-deep-charcoal/50">Email</p>
              <p className="font-semibold text-deep-charcoal">theveloxstudio@gmail.com</p>
            </div>
          </a>
          <a 
            href="https://veloxstudio.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-6 bg-gradient-to-br from-sand-50 to-white rounded-2xl border border-sand-200/50 hover:shadow-lg transition-shadow group"
          >
            <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center group-hover:bg-sand-200 transition-colors">
              <Globe className="w-6 h-6 text-sand-600" />
            </div>
            <div>
              <p className="text-sm text-deep-charcoal/50">Website</p>
              <p className="font-semibold text-deep-charcoal">veloxstudio.tech</p>
            </div>
          </a>
        </div>
        <p className="text-sm text-deep-charcoal/50 mt-4">
          We aim to respond to all inquiries within 24-48 hours during business days.
        </p>
      </section>

      {/* Support Channels */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Support Channels</h2>
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-sand-200 shadow-sm">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-2">Technical Support</h3>
            <p className="text-deep-charcoal/70 mb-3">Experiencing issues with NOBOGYAN? Our technical team is ready to help.</p>
            <p className="text-sm text-deep-charcoal/60">
              <strong>Subject Line:</strong> Please include "[Technical Support]" for faster routing
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200 shadow-sm">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-2">Bug Reports</h3>
            <p className="text-deep-charcoal/70 mb-3">Found a bug? Help us improve by reporting it.</p>
            <p className="text-sm text-deep-charcoal/60 mb-2"><strong>Include in your report:</strong></p>
            <ul className="text-sm text-deep-charcoal/60 space-y-1 ml-4">
              <li>• Description of the issue</li>
              <li>• Steps to reproduce</li>
              <li>• Expected vs. actual behavior</li>
              <li>• Browser/OS version</li>
              <li>• Screenshots (if applicable)</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200 shadow-sm">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-2">Feature Requests</h3>
            <p className="text-deep-charcoal/70">
              Have an idea for improving NOBOGYAN? We welcome suggestions!
            </p>
            <p className="text-sm text-deep-charcoal/60 mt-2">
              <strong>Subject Line:</strong> Please include "[Feature Request]"
            </p>
          </div>
        </div>
      </section>

      {/* For Different Audiences */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">For Different Audiences</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {audiences.map((audience) => (
            <div key={audience.title} className="p-6 bg-gradient-to-br from-white to-sand-50 rounded-2xl border border-sand-200/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                  <audience.icon className="w-5 h-5 text-sage-600" />
                </div>
                <h3 className="text-lg font-semibold text-deep-charcoal">{audience.title}</h3>
              </div>
              <p className="text-deep-charcoal/70 text-sm mb-3">{audience.desc}</p>
              <ul className="space-y-1">
                {audience.items.map((item, i) => (
                  <li key={i} className="text-sm text-deep-charcoal/60 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Response Times */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6 text-sage-500" />
          Response Times
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Inquiry Type</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Expected Response</th>
              </tr>
            </thead>
            <tbody>
              {responseTimes.map((r, i) => (
                <tr key={i} className="border-b border-sand-100">
                  <td className="py-3 px-4 text-deep-charcoal/70">{r.type}</td>
                  <td className="py-3 px-4 font-medium text-sage-600">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Community */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Community</h2>
        <div className="p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
          <p className="text-deep-charcoal/70 mb-4">
            We're currently focused on the 15th China Software Cup competition. You can follow our progress and updates through:
          </p>
          <ul className="space-y-2 text-deep-charcoal/70">
            <li className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sage-500" />
              <a href="https://x.com/velox_studio_26" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">X (@velox_studio_26)</a> — Updates and announcements
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sage-500" />
              <a href="https://www.youtube.com/@veloxstudio1" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">YouTube (@veloxstudio1)</a> — Demos and walkthroughs
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sage-500" />
              <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">Email</a> — Direct questions and feedback
            </li>
          </ul>
        </div>
      </section>

      {/* Social */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Follow Us</h2>
        <div className="flex flex-wrap gap-4">
          <a 
            href="https://veloxstudio.tech" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white rounded-xl border border-sand-200 hover:border-sage-300 hover:shadow-md transition-all text-deep-charcoal font-medium"
          >
            Website
          </a>
          <a 
            href="https://x.com/velox_studio_26" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white rounded-xl border border-sand-200 hover:border-sage-300 hover:shadow-md transition-all text-deep-charcoal font-medium"
          >
            X (Twitter)
          </a>
          <a 
            href="https://www.youtube.com/@veloxstudio1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white rounded-xl border border-sand-200 hover:border-sage-300 hover:shadow-md transition-all text-deep-charcoal font-medium"
          >
            YouTube
          </a>
        </div>
      </section>

      {/* Closing */}
      <section className="text-center py-8 border-t border-sand-200">
        <p className="text-lg text-deep-charcoal/70 italic">
          Thank you for your interest in NOBOGYAN. We look forward to hearing from you!
        </p>
      </section>
    </PageLayout>
  );
}
