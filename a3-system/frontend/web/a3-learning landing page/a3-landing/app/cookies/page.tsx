import PageLayout from "../components/PageLayout";
import { Cookie, Settings, BarChart3, Wrench, Globe, Clock, Mail } from "lucide-react";

const cookieTypes = [
  {
    type: "Essential Cookies",
    purpose: "Required for the Service to function",
    duration: "Session to 30 days",
    examples: ["Authentication tokens (JWT)", "Session identifiers", "Security tokens", "CSRF protection tokens"],
    canDisable: false,
  },
  {
    type: "Preference Cookies",
    purpose: "Remember your settings and preferences",
    duration: "Up to 1 year",
    examples: ["Language preferences", "Display settings (theme, font size)", "Notification preferences", "Learning path progress", "UI customizations"],
    canDisable: true,
  },
  {
    type: "Analytics Cookies",
    purpose: "Help us understand usage patterns",
    duration: "Up to 2 years",
    examples: ["Page view tracking", "Feature usage statistics", "Performance metrics", "Error reporting"],
    canDisable: true,
  },
  {
    type: "Functional Cookies",
    purpose: "Enable enhanced functionality",
    duration: "Up to 1 year",
    examples: ["Chat history (encrypted)", "Recently accessed resources", "Bookmarked content", "Search history"],
    canDisable: true,
  },
];

const specificCookies = [
  { name: "auth_token", type: "Essential", duration: "Session", purpose: "Authentication" },
  { name: "session_id", type: "Essential", duration: "Session", purpose: "Session management" },
  { name: "user_pref", type: "Preference", duration: "1 year", purpose: "User preferences" },
  { name: "progress_track", type: "Functional", duration: "Session", purpose: "Learning progress" },
  { name: "_ga", type: "Analytics", duration: "2 years", purpose: "Google Analytics" },
  { name: "theme_mode", type: "Preference", duration: "1 year", purpose: "Dark/light mode" },
  { name: "last_resource", type: "Functional", duration: "30 days", purpose: "Recently viewed" },
];

const thirdParties = [
  { name: "iFlytek", purpose: "LLM service authentication, TTS preferences", type: "Essential, Functional" },
  { name: "Analytics Providers", purpose: "Usage analytics, performance monitoring", type: "Analytics" },
  { name: "Cloudflare/CDN", purpose: "Security, performance optimization", type: "Essential" },
];

export default function CookiesPage() {
  return (
    <PageLayout 
      title="Cookie Policy" 
      subtitle="How we use cookies and similar technologies"
      lastUpdated="May 20, 2026"
    >
      <p className="text-deep-charcoal/70 leading-relaxed mb-8">
        This Cookie Policy explains how VELOX Studio ("we", "us", or "our") uses cookies and similar technologies on the NOBOGYAN Personalized AI Learning System ("Service").
      </p>
      <p className="text-deep-charcoal/70 leading-relaxed mb-8">
        By using the Service, you consent to the use of cookies as described in this policy.
      </p>

      {/* What Are Cookies */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Cookie className="w-6 h-6 text-sage-500" />
          What Are Cookies?
        </h2>
        <div className="p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
          <p className="text-deep-charcoal/70 mb-4">
            Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit websites. They are widely used to make websites work more efficiently and provide information to website owners.
          </p>
          <p className="text-deep-charcoal/70 mb-3">Cookies help us:</p>
          <ul className="text-deep-charcoal/70 space-y-2 ml-4">
            <li>• Keep you logged in</li>
            <li>• Remember your preferences</li>
            <li>• Understand how you use the Service</li>
            <li>• Improve your experience</li>
          </ul>
        </div>
      </section>

      {/* Types of Cookies */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Types of Cookies We Use</h2>
        <div className="space-y-6">
          {cookieTypes.map((cookie, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-sand-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-deep-charcoal">{i + 1}. {cookie.type}</h3>
                  <p className="text-sage-600 text-sm">{cookie.purpose}</p>
                </div>
                {!cookie.canDisable && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    Required
                  </span>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-deep-charcoal/50 mb-2">Duration</p>
                  <p className="text-deep-charcoal/70">{cookie.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-deep-charcoal/50 mb-2">Examples</p>
                  <ul className="text-sm text-deep-charcoal/70 space-y-1">
                    {cookie.examples.map((ex, j) => (
                      <li key={j}>• {ex}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {!cookie.canDisable && (
                <p className="text-sm text-amber-600 mt-4">
                  These cookies cannot be disabled as they are necessary for basic functionality.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Third-Party Cookies */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Globe className="w-6 h-6 text-sage-500" />
          Third-Party Cookies
        </h2>
        <p className="text-deep-charcoal/70 mb-4">We use cookies from trusted third parties:</p>
        <div className="space-y-4">
          {thirdParties.map((tp, i) => (
            <div key={i} className="p-5 bg-white rounded-xl border border-sand-200">
              <h3 className="font-semibold text-deep-charcoal mb-2">{tp.name}</h3>
              <p className="text-sm text-deep-charcoal/70 mb-1"><strong>Purpose:</strong> {tp.purpose}</p>
              <p className="text-sm text-deep-charcoal/70"><strong>Type:</strong> {tp.type}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Specific Cookies */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6">Specific Cookies We Use</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Cookie Name</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-deep-charcoal">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {specificCookies.map((c, i) => (
                <tr key={i} className="border-b border-sand-100">
                  <td className="py-3 px-4 font-mono text-deep-charcoal">{c.name}</td>
                  <td className="py-3 px-4 text-deep-charcoal/70">{c.type}</td>
                  <td className="py-3 px-4 text-deep-charcoal/70">{c.duration}</td>
                  <td className="py-3 px-4 text-deep-charcoal/70">{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How to Manage */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Settings className="w-6 h-6 text-sage-500" />
          How to Manage Cookies
        </h2>

        <div className="p-6 bg-white rounded-2xl border border-sand-200 mb-6">
          <h3 className="text-lg font-semibold text-deep-charcoal mb-4">Browser Settings</h3>
          <p className="text-deep-charcoal/70 mb-4">Most web browsers allow you to control cookies through settings:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-sand-50 rounded-xl">
              <p className="font-medium text-deep-charcoal">Chrome</p>
              <p className="text-sm text-deep-charcoal/60">Settings → Privacy and Security → Cookies</p>
            </div>
            <div className="p-4 bg-sand-50 rounded-xl">
              <p className="font-medium text-deep-charcoal">Firefox</p>
              <p className="text-sm text-deep-charcoal/60">Preferences → Privacy & Security → Cookies</p>
            </div>
            <div className="p-4 bg-sand-50 rounded-xl">
              <p className="font-medium text-deep-charcoal">Safari</p>
              <p className="text-sm text-deep-charcoal/60">Preferences → Privacy → Cookies</p>
            </div>
            <div className="p-4 bg-sand-50 rounded-xl">
              <p className="font-medium text-deep-charcoal">Edge</p>
              <p className="text-sm text-deep-charcoal/60">Settings → Cookies and site permissions</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
          <h3 className="text-lg font-semibold text-deep-charcoal mb-4">Your Choices</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-sage-200">
              <p className="font-semibold text-deep-charcoal mb-1">Accept All</p>
              <p className="text-sm text-deep-charcoal/60">Full Service functionality</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-sage-200">
              <p className="font-semibold text-deep-charcoal mb-1">Essential Only</p>
              <p className="text-sm text-deep-charcoal/60">Basic functionality only</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-sage-200">
              <p className="font-semibold text-deep-charcoal mb-1">Custom</p>
              <p className="text-sm text-deep-charcoal/60">Select which categories to allow</p>
            </div>
          </div>
          <p className="text-sm text-deep-charcoal/50 mt-4">
            Note: Disabling certain cookies may limit Service functionality.
          </p>
        </div>
      </section>

      {/* Cookie Duration */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6 text-sage-500" />
          Cookie Duration
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-3">Session Cookies</h3>
            <ul className="text-deep-charcoal/70 space-y-2">
              <li>• Deleted when you close your browser</li>
              <li>• Used for temporary data</li>
            </ul>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-3">Persistent Cookies</h3>
            <ul className="text-deep-charcoal/70 space-y-2">
              <li>• Remain for a set period</li>
              <li>• Used for preferences and analytics</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Local Storage */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-6 flex items-center gap-3">
          <Wrench className="w-6 h-6 text-sage-500" />
          Local Storage and Similar Technologies
        </h2>
        <p className="text-deep-charcoal/70 mb-4">In addition to cookies, we use:</p>
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-2">LocalStorage</h3>
            <p className="text-sm text-deep-charcoal/70">Stores larger amounts of data client-side. Used for UI state, cached resources, offline data. Duration: Until manually cleared.</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-2">SessionStorage</h3>
            <p className="text-sm text-deep-charcoal/70">Temporary storage for session data. Used for form data, temporary preferences. Duration: Until tab is closed.</p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-sand-200">
            <h3 className="font-semibold text-deep-charcoal mb-2">IndexedDB</h3>
            <p className="text-sm text-deep-charcoal/70">Database for offline functionality. Used for cached content, progress data.</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="mb-12 p-6 bg-gradient-to-br from-sage-50 to-white rounded-2xl border border-sage-200/50">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4 flex items-center gap-3">
          <Mail className="w-6 h-6 text-sage-500" />
          Contact Us
        </h2>
        <p className="text-deep-charcoal/70 mb-4">For questions about our Cookie Policy:</p>
        <div className="space-y-2 text-deep-charcoal/70">
          <p><strong>Email:</strong> <a href="mailto:theveloxstudio@gmail.com" className="text-sage-600 hover:underline">theveloxstudio@gmail.com</a></p>
          <p><strong>Website:</strong> <a href="https://veloxstudio.tech" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">veloxstudio.tech</a></p>
        </div>
      </section>

      {/* Learn More */}
      <section className="mb-12">
        <h2 className="text-2xl font-serif font-semibold text-deep-charcoal mb-4">Learn More</h2>
        <p className="text-deep-charcoal/70 mb-4">For more information about cookies:</p>
        <ul className="text-deep-charcoal/70 space-y-2">
          <li>• <a href="https://www.allaboutcookies.org/" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">All About Cookies</a></li>
          <li>• <a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">Your Online Choices</a></li>
          <li>• <a href="https://ico.org.uk/for-the-public/online/cookies/" target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:underline">About Cookies (ICO)</a></li>
        </ul>
      </section>

      {/* Footer */}
      <section className="text-center py-8 border-t border-sand-200">
        <p className="text-deep-charcoal/60 text-sm">
          This Cookie Policy is part of our broader commitment to transparency and user privacy. See also our{" "}
          <a href="/privacy" className="text-sage-600 hover:underline">Privacy Policy</a> and{" "}
          <a href="/terms" className="text-sage-600 hover:underline">Terms of Service</a>.
        </p>
        <p className="text-deep-charcoal/50 mt-4 text-sm">
          Copyright © 2026 VELOX Studio. All rights reserved.
        </p>
      </section>
    </PageLayout>
  );
}
