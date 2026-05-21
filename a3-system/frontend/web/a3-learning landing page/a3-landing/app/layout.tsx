import type { Metadata } from "next";
// Mono - JetBrains Mono for technical elements
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOBOGYAN — Your Personal AI Learning Swarm",
  description:
    "NOBOGYAN deploys a swarm of 15+ specialized AI agents that profile, plan, tutor, and assess — all working together to build your perfect learning path.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        {/* Erode - Soft serif for headlines (Fontshare) */}
        <link href="https://api.fontshare.com/v2/css?f[]=erode@400,500,600,700&display=swap" rel="stylesheet" />
        {/* Synonym - Geometric sans for body (Fontshare) */}
        <link href="https://api.fontshare.com/v2/css?f[]=synonym@400,500,600,700&display=swap" rel="stylesheet" />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Skip navigation for accessibility */}
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
