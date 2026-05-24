"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

/**
 * Dashboard Layout - Simplified
 * 
 * Only the notebook page remains in the dashboard.
 * The notebook is a full-screen experience with its own sidebar.
 * This layout just handles auth protection and loading states.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { studentId, isHydrated } = useAppStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isHydrated && !studentId) {
      router.replace("/login");
    }
  }, [studentId, isHydrated, router]);

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#6B7F6B] flex items-center justify-center animate-pulse">
            <img src="/nobogyan-logo.png" alt="NOBOGYAN" className="w-8 h-8" />
          </div>
          <div className="text-white/40 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!studentId) {
    return null;
  }

  // Render the notebook page (full-screen)
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {children}
    </div>
  );
}
