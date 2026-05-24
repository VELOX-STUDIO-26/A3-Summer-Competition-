"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  getAnalytics,
  getAnalyticsInsights,
  getAnalyticsProgress,
  getAnalyticsActivity,
  getStudentCohorts,
  getComparativeMetrics,
  deleteAccount,
} from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  Zap,
  BookOpen,
  Brain,
  Flame,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Loader2,
  Calendar,
  Award,
  Users,
  Trophy,
  BarChart3,
  Trash2,
} from "lucide-react";

// Sage & Sand color palette
const COLORS = {
  sage: "#6B7F6B",
  sageDark: "#5a6d5a",
  sageLight: "#8a9ba3",
  sand: "#D6CFC2",
  sandLight: "#E7E2D7",
  sandLighter: "#F7F5F0",
  cream: "#FAF8F5",
  text: "#2a2a2a",
  textMuted: "#666",
  textLight: "#888",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
};

interface Insight {
  category: string;
  emoji: string;
  title: string;
  description: string;
  confidence: number;
  priority: string;
}

interface Prediction {
  completion_forecast: string;
  at_risk: boolean;
  at_risk_reason?: string;
  mastery_trajectory: string;
  next_milestone_days?: number;
}

interface Recommendation {
  emoji: string;
  title: string;
  description: string;
  priority: string;
}

interface Alert {
  emoji: string;
  title: string;
  description: string;
  severity: string;
}

interface AnalyticsData {
  overview: {
    totalStudyTime: number;
    modulesCompleted: number;
    quizzesTaken: number;
    averageScore: number;
  };
  weeklyProgress: { day: string; hours: number; modules: number }[];
  subjectBreakdown: { subject: string; progress: number; time: number; quizzes: number }[];
  streak: { current: number; longest: number };
  achievements: { id: string; name: string; description: string; date: string; xp: number }[];
}

interface InsightsData {
  behavioral_summary: {
    study_pattern: { preferred_hours: number[]; busiest_day: string; avg_session_minutes: number };
    performance: { avg_score: number; trend: string; weak_topics: string[]; strong_topics: string[] };
    engagement: { preferred_resource: string; total_resources: number; tutor_sessions: number };
    progress: { completion_pct: number; current_streak: number; velocity_7d: number };
  };
  insights: Insight[];
  predictions: Prediction;
  recommendations: Recommendation[];
  alerts: Alert[];
  // Cache metadata
  from_cache?: boolean;
  generated_at?: string;
  expires_at?: string;
  generation_count?: number;
}

interface ProgressData {
  progress: { date: string; hours: number; quizzes_taken: number; average_score: number }[];
}

interface Activity {
  type: string;
  title: string;
  score?: number;
  xp?: number;
  date: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { studentId, userName, logout } = useAppStore();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comparative, setComparative] = useState<{
    available: boolean;
    cohort_name?: string;
    cohort_size?: number;
    percentiles?: { quiz_score?: number; completion?: number; study_hours?: number };
    vs_average?: { quiz_score?: number; completion?: number; study_hours?: number };
    rank?: { overall?: number; total?: number };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all analytics data
  useEffect(() => {
    async function fetchData() {
      if (!studentId) {
        router.push("/login");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [analyticsRes, progressRes, activityRes] = await Promise.all([
          getAnalytics(studentId),
          getAnalyticsProgress(studentId, 30),
          getAnalyticsActivity(studentId, 20),
        ]);

        setAnalytics(analyticsRes);
        setProgress(progressRes);
        setActivities(activityRes.activities || []);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [studentId, router]);

  // Fetch LLM insights separately (can be slow)
  const fetchInsights = async (forceRefresh: boolean = false) => {
    if (!studentId) return;

    setIsLoadingInsights(true);
    try {
      const insightsRes = await getAnalyticsInsights(studentId, forceRefresh);
      setInsights(insightsRes);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Format relative time for cache display
  const formatCacheTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Fetch comparative metrics
  const fetchComparative = async () => {
    if (!studentId) return;
    try {
      // First get student's cohorts
      const cohortsRes = await getStudentCohorts(studentId);
      if (cohortsRes.cohorts && cohortsRes.cohorts.length > 0) {
        // Get comparative metrics for first cohort
        const cohortId = cohortsRes.cohorts[0].cohort_id;
        const metricsRes = await getComparativeMetrics(cohortId, studentId);
        setComparative(metricsRes);
      }
    } catch (err) {
      console.error("Failed to fetch comparative metrics:", err);
      // Not critical - just don't show comparative section
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!studentId) return;
    
    setIsDeleting(true);
    try {
      await deleteAccount(studentId);
      // Clear local state and redirect to login
      logout();
      router.push("/login");
    } catch (err) {
      console.error("Failed to delete account:", err);
      setError("Failed to delete account. Please try again.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (studentId && !isLoading) {
      fetchInsights(false);
      fetchComparative();
    }
  }, [studentId, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B7F6B]" />
          <p className="text-[#666]">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-[#666] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#6B7F6B] text-white rounded-lg hover:bg-[#5a6d5a]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overview = analytics?.overview || {
    totalStudyTime: 0,
    modulesCompleted: 0,
    quizzesTaken: 0,
    averageScore: 0,
  };

  const weeklyData = analytics?.weeklyProgress || [];
  const subjectData = analytics?.subjectBreakdown || [];
  const streak = analytics?.streak || { current: 0, longest: 0 };
  const achievements = analytics?.achievements || [];

  // Build radar chart data from subject breakdown
  const radarData = subjectData.slice(0, 6).map((s) => ({
    subject: s.subject.length > 12 ? s.subject.slice(0, 12) + "..." : s.subject,
    mastery: s.progress,
    fullMark: 100,
  }));

  // Progress chart data
  const progressChartData = (progress?.progress || []).slice(-14).map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hours: p.hours,
    score: p.average_score,
  }));

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2a2a2a]">Delete Account?</h3>
                <p className="text-sm text-[#666]">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-sm text-[#555] mb-6">
              This will permanently delete your account and all associated data including:
            </p>
            <ul className="text-sm text-[#666] mb-6 space-y-1 ml-4">
              <li>• Your learning profile</li>
              <li>• All quiz attempts and scores</li>
              <li>• All tutor chat sessions</li>
              <li>• All learning progress</li>
            </ul>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#D6CFC2] text-[#666] hover:bg-[#F7F5F0] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-medium hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#6B7F6B]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#D6CFC2]/30 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/notebook")}
              className="p-2 rounded-lg hover:bg-[#E7E2D7] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#666]" />
            </button>
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#2a2a2a]">
                Learning Analytics
              </h1>
              <p className="text-sm text-[#888]">
                {userName ? `${userName}'s` : "Your"} learning journey insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200/60 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-orange-700">{streak.current} day streak</span>
            </div>

            {/* Delete Account Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Delete Account</span>
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Study Time"
            value={`${overview.totalStudyTime}m`}
            color="sage"
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            label="Modules"
            value={overview.modulesCompleted.toString()}
            color="blue"
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Quizzes"
            value={overview.quizzesTaken.toString()}
            color="purple"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Avg Score"
            value={`${overview.averageScore}%`}
            color="amber"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Over Time */}
            <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#2a2a2a]">Progress Over Time</h2>
                <span className="text-xs text-[#888] bg-[#F7F5F0] px-2 py-1 rounded-md">Last 14 days</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={256}>
                  <AreaChart data={progressChartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.sage} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.sage} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.sandLight} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: `1px solid ${COLORS.sand}`,
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke={COLORS.sage}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorHours)"
                      name="Study Hours"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Activity */}
            <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#2a2a2a]">This Week</h2>
                <span className="text-xs text-[#888] bg-[#F7F5F0] px-2 py-1 rounded-md">Daily hours</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height={192}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.sandLight} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: `1px solid ${COLORS.sand}`,
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="hours" name="Hours" radius={[4, 4, 0, 0]}>
                      {weeklyData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === weeklyData.length - 1 ? COLORS.sage : COLORS.sageLight}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Mastery Radar */}
            {radarData.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#D6CFC2] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4">Topic Mastery</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height={288}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={COLORS.sandLight} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10, fill: COLORS.textMuted }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: COLORS.textLight }}
                      />
                      <Radar
                        name="Mastery"
                        dataKey="mastery"
                        stroke={COLORS.sage}
                        fill={COLORS.sage}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Insights & Activity */}
          <div className="space-y-6">
            {/* AI Insights */}
            <div className="bg-gradient-to-br from-white to-[#F7F5F0]/50 rounded-2xl border border-[#D6CFC2]/60 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#2a2a2a] flex items-center gap-2">
                    <Brain className="w-5 h-5 text-[#6B7F6B]" />
                    AI Insights
                  </h2>
                  {insights?.generated_at && (
                    <p className="text-xs text-[#888] mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Updated {formatCacheTime(insights.generated_at)} • Refreshes daily
                    </p>
                  )}
                </div>
                {isLoadingInsights && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#6B7F6B]" />
                )}
              </div>

              {isLoadingInsights && !insights ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#6B7F6B]" />
                    <p className="text-xs text-[#888]">Analyzing your learning patterns...</p>
                  </div>
                </div>
              ) : insights ? (
                <div className="space-y-3">
                  {/* Predictions */}
                  {insights.predictions && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#6B7F6B]/10 to-[#8a9ba3]/10 border border-[#6B7F6B]/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                          <TrendIcon trend={insights.predictions.mastery_trajectory} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-[#2a2a2a] capitalize">
                            {insights.predictions.mastery_trajectory} Trajectory
                          </span>
                          <p className="text-xs text-[#666]">{insights.predictions.completion_forecast}</p>
                        </div>
                      </div>
                      {insights.predictions.at_risk && (
                        <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <p className="text-xs font-medium text-rose-700">{insights.predictions.at_risk_reason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Insights */}
                  {insights.insights?.slice(0, 3).map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}

                  {/* Alerts */}
                  {insights.alerts?.map((alert, i) => (
                    <AlertCard key={i} alert={alert} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-[#888]">Click refresh to generate AI insights</p>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {insights?.recommendations && insights.recommendations.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 rounded-2xl border border-amber-200/60 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#2a2a2a] flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  Recommendations
                </h2>
                <div className="space-y-3">
                  {insights.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-white/80 border border-amber-200/40 hover:bg-white hover:shadow-sm transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-lg">{rec.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#2a2a2a]">{rec.title}</p>
                          <p className="text-xs text-[#555] mt-1 leading-relaxed">{rec.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#2a2a2a] flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#E7E2D7] flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#6B7F6B]" />
                </div>
                Recent Activity
              </h2>
              <div className="space-y-2">
                {activities.slice(0, 8).map((activity, i) => (
                  <ActivityItem key={i} activity={activity} />
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-[#888] text-center py-4">No recent activity</p>
                )}
              </div>
            </div>

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="bg-gradient-to-br from-violet-50/50 to-purple-50/30 rounded-2xl border border-violet-200/60 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#2a2a2a] flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  Achievements
                </h2>
                <div className="space-y-2">
                  {achievements.slice(0, 4).map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F7F5F0] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2a2a2a] truncate">{achievement.name}</p>
                        <p className="text-xs text-[#888]">{achievement.description}</p>
                      </div>
                      <span className="text-xs font-semibold text-amber-600">+{achievement.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparative Analytics */}
            {comparative?.available && (
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl border border-blue-200/60 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#2a2a2a] flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  Peer Comparison
                </h2>
                <p className="text-xs text-[#888] mb-4">
                  {comparative.cohort_name} • {comparative.cohort_size} students
                </p>

                {/* Rank Badge */}
                {comparative.rank?.overall && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-blue-100 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#2a2a2a]">
                        #{comparative.rank.overall}
                        <span className="text-sm font-normal text-[#888]"> of {comparative.rank.total}</span>
                      </p>
                      <p className="text-xs text-[#666]">Overall Rank</p>
                    </div>
                  </div>
                )}

                {/* Percentile Bars */}
                <div className="space-y-3">
                  {comparative.percentiles?.quiz_score !== undefined && (
                    <PercentileBar
                      label="Quiz Score"
                      percentile={comparative.percentiles.quiz_score}
                      vsAvg={comparative.vs_average?.quiz_score}
                    />
                  )}
                  {comparative.percentiles?.completion !== undefined && (
                    <PercentileBar
                      label="Completion"
                      percentile={comparative.percentiles.completion}
                      vsAvg={comparative.vs_average?.completion}
                    />
                  )}
                  {comparative.percentiles?.study_hours !== undefined && (
                    <PercentileBar
                      label="Study Time"
                      percentile={comparative.percentiles.study_hours}
                      vsAvg={comparative.vs_average?.study_hours}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components

function StatCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "sage" | "blue" | "purple" | "amber";
  subtitle?: string;
}) {
  const colorMap = {
    sage: { bg: "bg-[#6B7F6B]/10", icon: "from-[#6B7F6B] to-[#5a6d5a]", text: "text-[#6B7F6B]" },
    blue: { bg: "bg-blue-50", icon: "from-blue-500 to-blue-600", text: "text-blue-600" },
    purple: { bg: "bg-violet-50", icon: "from-violet-500 to-purple-600", text: "text-violet-600" },
    amber: { bg: "bg-amber-50", icon: "from-amber-500 to-orange-500", text: "text-amber-600" },
  };

  return (
    <div className={`rounded-2xl border border-[#D6CFC2]/60 p-5 shadow-sm hover:shadow-md transition-all duration-300 ${colorMap[color].bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorMap[color].icon} flex items-center justify-center text-white shadow-lg shadow-black/10`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${colorMap[color].text} tracking-tight`}>{value}</p>
      <p className="text-sm font-medium text-[#555] mt-1">{label}</p>
      {subtitle && <p className="text-xs text-[#888] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") {
    return <TrendingUp className="w-5 h-5 text-emerald-500" />;
  } else if (trend === "declining") {
    return <TrendingDown className="w-5 h-5 text-rose-500" />;
  }
  return <Minus className="w-5 h-5 text-[#8a9ba3]" />;
}

function InsightCard({ insight }: { insight: Insight }) {
  const priorityStyles = {
    high: { bg: "bg-rose-50/50", icon: "bg-rose-100" },
    medium: { bg: "bg-amber-50/30", icon: "bg-amber-100" },
    low: { bg: "bg-[#6B7F6B]/5", icon: "bg-[#6B7F6B]/10" },
  };
  const style = priorityStyles[insight.priority as keyof typeof priorityStyles] || priorityStyles.medium;

  return (
    <div
      className={`p-4 rounded-xl ${style.bg} border border-[#E7E2D7]/60 hover:shadow-sm transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg ${style.icon} flex items-center justify-center flex-shrink-0`}>
          <span className="text-lg">{insight.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#2a2a2a]">{insight.title}</p>
          <p className="text-xs text-[#555] mt-1 leading-relaxed line-clamp-3">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const severityStyles = {
    critical: { bg: "bg-gradient-to-r from-rose-50 to-red-50", border: "border-rose-200", icon: "bg-rose-100", text: "text-rose-700" },
    warning: { bg: "bg-gradient-to-r from-amber-50 to-orange-50", border: "border-amber-200", icon: "bg-amber-100", text: "text-amber-700" },
  };
  const style = severityStyles[alert.severity as keyof typeof severityStyles] || severityStyles.warning;

  return (
    <div className={`p-4 rounded-xl ${style.bg} border ${style.border}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg ${style.icon} flex items-center justify-center flex-shrink-0`}>
          <AlertTriangle className={`w-4 h-4 ${style.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${style.text}`}>{alert.title}</p>
          <p className={`text-xs mt-1 ${style.text} opacity-80 leading-relaxed`}>{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function PercentileBar({
  label,
  percentile,
  vsAvg,
}: {
  label: string;
  percentile: number;
  vsAvg?: number;
}) {
  const getPercentileColor = (p: number) => {
    if (p >= 75) return "from-emerald-400 to-green-500";
    if (p >= 50) return "from-blue-400 to-indigo-500";
    if (p >= 25) return "from-amber-400 to-orange-500";
    return "from-rose-400 to-red-500";
  };

  const getPercentileLabel = (p: number) => {
    if (p >= 90) return "Top 10%";
    if (p >= 75) return "Top 25%";
    if (p >= 50) return "Above Average";
    if (p >= 25) return "Below Average";
    return "Needs Improvement";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[#555]">{label}</span>
        <div className="flex items-center gap-2">
          {vsAvg != null && (
            <span className={`text-xs font-medium ${vsAvg >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {vsAvg >= 0 ? "+" : ""}{vsAvg.toFixed(1)}%
            </span>
          )}
          <span className="text-xs text-[#888]">{getPercentileLabel(percentile)}</span>
        </div>
      </div>
      <div className="h-2 bg-[#E7E2D7] rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getPercentileColor(percentile)} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(percentile, 5)}%` }}
        />
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const typeIcons: Record<string, React.ReactNode> = {
    quiz: <Target className="w-4 h-4 text-violet-500" />,
    resource_consumed: <BookOpen className="w-4 h-4 text-blue-500" />,
    resource_viewed: <BookOpen className="w-4 h-4 text-[#8a9ba3]" />,
    tutor_session: <Brain className="w-4 h-4 text-[#6B7F6B]" />,
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#E7E2D7] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[#F7F5F0] flex items-center justify-center">
        {typeIcons[activity.type] || <Zap className="w-4 h-4 text-[#888]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#2a2a2a] truncate">{activity.title}</p>
        <p className="text-xs text-[#888]">{activity.date}</p>
      </div>
      {activity.score !== undefined && (
        <span className="text-xs font-semibold text-[#6B7F6B]">{activity.score}%</span>
      )}
      {activity.xp !== undefined && activity.xp > 0 && (
        <span className="text-xs font-semibold text-amber-600">+{activity.xp} XP</span>
      )}
    </div>
  );
}
