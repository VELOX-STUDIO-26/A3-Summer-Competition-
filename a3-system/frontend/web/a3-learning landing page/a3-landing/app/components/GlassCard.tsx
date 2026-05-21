import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export default function GlassCard({ children, className, dark = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl p-6 transition-all duration-300",
        dark ? "glass-dark" : "glass",
        className
      )}
    >
      {children}
    </div>
  );
}
