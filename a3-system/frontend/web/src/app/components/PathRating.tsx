"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target } from "lucide-react";
import {
  submitPathRating,
  getPathRatings,
  PathRatingRequest,
  PathRatingsData,
} from "@/lib/api";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? "cursor-default" : "cursor-pointer"} transition-transform hover:scale-110`}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          onClick={() => onChange?.(star)}
        >
          <svg
            className={`${sizeClasses[size]} ${
              (hoverValue || value) >= star
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300 fill-gray-300"
            } transition-colors`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

interface PathRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphId: string;
  studentId: string;
  pathSubject: string;
  completionPercentage?: number;
  onRatingSubmitted?: () => void;
}

export function PathRatingModal({
  isOpen,
  onClose,
  graphId,
  studentId,
  pathSubject,
  completionPercentage = 0,
  onRatingSubmitted,
}: PathRatingModalProps) {
  const [step, setStep] = useState<"rating" | "details" | "success">("rating");
  const [overallRating, setOverallRating] = useState(0);
  const [contentQuality, setContentQuality] = useState(0);
  const [difficultyAppropriateness, setDifficultyAppropriateness] = useState(0);
  const [structureClarity, setStructureClarity] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (overallRating === 0) {
      setError("Please select an overall rating");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const rating: PathRatingRequest = {
        overall_rating: overallRating,
        content_quality: contentQuality || undefined,
        difficulty_appropriateness: difficultyAppropriateness || undefined,
        structure_clarity: structureClarity || undefined,
        feedback_text: feedbackText || undefined,
        would_recommend: wouldRecommend ?? undefined,
      };

      await submitPathRating(graphId, studentId, rating);
      setStep("success");
      onRatingSubmitted?.();
    } catch (err) {
      setError("Failed to submit rating. Please try again.");
      console.error("Rating submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("rating");
    setOverallRating(0);
    setContentQuality(0);
    setDifficultyAppropriateness(0);
    setStructureClarity(0);
    setFeedbackText("");
    setWouldRecommend(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {step === "rating" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-deep-charcoal">
                  Rate Your Learning Path
                </h2>
                <p className="text-gray-500 mt-1">
                  {pathSubject}
                </p>
                {completionPercentage > 0 && (
                  <p className="text-sm text-sage-600 mt-2">
                    {completionPercentage}% completed
                  </p>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">How would you rate this learning path?</p>
                <div className="flex justify-center">
                  <StarRating value={overallRating} onChange={setOverallRating} size="lg" />
                </div>
                {overallRating > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {overallRating === 1 && "Poor"}
                    {overallRating === 2 && "Fair"}
                    {overallRating === 3 && "Good"}
                    {overallRating === 4 && "Very Good"}
                    {overallRating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => overallRating > 0 && setStep("details")}
                  disabled={overallRating === 0}
                  className="flex-1 px-4 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-deep-charcoal">
                  Tell Us More
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Optional: Help us improve (you can skip this)
                </p>
              </div>

              {/* Detailed ratings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Content Quality</span>
                  <StarRating value={contentQuality} onChange={setContentQuality} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Difficulty Level</span>
                  <StarRating value={difficultyAppropriateness} onChange={setDifficultyAppropriateness} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Structure & Clarity</span>
                  <StarRating value={structureClarity} onChange={setStructureClarity} size="sm" />
                </div>
              </div>

              {/* Would recommend */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Would you recommend this path?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWouldRecommend(true)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      wouldRecommend === true
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    👍 Yes
                  </button>
                  <button
                    onClick={() => setWouldRecommend(false)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      wouldRecommend === false
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    👎 No
                  </button>
                </div>
              </div>

              {/* Feedback text */}
              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  Any additional feedback?
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What did you like? What could be improved?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                  rows={3}
                  maxLength={1000}
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("rating")}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-xl font-semibold text-deep-charcoal mb-2">
                Thank You!
              </h2>
              <p className="text-gray-500 mb-6">
                Your feedback helps us improve learning paths for everyone.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface PathRatingsDisplayProps {
  graphId: string;
  compact?: boolean;
}

export function PathRatingsDisplay({ graphId, compact = false }: PathRatingsDisplayProps) {
  const [ratings, setRatings] = useState<PathRatingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRatings() {
      try {
        const data = await getPathRatings(graphId);
        setRatings(data);
      } catch (err) {
        console.error("Failed to fetch ratings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRatings();
  }, [graphId]);

  if (loading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!ratings || ratings.total_ratings === 0) {
    return compact ? null : (
      <div className="flex items-center gap-2 text-sm text-[#6B7F6B]">
        <Target className="w-4 h-4" />
        <span>AI-generated just for you</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">
          {ratings.average_rating.toFixed(1)}
        </span>
        <span className="text-sm text-gray-400">
          ({ratings.total_ratings})
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-deep-charcoal">
            {ratings.average_rating.toFixed(1)}
          </div>
          <StarRating value={Math.round(ratings.average_rating)} readonly size="sm" />
          <p className="text-sm text-gray-500 mt-1">
            {ratings.total_ratings} {ratings.total_ratings === 1 ? "rating" : "ratings"}
          </p>
        </div>

        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratings.rating_distribution[star] || 0;
            const percentage = ratings.total_ratings > 0 
              ? (count / ratings.total_ratings) * 100 
              : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-3">{star}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {ratings.would_recommend_percentage > 0 && (
        <div className="text-center pt-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-green-600">
              {ratings.would_recommend_percentage.toFixed(0)}%
            </span>{" "}
            would recommend this path
          </span>
        </div>
      )}
    </div>
  );
}

interface RatingPromptProps {
  graphId: string;
  studentId: string;
  pathSubject: string;
  completionPercentage: number;
  hasRated?: boolean;
}

export function RatingPrompt({
  graphId,
  studentId,
  pathSubject,
  completionPercentage,
  hasRated = false,
}: RatingPromptProps) {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rated, setRated] = useState(hasRated);

  // Show prompt at 50% or 100% completion
  const shouldShow = !rated && !dismissed && (completionPercentage >= 50);

  if (!shouldShow) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-sage-50 to-sage-100 border border-sage-200 rounded-xl p-4 mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sage-200 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-deep-charcoal">
                {completionPercentage >= 100 
                  ? "Congratulations on completing this path!" 
                  : "How's your learning going?"}
              </p>
              <p className="text-sm text-gray-600">
                Share your feedback to help others
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors text-sm font-medium"
            >
              Rate Path
            </button>
          </div>
        </div>
      </motion.div>

      <PathRatingModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        graphId={graphId}
        studentId={studentId}
        pathSubject={pathSubject}
        completionPercentage={completionPercentage}
        onRatingSubmitted={() => setRated(true)}
      />
    </>
  );
}
