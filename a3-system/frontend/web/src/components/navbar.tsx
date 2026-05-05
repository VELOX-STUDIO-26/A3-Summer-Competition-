"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#product", label: "Product" },
    { href: "#how-it-works", label: "How it Works" },
    { href: "#technology", label: "Technology" },
    { href: "#resources", label: "Resources" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#F7F5F0]/95 backdrop-blur-xl border-b border-[#D6CFC2]"
          : "bg-transparent"
      )}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#B8C3C9] flex items-center justify-center">
              <span className="text-white font-semibold text-sm">A3</span>
            </div>
            <span className="font-medium text-[#2a2a2a]">A3 Learning</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-[#666] hover:text-[#2a2a2a] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[#666] hover:text-[#2a2a2a] transition-colors duration-200"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#B8C3C9] text-white hover:bg-[#8a9ba3] transition-colors duration-200"
            >
              Start Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-3 -mr-2 rounded-lg hover:bg-[#E7E2D7] active:bg-[#D6CFC2] transition-colors z-50"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-[#2a2a2a]" />
            ) : (
              <Menu className="w-6 h-6 text-[#2a2a2a]" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[#D6CFC2] bg-[#F7F5F0]/95 backdrop-blur-xl">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-2 py-2 text-sm text-[#666] hover:text-[#2a2a2a] hover:bg-[#E7E2D7] rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[#D6CFC2]">
              <Link
                href="/login"
                className="px-2 py-2 text-sm text-[#666] hover:text-[#2a2a2a] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#B8C3C9] text-white hover:bg-[#8a9ba3] transition-colors text-center"
                onClick={() => setMobileOpen(false)}
              >
                Start Free
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
