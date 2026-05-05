"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="mesh-gradient" />
      
      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium z-20"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <div className="w-full max-w-5xl lg:min-h-[620px] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10 border border-white/[0.06]">
        {/* Left Side - Image (hidden on mobile) */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src="/assets/login_register_image.png"
            alt="A3 Learning"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Right Side - Form (animated) */}
        <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex items-center bg-white">
          <div
            className={`w-full max-w-sm mx-auto transition-all duration-300 ease-out ${
              isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
