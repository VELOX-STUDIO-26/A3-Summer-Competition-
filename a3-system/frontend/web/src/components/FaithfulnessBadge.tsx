"use client";

import { CheckCircle, AlertTriangle, Info } from "lucide-react";

interface FaithfulnessData {
  score: number;
  verified: boolean;
  total_claims: number;
  supported_claims: number;
  unverifiable_claims: number;
  citations?: string[];
}

interface FaithfulnessBadgeProps {
  faithfulness?: FaithfulnessData;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

export function FaithfulnessBadge({
  faithfulness,
  showDetails = false,
  size = "md",
}: FaithfulnessBadgeProps) {
  if (!faithfulness) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 border border-gray-200">
        <Info className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] font-medium text-gray-600">Unverified</span>
      </div>
    );
  }

  const { score, verified, total_claims, supported_claims, unverifiable_claims, citations } =
    faithfulness;

  // Size classes
  const sizeClasses = {
    sm: {
      container: "px-1.5 py-0.5 gap-1",
      icon: "w-2.5 h-2.5",
      text: "text-[9px]",
    },
    md: {
      container: "px-2 py-1 gap-1.5",
      icon: "w-3 h-3",
      text: "text-[10px]",
    },
    lg: {
      container: "px-3 py-1.5 gap-2",
      icon: "w-4 h-4",
      text: "text-xs",
    },
  };

  const classes = sizeClasses[size];

  if (verified) {
    return (
      <div className="group relative inline-flex items-center">
        <div
          className={`inline-flex items-center ${classes.container} rounded-full bg-green-100 border border-green-200 text-green-700`}
        >
          <CheckCircle className={classes.icon} />
          <span className={`${classes.text} font-medium`}>
            Source-Verified ({Math.round(score * 100)}%)
          </span>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="px-3 py-2 rounded-lg bg-white border border-green-200 shadow-lg shadow-black/10 whitespace-nowrap">
            <p className="text-[11px] font-medium text-green-700">
              {supported_claims} of {total_claims} claims verified
            </p>
            {citations && citations.length > 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                Sources: {citations.slice(0, 3).join(", ")}
                {citations.length > 3 && ` +${citations.length - 3} more`}
              </p>
            )}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
        </div>
      </div>
    );
  }

  // Unverified or low score
  const isLowScore = score < 0.5;
  return (
    <div className="group relative inline-flex items-center">
      <div
        className={`inline-flex items-center ${classes.container} rounded-full ${
          isLowScore
            ? "bg-red-100 border-red-200 text-red-700"
            : "bg-amber-100 border-amber-200 text-amber-700"
        }`}
      >
        <AlertTriangle className={classes.icon} />
        <span className={`${classes.text} font-medium`}>
          {isLowScore ? "Low Confidence" : "AI-Generated"}
          {score > 0 && ` (${Math.round(score * 100)}%)`}
        </span>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div
          className={`px-3 py-2 rounded-lg bg-white border ${
            isLowScore ? "border-red-200" : "border-amber-200"
          } shadow-lg shadow-black/10 whitespace-nowrap`}
        >
          <p
            className={`text-[11px] font-medium ${
              isLowScore ? "text-red-700" : "text-amber-700"
            }`}
          >
            {unverifiable_claims > 0
              ? `${unverifiable_claims} unverifiable claim${unverifiable_claims > 1 ? "s" : ""}`
              : "Content not verified against sources"}
          </p>
          {total_claims > 0 && (
            <p className="text-[10px] text-gray-500 mt-1">
              {supported_claims} of {total_claims} claims supported
            </p>
          )}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
      </div>

      {/* Expanded details (optional) */}
      {showDetails && unverifiable_claims > 0 && (
        <div className="ml-2 text-[10px] text-amber-600">
          Cross-check with course materials
        </div>
      )}
    </div>
  );
}

export default FaithfulnessBadge;
