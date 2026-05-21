import PageLayout from "../components/PageLayout";
import { Shield, Database, Eye, Lock, Clock, UserCheck, Cookie, Globe, Mail } from "lucide-react";

export default function PrivacyPage() {
  return (
    <PageLayout 
      title="Privacy Policy" 
      subtitle="How we collect, use, and protect your information"
      lastUpdated="May 20, 2026"
    >
      <p className="text-deep-charcoal/70 leading-relaxed mb-8">
        <strong>VELOX Studio</strong> ("we", "us", or "our") operates the NOBOGYAN Personalized AI Learning System (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
      </p>

      {/* Section 1 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Database className="w-6 h-6 text-sage-500" />
          1. Information We Collect
        </h2>

        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">1.1 Personal Information</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-deep-charcoal mb-2">Account Information</h4>
                <ul className="text-sm text-deep-charcoal/70 space-y-1 ml-4">
                  <li>• Email address</li>
                  <li>• Username</li>
                  <li>• Password (encrypted)</li>
                  <li>• Account creation date</li>
                  <li>• Last login timestamp</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-deep-charcoal mb-2">Profile Information</h4>
                <ul className="text-sm text-deep-charcoal/70 space-y-1 ml-4">
                  <li>• Learning goals and objectives</li>
                  <li>• Subject interests</li>
                  <li>• Prior knowledge self-assessments</li>
                  <li>• Learning preferences (cognitive style, pace, content format)</li>
                  <li>• Weak point areas identified during learning</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-deep-charcoal mb-2">Learning Activity Data</h4>
                <ul className="text-sm text-deep-charcoal/70 space-y-1 ml-4">
                  <li>• Quiz scores and attempts</li>
                  <li>• Time spent on resources</li>
                  <li>• Resource completion rates</li>
                  <li>• Chat interactions with the tutor</li>
                  <li>• Progress through learning paths</li>
                  <li>• Milestone completion status</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">1.2 Usage Data</h3>
            <p className="text-deep-charcoal/70 mb-3">We automatically collect certain information when you access the Service:</p>
            <ul className="text-sm text-deep-charcoal/70 space-y-1 ml-4">
              <li>• IP address</li>
              <li>• Browser type and version</li>
              <li>• Device information</li>
              <li>• Pages visited and time spent</li>
              <li>• Referral sources</li>
              <li>• Features used</li>
              <li>• Error logs</li>
            </ul>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="text-lg font-semibold text-deep-charcoal mb-4">1.3 Voice Data (Optional)</h3>
            <p className="text-deep-charcoal/70 mb-3">With your consent, we may collect:</p>
            <ul className="text-sm text-deep-charcoal/70 space-y-1 ml-4">
              <li>• Voice recordings for speech recognition (ASR)</li>
              <li>• Generated audio for text-to-speech</li>
            </ul>
            <p className="text-sm text-deep-charcoal/50 mt-3">
              Voice data is processed in real-time and may be temporarily cached for performance.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Eye className="w-6 h-6 text-sage-500" />
          2. How We Use Your Information
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 bg-gradient-to-br from-sage-50 to-white rounded-xl border border-sage-200/50">
            <h3 className="font-semibold text-deep-charcoal mb-3">Providing the Service</h3>
            <ul className="text-sm text-deep-charcoal/70 space-y-1">
              <li>• Creating and managing your account</li>
              <li>• Generating personalized learning content</li>
              <li>• Planning adaptive learning paths</li>
              <li>• Delivering tutoring responses</li>
              <li>• Tracking your progress</li>
            </ul>
          </div>
          <div className="p-5 bg-gradient-to-br from-sage-50 to-white rounded-xl border border-sage-200/50">
            <h3 className="font-semibold text-deep-charcoal mb-3">Personalization</h3>
            <ul className="text-sm text-deep-charcoal/70 space-y-1">
              <li>• Building your learner profile</li>
              <li>• Adapting content difficulty</li>
              <li>• Recommending appropriate resources</li>
              <li>• Adjusting learning paths based on performance</li>
            </ul>
          </div>
          <div className="p-5 bg-gradient-to-br from-sand-50 to-white rounded-xl border border-sand-200/50">
            <h3 className="font-semibold text-deep-charcoal mb-3">Improving the Service</h3>
            <ul className="text-sm text-deep-charcoal/70 space-y-1">
              <li>• Analyzing usage patterns</li>
              <li>• Identifying feature improvements</li>
              <li>• Training and improving our AI models</li>
              <li>• Fixing bugs and errors</li>
            </ul>
          </div>
          <div className="p-5 bg-gradient-to-br from-sand-50 to-white rounded-xl border border-sand-200/50">
            <h3 className="font-semibold text-deep-charcoal mb-3">Communication</h3>
            <ul className="text-sm text-deep-charcoal/70 space-y-1">
              <li>• Sending important service updates</li>
              <li>• Responding to support requests</li>
              <li>• Sending optional newsletters (with opt-out)</li>
              <li>• Security alerts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">3. Information Sharing and Disclosure</h2>
        
        <div className="p-6 bg-green-50 rounded-2xl border border-green-200 mb-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">We Do Not Sell Your Data</h3>
          <p className="text-green-700">
            We do not sell, rent, or trade your personal information to third parties.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-3">Service Providers</h3>
            <p className="text-sm text-deep-charcoal/70 mb-3">
              We may share information with trusted third-party service providers:
            </p>
            <ul className="text-sm text-deep-charcoal/70 space-y-1 ml-4">
              <li>• <strong>iFlytek</strong>: LLM services, TTS, ASR</li>
              <li>• <strong>OpenRouter</strong>: LLM routing and model access</li>
              <li>• <strong>Cloud Hosting Providers</strong>: Infrastructure services</li>
              <li>• <strong>Analytics Providers</strong>: Usage analytics (anonymized)</li>
            </ul>
            <p className="text-sm text-deep-charcoal/50 mt-3">
              These providers are contractually obligated to protect your information.
            </p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-3">Legal Requirements</h3>
            <p className="text-sm text-deep-charcoal/70">
              We may disclose information if required by court order, legal process, government request, protection of our rights, investigation of violations, or protection of user safety.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Lock className="w-6 h-6 text-sage-500" />
          4. Data Security
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-2">Encryption</h3>
            <p className="text-sm text-deep-charcoal/70">Data in transit (TLS) and at rest (AES-256)</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-2">Authentication</h3>
            <p className="text-sm text-deep-charcoal/70">JWT-based secure authentication</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-2">Access Control</h3>
            <p className="text-sm text-deep-charcoal/70">Role-based access restrictions</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-2">Regular Audits</h3>
            <p className="text-sm text-deep-charcoal/70">Security assessments and penetration testing</p>
          </div>
        </div>
        
        <p className="text-sm text-deep-charcoal/50 mt-4">
          While we strive to protect your information, no method of transmission over the internet is 100% secure.
        </p>
      </section>

      {/* Section 5 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6 text-sage-500" />
          5. Data Retention
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Data Type</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Retention Period</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sand-100">
                <td className="py-3 px-4 text-deep-charcoal/70">Account Data</td>
                <td className="py-3 px-4 text-deep-charcoal/70">Until account deletion</td>
              </tr>
              <tr className="border-b border-sand-100">
                <td className="py-3 px-4 text-deep-charcoal/70">Learning Data</td>
                <td className="py-3 px-4 text-deep-charcoal/70">Until account deletion (you may export first)</td>
              </tr>
              <tr className="border-b border-sand-100">
                <td className="py-3 px-4 text-deep-charcoal/70">Usage Logs</td>
                <td className="py-3 px-4 text-deep-charcoal/70">90 days</td>
              </tr>
              <tr className="border-b border-sand-100">
                <td className="py-3 px-4 text-deep-charcoal/70">Error Logs</td>
                <td className="py-3 px-4 text-deep-charcoal/70">30 days</td>
              </tr>
              <tr className="border-b border-sand-100">
                <td className="py-3 px-4 text-deep-charcoal/70">Backup Data</td>
                <td className="py-3 px-4 text-deep-charcoal/70">Up to 30 days after deletion</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-sage-500" />
          6. Your Rights
        </h2>
        
        <p className="text-deep-charcoal/70 mb-4">Depending on your location, you may have the following rights:</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: "Access", desc: "Request a copy of your personal data" },
            { title: "Correction", desc: "Update or correct inaccurate information" },
            { title: "Deletion", desc: "Request deletion of your account and data" },
            { title: "Portability", desc: "Export your data in a machine-readable format" },
            { title: "Restriction", desc: "Request limitation of data processing" },
            { title: "Objection", desc: "Object to certain processing activities" },
            { title: "Withdraw Consent", desc: "Withdraw previously given consent" },
          ].map((right, i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-sand-200">
              <h3 className="font-semibold text-deep-charcoal">{right.title}</h3>
              <p className="text-sm text-deep-charcoal/70">{right.desc}</p>
            </div>
          ))}
        </div>
        
        <p className="text-sm text-deep-charcoal/60 mt-4">
          To exercise these rights, contact us at{" "}
          <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">
            theveloxstudio@gmail.com
          </a>
        </p>
      </section>

      {/* Section 7 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Cookie className="w-6 h-6 text-sage-500" />
          7. Cookies and Tracking
        </h2>
        
        <div className="p-6 bg-white rounded-2xl border border-sand-200">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-deep-charcoal mb-2">Essential Cookies</h3>
              <p className="text-sm text-deep-charcoal/70">Required for Service operation</p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-charcoal mb-2">Authentication Cookies</h3>
              <p className="text-sm text-deep-charcoal/70">Session management</p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-charcoal mb-2">Preference Cookies</h3>
              <p className="text-sm text-deep-charcoal/70">Remember your settings</p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-charcoal mb-2">Analytics Cookies</h3>
              <p className="text-sm text-deep-charcoal/70">Understanding usage (anonymized)</p>
            </div>
          </div>
          <p className="text-sm text-deep-charcoal/60">
            See our <a href="/cookies" className="text-sage-600 hover:underline">Cookie Policy</a> for details.
          </p>
        </div>
      </section>

      {/* Section 8 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">8. Children's Privacy</h2>
        <p className="text-deep-charcoal/70">
          The Service is intended for users 13 years of age and older. We do not knowingly collect information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately. Educational institutions using NOBOGYAN with younger students are responsible for obtaining appropriate parental consent.
        </p>
      </section>

      {/* Section 9 */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Globe className="w-6 h-6 text-sage-500" />
          9. International Data Transfers
        </h2>
        <p className="text-deep-charcoal/70">
          Your information may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in compliance with applicable laws.
        </p>
      </section>

      {/* Contact */}
      <section className="mb-12 p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Mail className="w-6 h-6 text-sage-500" />
          Contact Us
        </h2>
        <p className="text-deep-charcoal/70 mb-4">For questions about this Privacy Policy:</p>
        <div className="space-y-2 text-deep-charcoal/70">
          <p><strong>Email:</strong> <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">theveloxstudio@gmail.com</a></p>
          <p><strong>Website:</strong> <a href="https://veloxstudio.tech" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">veloxstudio.tech</a></p>
        </div>
      </section>

      {/* Governing Law */}
      <section className="mb-8">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Governing Law</h2>
        <p className="text-deep-charcoal/70">
          This Privacy Policy is governed by the laws of the People's Republic of China, without regard to conflict of law principles.
        </p>
      </section>

      {/* Footer */}
      <section className="text-center py-8 border-t border-sand-200">
        <p className="text-deep-charcoal/60 italic">
          By using NOBOGYAN, you acknowledge that you have read and understood this Privacy Policy.
        </p>
      </section>
    </PageLayout>
  );
}
