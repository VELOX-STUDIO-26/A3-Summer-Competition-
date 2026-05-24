"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  lastUpdated?: string;
}

export default function PageLayout({ children, title, subtitle, lastUpdated }: PageLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-sand-200/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ x: -4 }}
              className="w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center group-hover:bg-sage-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-deep-charcoal/60" />
            </motion.div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/nobogyan-logo.png" 
              alt="NOBOGYAN" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <span className="font-serif font-bold text-deep-charcoal hidden sm:block">
              NOBOGYAN
            </span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-deep-charcoal mb-4">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-deep-charcoal/60">{subtitle}</p>
            )}
            {lastUpdated && (
              <p className="text-sm text-deep-charcoal/40 mt-2">
                Last Updated: {lastUpdated}
              </p>
            )}
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-deep-charcoal prose-p:text-deep-charcoal/70 prose-li:text-deep-charcoal/70 prose-a:text-sage-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-deep-charcoal prose-table:text-sm"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-sand-200 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/nobogyan-logo.png" 
              alt="NOBOGYAN" 
              width={24} 
              height={24}
              className="w-6 h-6"
            />
            <span className="text-sm text-deep-charcoal/50">
              © {isMounted ? new Date().getFullYear() : "2026"} NOBOGYAN. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-deep-charcoal/50 hover:text-sage-500 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-deep-charcoal/50 hover:text-sage-500 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-deep-charcoal/50 hover:text-sage-500 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
