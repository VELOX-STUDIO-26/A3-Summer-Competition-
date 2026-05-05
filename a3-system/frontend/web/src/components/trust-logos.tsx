"use client";

import { cn } from "@/lib/utils";

interface TrustLogosProps {
  mounted: boolean;
}

export function TrustLogos({ mounted }: TrustLogosProps) {
  return (
    <section className="py-12 px-6 border-y border-[#D6CFC2]">
      <div className="max-w-6xl mx-auto">
        <p 
          className={cn(
            "text-center text-[11px] text-[#888] uppercase tracking-widest mb-8 transition-all duration-700 ease-out",
            "opacity-100 translate-y-0"
          )}
        >
          Trusted by learners & teams at
        </p>
        <div 
          className={cn(
            "flex flex-wrap items-center justify-center gap-10 md:gap-14 transition-all duration-700 ease-out delay-100",
            "opacity-100 translate-y-0"
          )}
        >
          {/* AWS */}
          <svg className="h-7 text-[#888] hover:text-[#4a5568] transition-colors" viewBox="0 0 100 40" fill="currentColor">
            <text x="0" y="28" fontSize="22" fontWeight="bold" fontFamily="Arial">aws</text>
          </svg>
          
          {/* Google Cloud */}
          <svg className="h-6 text-[#888] hover:text-[#4a5568] transition-colors" viewBox="0 0 140 30" fill="currentColor">
            <text x="0" y="22" fontSize="16" fontWeight="500" fontFamily="Arial">Google Cloud</text>
          </svg>
          
          {/* Microsoft */}
          <svg className="h-6 text-[#888] hover:text-[#4a5568] transition-colors" viewBox="0 0 100 30" fill="currentColor">
            <text x="0" y="22" fontSize="16" fontWeight="500" fontFamily="Arial">Microsoft</text>
          </svg>
          
          {/* IBM */}
          <svg className="h-7 text-[#888] hover:text-[#4a5568] transition-colors" viewBox="0 0 60 30" fill="currentColor">
            <text x="0" y="24" fontSize="22" fontWeight="bold" fontFamily="Arial">IBM</text>
          </svg>
          
          {/* Oracle */}
          <svg className="h-6 text-[#888] hover:text-[#4a5568] transition-colors" viewBox="0 0 80 30" fill="currentColor">
            <text x="0" y="22" fontSize="16" fontWeight="500" fontFamily="Arial">ORACLE</text>
          </svg>
          
          {/* Intel */}
          <svg className="h-6 text-[#888] hover:text-[#4a5568] transition-colors" viewBox="0 0 50 30" fill="currentColor">
            <text x="0" y="22" fontSize="16" fontWeight="500" fontFamily="Arial">intel</text>
          </svg>
        </div>
      </div>
    </section>
  );
}
