import PageLayout from "../components/PageLayout";
import { FileText, UserCheck, Shield, AlertTriangle, Scale, Mail } from "lucide-react";

export default function TermsPage() {
  return (
    <PageLayout 
      title="Terms of Service" 
      subtitle="Please read these terms carefully before using NOBOGYAN"
      lastUpdated="May 20, 2026"
    >
      <p className="text-deep-charcoal/70 leading-relaxed mb-8">
        Please read these Terms of Service ("Terms") carefully before using the NOBOGYAN Personalized AI Learning System ("Service") operated by <strong>VELOX Studio</strong> ("us", "we", or "our").
      </p>
      <p className="text-deep-charcoal/70 leading-relaxed mb-8">
        By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Service.
      </p>

      {/* Section 1 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">1. Definitions</h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <ul className="space-y-3 text-deep-charcoal/70">
            <li><strong>"Service"</strong>: The NOBOGYAN Personalized AI Learning System platform</li>
            <li><strong>"User"</strong>: Any individual who accesses or uses the Service</li>
            <li><strong>"Account"</strong>: The registered user profile for accessing the Service</li>
            <li><strong>"Content"</strong>: Any materials generated, uploaded, or shared through the Service</li>
            <li><strong>"AI Agents"</strong>: The automated systems that generate educational content</li>
            <li><strong>"Partner Services"</strong>: Third-party services integrated with NOBOGYAN (e.g., iFlytek)</li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-sage-500" />
          2. Account Registration
        </h2>

        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">2.1 Eligibility</h3>
            <p className="text-deep-charcoal/70 mb-3">To use the Service, you must:</p>
            <ul className="text-deep-charcoal/70 space-y-2 ml-4">
              <li>• Be at least 13 years of age</li>
              <li>• Provide accurate and complete information</li>
              <li>• Maintain the security of your account credentials</li>
              <li>• Be a human (no automated accounts)</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">2.2 Account Responsibilities</h3>
            <p className="text-deep-charcoal/70 mb-3">You are responsible for:</p>
            <ul className="text-deep-charcoal/70 space-y-2 ml-4">
              <li>• All activities under your account</li>
              <li>• Maintaining password confidentiality</li>
              <li>• Notifying us of unauthorized access</li>
              <li>• Ensuring account information is current</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">2.3 Account Termination</h3>
            <p className="text-deep-charcoal/70 mb-3">We may suspend or terminate accounts that:</p>
            <ul className="text-deep-charcoal/70 space-y-2 ml-4">
              <li>• Violate these Terms</li>
              <li>• Engage in fraudulent activity</li>
              <li>• Attempt to compromise system security</li>
              <li>• Remain inactive for extended periods</li>
              <li>• Are used for unauthorized purposes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Shield className="w-6 h-6 text-sage-500" />
          3. Acceptable Use
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4">✓ Permitted Uses</h3>
            <ul className="text-green-700 space-y-2">
              <li>• Personal learning and education</li>
              <li>• Academic coursework</li>
              <li>• Skill development</li>
              <li>• Research (with attribution)</li>
            </ul>
          </div>

          <div className="p-6 bg-gradient-to-br from-red-50 to-white rounded-2xl border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-4">✗ Prohibited Activities</h3>
            <ul className="text-red-700 space-y-2 text-sm">
              <li>• Share account credentials</li>
              <li>• Attempt to reverse engineer the system</li>
              <li>• Use automated scripts or bots</li>
              <li>• Upload malicious code or content</li>
              <li>• Harass or abuse other users</li>
              <li>• Generate harmful or inappropriate content</li>
              <li>• Circumvent usage limits</li>
              <li>• Interfere with system operations</li>
              <li>• Use the Service for illegal purposes</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-6 bg-white rounded-2xl border border-sand-200">
          <h3 className="text-lg font-semibold text-deep-charcoal mb-4">Content Guidelines</h3>
          <p className="text-deep-charcoal/70 mb-3">User-generated content must not:</p>
          <ul className="text-deep-charcoal/70 space-y-2 ml-4">
            <li>• Infringe on intellectual property rights</li>
            <li>• Contain malware or harmful code</li>
            <li>• Violate any laws or regulations</li>
            <li>• Include hate speech or harassment</li>
            <li>• Contain explicit or inappropriate material</li>
            <li>• Impersonate others</li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <FileText className="w-6 h-6 text-sage-500" />
          4. AI-Generated Content
        </h2>

        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">4.1 Nature of AI Content</h3>
            <p className="text-deep-charcoal/70 mb-3">The Service uses AI agents to generate educational content including:</p>
            <ul className="text-deep-charcoal/70 space-y-1 ml-4">
              <li>• Lecture notes and explanations</li>
              <li>• Quiz questions and assessments</li>
              <li>• Mind maps and visualizations</li>
              <li>• Code exercises</li>
              <li>• Tutoring responses</li>
            </ul>
          </div>

          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-800 mb-4">4.2 Content Accuracy</h3>
            <p className="text-amber-700 mb-3">While we strive for accuracy:</p>
            <ul className="text-amber-700 space-y-2 ml-4">
              <li>• AI-generated content may contain errors</li>
              <li>• Always verify critical information</li>
              <li>• Content should supplement, not replace, instructor guidance</li>
              <li>• We do not guarantee 100% factual accuracy</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">4.3 Content Ownership</h3>
            <ul className="text-deep-charcoal/70 space-y-2">
              <li><strong>Service-Generated Content:</strong> We grant you a personal, non-exclusive license to use content generated for your learning</li>
              <li><strong>User Content:</strong> You retain ownership of content you upload</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 5 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">5. Privacy and Data</h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <p className="text-deep-charcoal/70 mb-4">
            We collect and process data as described in our <a href="/privacy" className="text-sage-600 hover:underline">Privacy Policy</a>.
          </p>
          <p className="text-deep-charcoal/70 mb-3">By using the Service, you consent to:</p>
          <ul className="text-deep-charcoal/70 space-y-2 ml-4">
            <li>• Collection of learning interaction data</li>
            <li>• Processing of your queries by AI systems</li>
            <li>• Storage of conversation history</li>
            <li>• Analysis for personalization purposes</li>
          </ul>
          <p className="text-deep-charcoal/70 mt-4">
            Your data may be processed by iFlytek (LLM, TTS, ASR services), OpenRouter (LLM routing), and other service providers as necessary.
          </p>
        </div>
      </section>

      {/* Section 6 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">6. Service Availability</h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <p className="text-deep-charcoal/70 mb-4">
            We strive for 99% uptime but do not guarantee continuous, uninterrupted access, error-free operation, or specific response times.
          </p>
          <p className="text-deep-charcoal/70 mb-4">
            We may perform maintenance that temporarily affects Service availability.
          </p>
          <p className="text-deep-charcoal/70">
            We reserve the right to modify or discontinue features, functionality, or service availability. We will provide reasonable notice of significant changes.
          </p>
        </div>
      </section>

      {/* Section 7 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">7. Intellectual Property</h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <p className="text-deep-charcoal/70 mb-4">
            The Service and its original content (excluding user-generated content) are and will remain the exclusive property of VELOX Studio and its licensors. The Service is protected by copyright, trademark, and other laws.
          </p>
          <p className="text-deep-charcoal/70 mb-4">
            "NOBOGYAN" and associated logos are trademarks of VELOX Studio.
          </p>
          <p className="text-deep-charcoal/70">
            Any feedback you provide may be used by us without restriction or compensation.
          </p>
        </div>
      </section>

      {/* Section 9 - Disclaimers */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-sage-500" />
          9. Disclaimers
        </h2>

        <div className="space-y-4">
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Educational Purpose</h3>
            <p className="text-amber-700 uppercase text-sm">
              THE SERVICE IS PROVIDED FOR EDUCATIONAL PURPOSES ONLY. IT DOES NOT CONSTITUTE PROFESSIONAL ADVICE. ALWAYS CONSULT QUALIFIED INSTRUCTORS FOR ACADEMIC GUIDANCE.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-2">No Warranty</h3>
            <p className="text-deep-charcoal/70 text-sm uppercase">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">AI Limitations</h3>
            <p className="text-deep-charcoal/70 mb-3">AI-generated content may:</p>
            <ul className="text-deep-charcoal/70 space-y-1 ml-4">
              <li>• Contain inaccuracies</li>
              <li>• Reflect training data biases</li>
              <li>• Not fully understand context</li>
              <li>• Generate inappropriate responses (mitigated by filters)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 10 - Limitation of Liability */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Scale className="w-6 h-6 text-sage-500" />
          10. Limitation of Liability
        </h2>

        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <p className="text-deep-charcoal/70 text-sm uppercase mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, VELOX STUDIO SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, LOSS OF PROFITS, DATA, OR GOODWILL, SERVICE INTERRUPTIONS, UNAUTHORIZED ACCESS TO DATA, OR ERRORS IN AI-GENERATED CONTENT.
          </p>
          <p className="text-deep-charcoal/70 text-sm uppercase">
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE PAST 12 MONTHS, OR $100 IF NO PAYMENT WAS MADE.
          </p>
        </div>
      </section>

      {/* Section 11 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">11. Indemnification</h2>
        <p className="text-deep-charcoal/70">
          You agree to indemnify and hold harmless VELOX Studio and its affiliates from any claims arising from your use of the Service, violation of these Terms, content you submit, or your violation of third-party rights.
        </p>
      </section>

      {/* Section 12 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">12. Governing Law</h2>
        <p className="text-deep-charcoal/70">
          These Terms shall be governed by the laws of the People's Republic of China, without regard to conflict of law provisions. Any disputes shall be resolved through good faith negotiation. If unresolved, disputes shall be submitted to the jurisdiction of courts in China.
        </p>
      </section>

      {/* Section 13 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">13. Changes to Terms</h2>
        <p className="text-deep-charcoal/70">
          We may modify these Terms at any time. Changes will be posted with updated date, significant changes notified via email, and effective immediately upon posting. Continued use constitutes acceptance of revised Terms.
        </p>
      </section>

      {/* Section 14 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">14. Termination</h2>
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <p className="text-deep-charcoal/70 mb-3">
            <strong>By You:</strong> You may terminate your account at any time by contacting us.
          </p>
          <p className="text-deep-charcoal/70 mb-3">
            <strong>By Us:</strong> We may suspend or terminate access for violations of these Terms.
          </p>
          <p className="text-deep-charcoal/70">
            <strong>Effect:</strong> Upon termination, your access to the Service ceases, your data will be deleted per our Privacy Policy, and provisions regarding liability and indemnification survive.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-12 p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Mail className="w-6 h-6 text-sage-500" />
          Contact Information
        </h2>
        <p className="text-deep-charcoal/70 mb-4">For questions about these Terms:</p>
        <div className="space-y-2 text-deep-charcoal/70">
          <p><strong>Email:</strong> <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">theveloxstudio@gmail.com</a></p>
          <p><strong>Website:</strong> <a href="https://veloxstudio.tech" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">veloxstudio.tech</a></p>
        </div>
      </section>

      {/* Acknowledgment */}
      <section className="text-center py-8 border-t border-sand-200">
        <p className="text-deep-charcoal/70 uppercase text-sm font-medium">
          BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
        </p>
        <p className="text-deep-charcoal/50 mt-4 text-sm">
          Copyright © 2026 VELOX Studio. All rights reserved.
        </p>
      </section>
    </PageLayout>
  );
}
