"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import MagneticButton from "../components/landing/MagneticButton";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "The Swarm", href: "#the-swarm" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className={`flex items-center gap-2 px-2 py-2 rounded-full border transition-all duration-300 ${
            scrolled
              ? "bg-white/80 backdrop-blur-xl border-white/50 shadow-lg shadow-black/5"
              : "bg-white/60 backdrop-blur-md border-white/40 shadow-md shadow-black/[0.02]"
          }`}
        >
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 pl-2 pr-3">
            <Image 
              src="/nobogyan-logo.png" 
              alt="NOBOGYAN" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <span className="font-serif font-bold text-base text-deep-charcoal hidden sm:block">
              NOBOGYAN
            </span>
          </a>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-sand-200" />

          {/* Links - pill style (desktop) */}
          <div className="hidden md:flex items-center">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-deep-charcoal/70 hover:text-deep-charcoal hover:bg-sand-100 rounded-full transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-sand-200" />

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 rounded-full font-medium text-sm text-deep-charcoal/70 hover:text-deep-charcoal hover:bg-sand-100 transition-all duration-200"
            >
              Login
            </a>
            <motion.a
              href="/register"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm bg-sage-400 text-white hover:bg-sage-500 transition-colors shadow-sm"
            >
              Register
            </motion.a>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-sand-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-deep-charcoal" />
              ) : (
                <Menu className="w-5 h-5 text-deep-charcoal" />
              )}
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-20 z-40 mx-4 md:hidden"
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-sand-200 shadow-xl p-4">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-deep-charcoal/70 hover:text-deep-charcoal hover:bg-sand-100 rounded-xl transition-all duration-200"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="h-px bg-sand-200 my-2" />
                <a
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-deep-charcoal/70 hover:text-deep-charcoal hover:bg-sand-100 rounded-xl transition-all duration-200 text-center"
                >
                  Login
                </a>
                <a
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-sage-400 hover:bg-sage-500 rounded-xl transition-all duration-200"
                >
                  Register
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
