import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import JsonLd from "./components/JsonLd";

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "NOBOGYAN — 15 AI Agents Building Your Perfect Learning Path",
  description: "NOBOGYAN deploys a swarm of 15+ specialized AI agents that profile, plan, tutor, and assess — all working together to create personalized learning experiences. Join 2,500+ on the waitlist.",
  keywords: ["AI learning", "personalized education", "AI tutoring", "adaptive learning", "AI agents", "online learning", "EdTech", "smart learning", "AI education platform"],
  authors: [{ name: "NOBOGYAN" }],
  creator: "NOBOGYAN",
  publisher: "NOBOGYAN",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/nobogyan-logo.png",
    shortcut: "/nobogyan-logo.png",
    apple: "/nobogyan-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nobogyan.com",
    siteName: "NOBOGYAN",
    title: "NOBOGYAN — 15 AI Agents Building Your Perfect Learning Path",
    description: "Join 2,500+ learners on the waitlist. Experience the future of personalized education with our AI swarm technology.",
    images: [
      {
        url: "/nobogyan-logo.png",
        width: 512,
        height: 512,
        alt: "NOBOGYAN - AI Learning Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NOBOGYAN — 15 AI Agents Building Your Perfect Learning Path",
    description: "Join 2,500+ learners on the waitlist. Experience the future of personalized education with our AI swarm technology.",
    images: ["/nobogyan-logo.png"],
    creator: "@nobogyan",
  },
  verification: {
    // Add your verification codes when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: "https://nobogyan.com",
  },
  category: "Education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrains.variable} h-full antialiased`}>
      <head>
        {/* Erode - Soft serif for headlines (Fontshare) */}
        <link href="https://api.fontshare.com/v2/css?f[]=erode@400,500,600,700&display=swap" rel="stylesheet" />
        {/* Synonym - Geometric sans for body (Fontshare) */}
        <link href="https://api.fontshare.com/v2/css?f[]=synonym@400,500,600,700&display=swap" rel="stylesheet" />
        {/* Structured Data for SEO */}
        <JsonLd />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-sans)" }}
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
