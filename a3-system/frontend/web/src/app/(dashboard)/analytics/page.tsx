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

// Clean gray palette (matching notebook design)
const COLORS = {
  primary: "#111827",  // gray-900
  secondary: "#374151",  // gray-700
  muted: "#6b7280",  // gray-500
  light: "#9ca3af",  // gray-400
  border: "#e5e7eb",  // gray-200
  background: "#f9fafb",  // gray-50
  card: "#ffffff",
  text: "#111827",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  success: "#10b981",
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-creator-notes">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-gray-500">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-creator-notes">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
    <div className="min-h-screen bg-gray-50 font-creator-notes">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/notebook")}
              className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Learning Analytics
              </h1>
              <p className="text-sm text-gray-500">
                {userName ? `${userName}'s` : "Your"} learning journey insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {streak.current > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700">{streak.current} day streak</span>
              </div>
            )}

            {/* Delete Account Button - Subtle */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Delete</span>
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Study Time"
            value={`${overview.totalStudyTime}m`}
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            label="Modules"
            value={overview.modulesCompleted.toString()}
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Quizzes"
            value={overview.quizzesTaken.toString()}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Avg Score"
            value={`${overview.averageScore}%`}
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Over Time */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Progress Over Time</h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Last 14 days</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={256}>
                  <AreaChart data={progressChartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke={COLORS.primary}
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">This Week</h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Daily hours</span>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height={192}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.textMuted }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="hours" name="Hours" radius={[4, 4, 0, 0]}>
                      {weeklyData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === weeklyData.length - 1 ? COLORS.primary : COLORS.light}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Mastery Radar */}
            {radarData.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Topic Mastery</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height={288}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={COLORS.border} />
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
                        stroke={COLORS.primary}
                        fill={COLORS.primary}
                        fillOpacity={0.15}
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-gray-600" />
                    AI Insights
                  </h2>
                  {insights?.generated_at && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Updated {formatCacheTime(insights.generated_at)} • Refreshes daily
                    </p>
                  )}
                </div>
                {isLoadingInsights && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>

              {isLoadingInsights && !insights ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <p className="text-xs text-gray-500">Analyzing your learning patterns...</p>
                  </div>
                </div>
              ) : insights ? (
                <div className="space-y-3">
                  {/* Predictions */}
                  {insights.predictions && (
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                          <TrendIcon trend={insights.predictions.mastery_trajectory} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900 capitalize">
                            {insights.predictions.mastery_trajectory} Trajectory
                          </span>
                          <p className="text-xs text-gray-500">{insights.predictions.completion_forecast}</p>
                        </div>
                      </div>
                      {insights.predictions.at_risk && (
                        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <p className="text-xs font-medium text-amber-700">{insights.predictions.at_risk_reason}</p>
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
                  <p className="text-sm text-gray-500">Click refresh to generate AI insights</p>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {insights?.recommendations && insights.recommendations.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-gray-600" />
                  </div>
                  Recommendations
                </h2>
                <div className="space-y-3">
                  {insights.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">{rec.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{rec.title}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom Section - Full Width Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-gray-600" />
              </div>
              Recent Activity
            </h2>
            <div className="space-y-2">
              {activities.slice(0, 5).map((activity, i) => (
                <ActivityItem key={i} activity={activity} />
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Award className="w-4 h-4 text-gray-600" />
              </div>
              Achievements
            </h2>
            {achievements.length > 0 ? (
              <div className="space-y-2">
                {achievements.slice(0, 4).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{achievement.name}</p>
                      <p className="text-xs text-gray-500">{achievement.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">+{achievement.xp} XP</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No achievements yet</p>
            )}
          </div>

          {/* Comparative Analytics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              Peer Comparison
            </h2>
            {comparative?.available ? (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  {comparative.cohort_name} • {comparative.cohort_size} students
                </p>

                {/* Rank Badge */}
                {comparative.rank?.overall && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        #{comparative.rank.overall}
                        <span className="text-sm font-normal text-gray-500"> of {comparative.rank.total}</span>
                      </p>
                      <p className="text-xs text-gray-500">Overall Rank</p>
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
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 mt-3">No peer data available</p>
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
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") {
    return <TrendingUp className="w-5 h-5 text-emerald-500" />;
  } else if (trend === "declining") {
    return <TrendingDown className="w-5 h-5 text-rose-500" />;
  }
  return <Minus className="w-5 h-5 text-gray-400" />;
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{insight.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const isWarning = alert.severity === "warning";
  
  return (
    <div className={`p-4 rounded-lg border ${isWarning ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isWarning ? "bg-amber-100" : "bg-gray-100"}`}>
          <AlertTriangle className={`w-4 h-4 ${isWarning ? "text-amber-600" : "text-gray-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isWarning ? "text-amber-800" : "text-gray-900"}`}>{alert.title}</p>
          <p className={`text-xs mt-1 leading-relaxed ${isWarning ? "text-amber-700" : "text-gray-600"}`}>{alert.description}</p>
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
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          {vsAvg != null && (
            <span className={`text-xs font-medium ${vsAvg >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {vsAvg >= 0 ? "+" : ""}{vsAvg.toFixed(1)}%
            </span>
          )}
          <span className="text-xs text-gray-500">{getPercentileLabel(percentile)}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(percentile, 5)}%` }}
        />
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const typeIcons: Record<string, React.ReactNode> = {
    quiz: <Target className="w-4 h-4 text-gray-600" />,
    resource_consumed: <BookOpen className="w-4 h-4 text-gray-600" />,
    resource_viewed: <BookOpen className="w-4 h-4 text-gray-400" />,
    tutor_session: <Brain className="w-4 h-4 text-gray-600" />,
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
        {typeIcons[activity.type] || <Zap className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{activity.title}</p>
        <p className="text-xs text-gray-500">{activity.date}</p>
      </div>
      {activity.score !== undefined && (
        <span className="text-xs font-semibold text-gray-600">{activity.score}%</span>
      )}
      {activity.xp !== undefined && activity.xp > 0 && (
        <span className="text-xs font-semibold text-gray-600">+{activity.xp} XP</span>
      )}
    </div>
  );
}
