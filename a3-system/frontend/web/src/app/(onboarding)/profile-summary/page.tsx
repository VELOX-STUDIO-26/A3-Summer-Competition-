"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit3, ArrowRight, Database, Layers, Target, Zap, Clock, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface ProfileData {
  knowledge: { value: string; tags: string[] };
  style: { value: string; tags: string[] };
  goals: { value: string; tags: string[] };
  pace: { value: string; tags: string[] };
  weakpoints: { value: string; tags: string[] };
  preferences: { value: string; tags: string[] };
}

const dimensionMeta = {
  knowledge: { icon: Database, label: "Knowledge Base", color: "from-[#6B7F6B] to-[#5a6d5a]" },
  style: { icon: Layers, label: "Learning Style", color: "from-[#8a9ba3] to-[#6B7F6B]" },
  goals: { icon: Target, label: "Goals", color: "from-amber-600 to-amber-700" },
  pace: { icon: Clock, label: "Pace", color: "from-[#B8C3C9] to-[#8a9ba3]" },
  weakpoints: { icon: Zap, label: "Weak Points", color: "from-rose-500 to-rose-600" },
  preferences: { icon: Settings, label: "Preferences", color: "from-[#6B7F6B] to-[#8a9ba3]" },
};

export default function ProfileSummaryPage() {
  const router = useRouter();
  const { userName, profile, setProfile, studentId, setStudentId } = useAppStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert snake_case to Title Case and clean up long strings
  const toTitleCase = (str: string): string => {
    if (!str) return "";
    // If it's a very long underscore string (like a sentence), format it nicely
    const cleaned = str.replace(/_/g, " ");
    // Capitalize first letter of each word
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Convert pace number to human-readable label
  const paceToLabel = (pace: number | string): string => {
    const num = typeof pace === "string" ? parseFloat(pace) : pace;
    if (isNaN(num)) return "Not specified";
    if (num <= 0.3) return "Steady & thorough";
    if (num <= 0.6) return "Moderate";
    return "Fast-paced";
  };

  // Convert learning style to descriptive text
  const styleToDescription = (style: string): string => {
    const descriptions: Record<string, string> = {
      visual: "Visual learner - learns best with videos, diagrams, and visual aids",
      verbal: "Verbal learner - prefers reading and written explanations",
      kinesthetic: "Hands-on learner - learns by doing and practicing",
      mixed: "Balanced learner - benefits from a mix of visual aids and reading",
    };
    return descriptions[style?.toLowerCase()] || toTitleCase(style || "Not specified");
  };

  // Clean up underscore strings to proper sentences
  const cleanUnderscoreString = (str: string): string => {
    if (!str) return "";
    // Replace underscores with spaces
    const cleaned = str.replace(/_/g, " ");
    // Capitalize first letter only (sentence case)
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  // Helper to safely convert profile value to string
  const toDisplayValue = (val: any, field?: string): string => {
    if (!val) return "Not specified";
    
    // Handle pace specially
    if (field === "pace" && typeof val === "number") {
      return paceToLabel(val);
    }
    
    // Handle style specially
    if (field === "style" && typeof val === "string") {
      return styleToDescription(val);
    }
    
    if (typeof val === "string") {
      // If it's a long underscore string (like a goal sentence), clean it up
      if (val.includes("_") && val.length > 30) {
        return cleanUnderscoreString(val);
      }
      return toTitleCase(val) || "Not specified";
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return "Not specified";
      return val.map(v => {
        const str = String(v);
        // Clean up long underscore strings
        if (str.includes("_") && str.length > 30) {
          return cleanUnderscoreString(str);
        }
        return toTitleCase(str);
      }).join(", ");
    }
    if (typeof val === "object") {
      const entries = Object.entries(val);
      if (entries.length === 0) return "Not specified";
      // For knowledge_base, show just the topic names
      return entries
        .map(([topic]) => toTitleCase(topic))
        .join(", ");
    }
    if (typeof val === "number") return paceToLabel(val);
    return String(val) || "Not specified";
  };

  const toTags = (val: any, field?: string): string[] => {
    if (!val) return [];
    
    // For pace, show the label as tag
    if (field === "pace") {
      const label = paceToLabel(typeof val === "number" ? val : parseFloat(val));
      return label !== "Not specified" ? [label] : [];
    }
    
    // Helper to clean tag text
    const cleanTag = (str: string): string => {
      // For long underscore strings, just show first few words
      if (str.includes("_") && str.length > 30) {
        const words = str.replace(/_/g, " ").split(" ").slice(0, 3);
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") + "...";
      }
      return toTitleCase(str);
    };
    
    if (Array.isArray(val)) {
      return val.slice(0, 3).map(v => cleanTag(String(v)));
    }
    if (typeof val === "object") {
      const entries = Object.entries(val);
      return entries.slice(0, 3).map(([topic]) => toTitleCase(topic));
    }
    if (typeof val === "string" && val) {
      return [cleanTag(val)];
    }
    return [];
  };

  // Initialize from store profile or use defaults
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    if (profile) {
      const paceValue = profile.learning_pace;
      const styleValue = profile.cognitive_style;
      
      return {
        knowledge: { 
          value: toDisplayValue(profile.knowledge_base, "knowledge"), 
          tags: toTags(profile.knowledge_base, "knowledge")
        },
        style: { 
          value: toDisplayValue(styleValue, "style"), 
          tags: styleValue ? [toTitleCase(styleValue)] : []
        },
        goals: { 
          value: toDisplayValue(profile.goals, "goals"), 
          tags: toTags(profile.goals, "goals")
        },
        pace: { 
          value: toDisplayValue(paceValue, "pace"), 
          tags: toTags(paceValue, "pace")
        },
        weakpoints: { 
          value: toDisplayValue(profile.weak_points, "weakpoints"), 
          tags: toTags(profile.weak_points, "weakpoints")
        },
        preferences: { 
          value: toDisplayValue(profile.content_preferences, "preferences"), 
          tags: toTags(profile.content_preferences, "preferences")
        },
      };
    }
    return {
      knowledge: { value: "Not specified yet", tags: [] },
      style: { value: "Not specified yet", tags: [] },
      goals: { value: "Not specified yet", tags: [] },
      pace: { value: "Not specified yet", tags: [] },
      weakpoints: { value: "Not specified yet", tags: [] },
      preferences: { value: "Not specified yet", tags: [] },
    };
  });

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const handleEdit = (field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: { ...prev[field as keyof ProfileData], value },
    }));
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    
    // Ensure studentId is set
    const finalStudentId = studentId || `student-${Date.now()}`;
    if (!studentId) {
      setStudentId(finalStudentId);
    }
    
    // Save profile to backend database for path planning
    try {
      const { createProfile } = await import("@/lib/api");

      // Map learning style to cognitive_style enum values
      const styleMap: Record<string, string> = {
        "visual": "visual",
        "verbal": "verbal",
        "kinesthetic": "kinesthetic",
        "hands-on": "kinesthetic",
        "mixed": "mixed",
      };
      const cognitiveStyle = styleMap[profileData.style.value?.toLowerCase()] || "mixed";

      // Map preferences to content_preferences enum values
      const prefMap: Record<string, string> = {
        "videos": "video",
        "video": "video",
        "text": "text",
        "reading": "text",
        "interactive": "interactive",
        "hands-on": "interactive",
        "code": "code",
        "audio": "audio",
        "diagrams": "diagram",
        "diagram": "diagram",
      };
      const contentPrefs = (profileData.preferences.tags || [])
        .map((p: string) => prefMap[p.toLowerCase().replace(/_/g, "-")] || null)
        .filter((p): p is string => p !== null);

      // Build knowledge_base as Dict[str, float]
      const knowledgeBase: Record<string, number> = {};
      const knowledgeValue = profileData.knowledge.value;
      const isNotSpecified = (v: string) =>
        !v || v === "Not specified" || v === "Not specified yet";
      if (typeof knowledgeValue === 'string' && !isNotSpecified(knowledgeValue)) {
        const topics = knowledgeValue.split(",").map(t => t.trim().toLowerCase());
        topics.forEach(topic => {
          if (topic && !isNotSpecified(topic)) knowledgeBase[topic] = 0.3;
        });
      } else if (profile?.knowledge_base && typeof profile.knowledge_base === 'object') {
        Object.assign(knowledgeBase, profile.knowledge_base);
      }

      // Clean weak_points and goals
      const cleanArray = (arr: any): string[] => {
        if (!arr) return [];
        if (Array.isArray(arr)) return arr.map(s => String(s).replace(/_/g, " "));
        if (typeof arr === 'string') return [arr.replace(/_/g, " ")];
        return [];
      };

      // Use original numeric pace from store if available, otherwise default
      const originalPace = typeof profile?.learning_pace === 'number' ? profile.learning_pace : 0.5;

      const savedProfile = {
        student_id: finalStudentId,
        knowledge_base: Object.keys(knowledgeBase).length > 0 ? knowledgeBase : { general: 0.5 },
        cognitive_style: cognitiveStyle as "visual" | "verbal" | "kinesthetic" | "mixed",
        goals: cleanArray(profileData.goals.tags),
        learning_pace: originalPace,
        weak_points: cleanArray(profileData.weakpoints.tags),
        content_preferences: contentPrefs.length > 0 ? contentPrefs : ["interactive"],
        version: 1,
        created_at: new Date().toISOString(),
      };
      
      await createProfile(savedProfile);
      console.log("Profile saved to backend successfully");
      
      // Update the store with the new profile
      setProfile(savedProfile);
    } catch (error) {
      console.log("Failed to save profile to backend:", error);
      // Continue anyway - path planner will use defaults
    }

    await new Promise((r) => setTimeout(r, 500));
    router.push("/notebook");
  };

  return (
    <div className="px-4 sm:px-6 pb-8 sm:pb-12">
      {/* Phase Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6B7F6B]/10 border border-[#6B7F6B]/30 mb-4">
          <Sparkles className="w-4 h-4 text-[#6B7F6B]" />
          <span className="text-sm text-[#6B7F6B] font-medium">Profile Complete</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[#2a2a2a] mb-2">
          Phase 03: <span className="text-[#666]">Review Your Profile</span>
        </h1>
        <p className="text-[#888] max-w-lg mx-auto">
          Here&apos;s what A³ learned about you. Review and edit anything that doesn&apos;t look right.
        </p>
      </div>

      {/* Profile Summary Card */}
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            "bg-white/90 backdrop-blur-xl border border-[#D6CFC2] rounded-2xl sm:rounded-3xl p-5 sm:p-8 transition-all duration-700 shadow-xl shadow-black/5",
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          {/* User Header */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#E7E2D7]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6B7F6B] to-[#8a9ba3] flex items-center justify-center shadow-lg shadow-[#6B7F6B]/20">
              <span className="text-white font-bold text-xl">
                {(userName || "U")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#2a2a2a]">{userName || "Learner"}</h2>
              <p className="text-sm text-[#888]">Your personalized learning profile</p>
            </div>
          </div>

          {/* Dimensions Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {(Object.keys(profileData) as Array<keyof ProfileData>).map((key, i) => {
              const meta = dimensionMeta[key];
              const Icon = meta.icon;
              const data = profileData[key];
              const isEditing = editingField === key;

              return (
                <div
                  key={key}
                  className={cn(
                    "p-5 rounded-2xl bg-[#F7F5F0] border border-[#E7E2D7] transition-all duration-500",
                    isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  )}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center", meta.color)}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-[#2a2a2a]">{meta.label}</span>
                    </div>
                    <button
                      onClick={() => setEditingField(isEditing ? null : key)}
                      className="p-2 rounded-lg hover:bg-[#E7E2D7] transition-colors"
                    >
                      {isEditing ? (
                        <Check className="w-4 h-4 text-[#6B7F6B]" />
                      ) : (
                        <Edit3 className="w-4 h-4 text-[#999] hover:text-[#666]" />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    <textarea
                      value={data.value}
                      onChange={(e) => handleEdit(key, e.target.value)}
                      className="w-full p-3 rounded-xl bg-white border border-[#6B7F6B]/30 text-sm text-[#2a2a2a] resize-none focus:outline-none focus:border-[#6B7F6B]/50 focus:ring-2 focus:ring-[#6B7F6B]/20"
                      rows={2}
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm text-[#555] leading-relaxed mb-3">{data.value}</p>
                  )}

                  {/* Tags */}
                  {!isEditing && (
                    <div className="flex flex-wrap gap-2">
                      {data.tags.map((tag, idx) => (
                        <span
                          key={`${tag}-${idx}`}
                          className="px-2 py-1 rounded-lg bg-[#E7E2D7] text-[10px] text-[#666] font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <div className="mt-8 pt-6 border-t border-[#E7E2D7]">
            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-[#6B7F6B] text-white font-semibold hover:bg-[#5a6d5a] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#6B7F6B]/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Building Your Path...
                </>
              ) : (
                <>
                  Continue to Notebook
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-[#888] mt-3">
              You can always update your profile later in settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
