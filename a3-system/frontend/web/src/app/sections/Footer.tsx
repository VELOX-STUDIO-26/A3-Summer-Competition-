// Product links with section anchors
const productLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "The Swarm", href: "#the-swarm" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Changelog", href: "/changelog" },
];

// Links with proper page routes
const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Partners", href: "/partners" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Security", href: "/security" },
];

const resourceLinks = [
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "#faq" },
];

export default function Footer() {
  return (
    <footer className="bg-deep-charcoal pt-8 pb-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src="/nobogyan-logo.png" 
                alt="NOBOGYAN" 
                className="w-8 h-8 invert"
              />
              <span className="font-serif font-bold text-lg text-white">
                NOBOGYAN
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              An intelligent swarm of 15+ AI agents, working just for you.
            </p>
          </div>

          {/* Product Links - with section anchors */}
          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
              Product
            </h4>
            <ul className="space-y-1.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/50 hover:text-sage-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
              Resources
            </h4>
            <ul className="space-y-1.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/50 hover:text-sage-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
              Company
            </h4>
            <ul className="space-y-1.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/50 hover:text-sage-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
              Legal
            </h4>
            <ul className="space-y-1.5">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/50 hover:text-sage-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider that matches column width */}
        <div className="max-w-7xl mx-auto">
          <div className="h-px bg-white/10 mb-4" />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} NOBOGYAN. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Twitter", "Discord", "LinkedIn"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-xs text-white/50 hover:text-sage-400 transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
