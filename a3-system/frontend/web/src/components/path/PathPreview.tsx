"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  Users,
  Star,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Route,
  GripVertical,
  X,
  ArrowRight,
  Zap,
} from "lucide-react";
import {
  GraphNode,
  SocialProof,
  getGraph,
  acceptPath,
  editPath,
  regenerateGraph,
  getQuota,
  GenerateGraphResponse,
} from "@/lib/api";

interface PathPreviewProps {
  previewId: string;
  graphId: string;
  studentId: string;
  pathSequence: string[];
  socialProof: SocialProof;
  expiresAt: string;
  onAccept: (graphId: string, pathSequence: string[]) => void;
  onRegenerate: (response: GenerateGraphResponse) => void;
  onCancel: () => void;
  isPremium?: boolean;
}

export default function PathPreview({
  previewId,
  graphId,
  studentId,
  pathSequence: initialSequence,
  socialProof,
  expiresAt,
  onAccept,
  onRegenerate,
  onCancel,
  isPremium = false,
}: PathPreviewProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [pathSequence, setPathSequence] = useState<string[]>(initialSequence);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; canGenerate: boolean } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [skippedNodes, setSkippedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGraphDetails();
    loadQuota();
  }, [graphId]);

  const loadGraphDetails = async () => {
    try {
      const graph = await getGraph(graphId);
      setNodes(graph.nodes);
      setLoading(false);
    } catch (err) {
      setError("Failed to load path details");
      setLoading(false);
    }
  };

  const loadQuota = async () => {
    try {
      const q = await getQuota(studentId, "current_subject", isPremium);
      setQuota({ remaining: q.remaining, canGenerate: q.can_generate });
    } catch {
      // Ignore quota errors
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const result = await acceptPath(previewId, studentId);
      onAccept(result.graph_id, result.path_sequence);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept path";
      setError(message);
      setAccepting(false);
    }
  };

  const handleRegenerate = async () => {
    if (!quota?.canGenerate && !isPremium) {
      setError("No generations remaining. Upgrade to premium for unlimited.");
      return;
    }

    setRegenerating(true);
    setError(null);
    try {
      const graph = await getGraph(graphId);
      const response = await regenerateGraph(
        studentId,
        graph.subject,
        [],
        undefined,
        isPremium
      );
      onRegenerate(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to regenerate";
      setError(message);
      setRegenerating(false);
    }
  };

  const handleSkipNode = async (nodeId: string) => {
    try {
      const result = await editPath(previewId, "skip", nodeId);
      setPathSequence(result.path_sequence);
      setSkippedNodes((prev) => new Set([...prev, nodeId]));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to skip node";
      setError(message);
    }
  };

  const getNodeDetails = (nodeId: string): GraphNode | undefined => {
    return nodes.find((n) => n.node_id === nodeId);
  };

  const totalTime = pathSequence.reduce((sum, nodeId) => {
    const node = getNodeDetails(nodeId);
    return sum + (node?.estimated_minutes || 30);
  }, 0);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 0.3) return "text-green-500";
    if (difficulty < 0.6) return "text-yellow-500";
    return "text-orange-500";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 0.3) return "Beginner";
    if (difficulty < 0.6) return "Intermediate";
    return "Advanced";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-sage-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sage-500 to-sage-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Route className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Your Learning Path</h2>
              <p className="text-sage-100 text-sm">
                Review and customize before starting
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Social Proof Banner */}
      <div className="bg-sage-50 px-6 py-3 border-b border-sage-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sage-700">
              <Users className="w-4 h-4" />
              <span>
                <strong>{socialProof.verified_by_count}</strong> students verified
              </span>
            </div>
            <div className="flex items-center gap-2 text-sage-700">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>
                <strong>{socialProof.avg_rating.toFixed(1)}</strong> rating
              </span>
            </div>
            <div className="flex items-center gap-2 text-sage-700">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>
                <strong>{socialProof.completion_rate}%</strong> completion
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sage-600">
            <Clock className="w-4 h-4" />
            <span>~{formatTime(totalTime)} total</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border-b border-red-100 px-6 py-3"
          >
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Path Nodes */}
      <div className="p-6 max-h-[400px] overflow-y-auto">
        <div className="space-y-3">
          {pathSequence.map((nodeId, index) => {
            const node = getNodeDetails(nodeId);
            if (!node) return null;

            const isSkipped = skippedNodes.has(nodeId);

            return (
              <motion.div
                key={nodeId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isSkipped ? 0.5 : 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isSkipped
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-sage-100 hover:border-sage-300 hover:shadow-sm"
                }`}
              >
                {/* Step Number */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isSkipped
                      ? "bg-gray-200 text-gray-500"
                      : "bg-sage-100 text-sage-700"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Node Info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-medium ${
                      isSkipped ? "text-gray-500 line-through" : "text-deep-charcoal"
                    }`}
                  >
                    {node.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(node.estimated_minutes)}
                    </span>
                    <span className={getDifficultyColor(node.difficulty)}>
                      {getDifficultyLabel(node.difficulty)}
                    </span>
                    {node.topic_tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-sage-50 text-sage-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {editMode && !isSkipped && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSkipNode(nodeId)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Skip this topic"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="cursor-move text-gray-300">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Arrow */}
                {index < pathSequence.length - 1 && !editMode && (
                  <ChevronRight className="w-5 h-5 text-sage-300 flex-shrink-0" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-sage-100 bg-sage-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                editMode
                  ? "bg-sage-200 text-sage-700"
                  : "bg-white border border-sage-200 text-sage-600 hover:bg-sage-50"
              }`}
            >
              {editMode ? "Done Editing" : "Customize Path"}
            </button>

            <button
              onClick={handleRegenerate}
              disabled={regenerating || (!quota?.canGenerate && !isPremium)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-sage-200 text-sage-600 hover:bg-sage-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
              Regenerate
              {quota && !isPremium && (
                <span className="text-xs text-gray-400">
                  ({quota.remaining} left)
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex items-center gap-2 px-6 py-2.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {accepting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Starting...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Looks Good, Start Learning!
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
