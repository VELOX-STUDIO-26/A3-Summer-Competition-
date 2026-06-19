"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock,
  BookOpen,
  ChevronRight,
  Sparkles,
  Target,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface SubtopicInfo {
  id: string;
  title: string;
  estimated_minutes: number;
  difficulty: number;
}

interface MainTopicInfo {
  id: string;
  title: string;
  description: string | null;
  subtopic_count: number;
  estimated_minutes: number;
  difficulty: number;
  prerequisites: string[];
  subtopics: SubtopicInfo[];
}

interface GraphData {
  subject: string;
  main_topic_count: number;
  total_subtopic_count: number;
  total_estimated_minutes: number;
  difficulty_level: string;
  estimated_duration_weeks: number;
  main_topics: MainTopicInfo[];
}

interface Node {
  id: string;
  x: number;
  y: number;
  radius: number;
  topic: MainTopicInfo;
  index: number;
}

interface Edge {
  source: string;
  target: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  node: {
    beginner: { bg: "#E8F5E9", border: "#66BB6A", text: "#2E7D32", glow: "rgba(102, 187, 106, 0.3)" },
    intermediate: { bg: "#FFF3E0", border: "#FFA726", text: "#E65100", glow: "rgba(255, 167, 38, 0.3)" },
    advanced: { bg: "#FFEBEE", border: "#EF5350", text: "#C62828", glow: "rgba(239, 83, 80, 0.3)" },
  },
  edge: "#D6CFC2",
  edgeActive: "#6B7F6B",
  background: "rgba(250, 248, 245, 0.8)",
};

const getDifficultyColor = (difficulty: number) => {
  if (difficulty < 0.4) return COLORS.node.beginner;
  if (difficulty < 0.7) return COLORS.node.intermediate;
  return COLORS.node.advanced;
};

// ============================================================================
// S-Curve Timeline Layout
// ============================================================================

function useTimelineLayout(
  nodes: Node[],
  width: number,
  height: number
) {
  return useMemo(() => {
    if (!width || !height || nodes.length === 0) {
      return new Map<string, { x: number; y: number }>();
    }

    const positions = new Map<string, { x: number; y: number }>();
    const nodeCount = nodes.length;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Special case: single node - center it
    if (nodeCount === 1) {
      positions.set(nodes[0].id, { x: centerX, y: centerY });
      return positions;
    }
    
    // Special case: 2-3 nodes - horizontal line
    if (nodeCount <= 3) {
      const spacing = Math.min(180, (width - 160) / (nodeCount - 1));
      const startX = centerX - (spacing * (nodeCount - 1)) / 2;
      nodes.forEach((node, i) => {
        positions.set(node.id, { x: startX + i * spacing, y: centerY });
      });
      return positions;
    }
    
    // Calculate layout parameters for larger graphs
    const padding = 100;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2 - 60; // Extra space for labels
    
    // Determine number of nodes per row for S-curve (3-4 per row)
    const nodesPerRow = nodeCount <= 8 ? Math.min(4, Math.ceil(nodeCount / 2)) : 4;
    const rows = Math.ceil(nodeCount / nodesPerRow);
    
    // Calculate spacing
    const horizontalSpacing = usableWidth / Math.max(nodesPerRow - 1, 1);
    const verticalSpacing = rows > 1 ? usableHeight / (rows - 1) : 0;
    
    // Vertical offset to center the graph
    const totalHeight = (rows - 1) * verticalSpacing;
    const startY = (height - totalHeight) / 2;

    nodes.forEach((node, i) => {
      const row = Math.floor(i / nodesPerRow);
      const colInRow = i % nodesPerRow;
      
      // How many nodes in this row?
      const nodesInThisRow = Math.min(nodesPerRow, nodeCount - row * nodesPerRow);
      
      // S-curve: alternate direction each row
      const isReversedRow = row % 2 === 1;
      const col = isReversedRow ? (nodesInThisRow - 1 - colInRow) : colInRow;
      
      // Center partial rows
      const rowWidth = (nodesInThisRow - 1) * horizontalSpacing;
      const rowStartX = (width - rowWidth) / 2;
      
      // Calculate position
      const x = rowStartX + col * horizontalSpacing;
      const y = startY + row * verticalSpacing;
      
      positions.set(node.id, { x, y });
    });

    return positions;
  }, [nodes, width, height]);
}

// ============================================================================
// Graph Node Component - Clean circles with labels below
// ============================================================================

function GraphNode({
  node,
  position,
  isSelected,
  isConnected,
  onSelect,
  onHover,
}: {
  node: Node;
  position: { x: number; y: number };
  isSelected: boolean;
  isConnected: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const colors = getDifficultyColor(node.topic.difficulty);
  const nodeRadius = 28;

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect(isSelected ? null : node.id)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Glow effect */}
      {(isSelected || isConnected) && (
        <circle
          r={nodeRadius + 12}
          fill={colors.glow}
        />
      )}

      {/* Outer ring for selected state */}
      {isSelected && (
        <circle
          r={nodeRadius + 6}
          fill="none"
          stroke={colors.border}
          strokeWidth={2}
          strokeDasharray="4,4"
        />
      )}

      {/* Main circle - clean with just the step number */}
      <circle
        r={nodeRadius}
        fill={colors.bg}
        stroke={colors.border}
        strokeWidth={isSelected ? 3 : 2}
      />

      {/* Step number - centered in circle */}
      <text
        y={1}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.border}
        fontSize="18"
        fontWeight="700"
        style={{ pointerEvents: "none" }}
      >
        {node.index + 1}
      </text>

      {/* Full title label BELOW the circle */}
      <text
        y={nodeRadius + 18}
        textAnchor="middle"
        fill="#2a2a2a"
        fontSize="11"
        fontWeight="600"
        style={{ pointerEvents: "none" }}
      >
        {node.topic.title.length > 28
          ? node.topic.title.substring(0, 26) + "..."
          : node.topic.title}
      </text>

      {/* Stats below title */}
      <text
        y={nodeRadius + 34}
        textAnchor="middle"
        fill="#888"
        fontSize="10"
        style={{ pointerEvents: "none" }}
      >
        {node.topic.subtopic_count} lessons • {node.topic.estimated_minutes}min
      </text>

      {/* Difficulty indicator dot */}
      <circle
        cx={nodeRadius - 4}
        cy={-nodeRadius + 4}
        r={6}
        fill={colors.border}
        stroke="white"
        strokeWidth={2}
      />
    </g>
  );
}

// ============================================================================
// Edge Component - Smooth curved connections
// ============================================================================

function GraphEdge({
  sourcePos,
  targetPos,
  isActive,
  index,
}: {
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  isActive: boolean;
  index: number;
}) {
  const nodeRadius = 28;
  
  // Calculate edge points at circle boundaries
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  const startX = sourcePos.x + nx * (nodeRadius + 4);
  const startY = sourcePos.y + ny * (nodeRadius + 4);
  const endX = targetPos.x - nx * (nodeRadius + 10);
  const endY = targetPos.y - ny * (nodeRadius + 10);

  // Smooth bezier curve
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // Curve control point - slight curve for visual interest
  const curveFactor = Math.abs(dy) > Math.abs(dx) ? 20 : 0;
  const controlX = midX + (dy > 0 ? curveFactor : -curveFactor);
  const controlY = midY;

  const pathD = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

  return (
    <g>
      {/* Shadow/glow for active edges */}
      {isActive && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={COLORS.edgeActive}
          strokeWidth={6}
          opacity={0.2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
        />
      )}
      
      {/* Main path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={isActive ? COLORS.edgeActive : "#D6CFC2"}
        strokeWidth={isActive ? 2.5 : 2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
      />
      
      {/* Arrow head */}
      <motion.polygon
        points={`${endX},${endY} ${endX - nx * 10 - ny * 5},${endY - ny * 10 + nx * 5} ${endX - nx * 10 + ny * 5},${endY - ny * 10 - nx * 5}`}
        fill={isActive ? COLORS.edgeActive : "#D6CFC2"}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
      />
    </g>
  );
}

// ============================================================================
// Detail Panel Component
// ============================================================================

function DetailPanel({
  topic,
  onClose,
}: {
  topic: MainTopicInfo;
  onClose: () => void;
}) {
  const colors = getDifficultyColor(topic.difficulty);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute right-4 top-4 bottom-4 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-[#E7E2D7] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div
        className="p-4 border-b border-[#E7E2D7]"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                style={{ backgroundColor: colors.border }}
              >
                <BookOpen className="w-3 h-3" />
              </div>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.border + "20", color: colors.text }}
              >
                {topic.difficulty < 0.4
                  ? "Beginner"
                  : topic.difficulty < 0.7
                  ? "Intermediate"
                  : "Advanced"}
              </span>
            </div>
            <h3 className="font-bold text-[#2a2a2a] text-lg leading-tight">
              {topic.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4 text-[#888]" />
          </button>
        </div>

        {/* Stats row - refined icon sizing for better baseline alignment */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5" style={{ color: colors.text }}>
            <BookOpen className="w-3 h-3" />
            <span className="text-[11px] font-medium">{topic.subtopic_count} lessons</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: colors.text }}>
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-medium">~{topic.estimated_minutes} min</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {topic.description && (
        <div className="px-4 py-3 border-b border-[#E7E2D7]">
          <p className="text-[13px] text-[#666] leading-relaxed">{topic.description}</p>
        </div>
      )}

      {/* Subtopics - with minimal scrollbar styling */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.12) transparent',
        }}
      >
        <h4 className="text-[10px] font-semibold text-[#999] uppercase tracking-wider mb-2.5">
          Lessons in this module
        </h4>
        {topic.subtopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Loader2 className="w-6 h-6 text-[#6B7F6B] animate-spin mb-2" />
            <p className="text-sm text-[#666]">Lessons loading...</p>
            <p className="text-xs text-[#999] mt-1">
              Expand this milestone in the list view to generate lessons.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {topic.subtopics.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-[#FAFAF8] hover:bg-[#F0EDE8] transition-colors group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-white border border-[#E0DDD5] flex items-center justify-center text-[10px] font-semibold text-[#999] group-hover:border-[#6B7F6B] group-hover:text-[#6B7F6B] transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Dark charcoal title for clear scanning */}
                  <div className="text-[13px] font-semibold text-[#2a2a2a] truncate leading-tight">
                    {sub.title}
                  </div>
                  {/* Soft silver duration for hierarchy */}
                  <div className="text-[11px] text-[#aaa] mt-0.5">{sub.estimated_minutes} min</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#ddd] group-hover:text-[#6B7F6B] transition-colors flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - ghost outline button to not compete with main CTA */}
      <div className="p-3 border-t border-[#E7E2D7] bg-[#FAFAF8]">
        <button
          className="w-full py-2 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 border border-[#D6CFC2] bg-white text-[#555] hover:border-[#6B7F6B] hover:text-[#6B7F6B] hover:bg-[#F7F5F0]"
        >
          <Target className="w-3.5 h-3.5 text-[#6B7F6B]" />
          Start with this topic
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function LearningPathGraph({
  graph,
  className,
}: {
  graph: GraphData;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Measure container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Create nodes and edges from graph data
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = graph.main_topics.map((topic, i) => ({
      id: topic.id,
      x: 0,
      y: 0,
      radius: 28,
      topic,
      index: i,
    }));

    // Create sequential edges ONLY for the learning path (no cross-connections)
    const edgeList: Edge[] = [];
    for (let i = 0; i < nodeList.length - 1; i++) {
      edgeList.push({
        source: nodeList[i].id,
        target: nodeList[i + 1].id,
      });
    }

    // Add prerequisite edges only (not cross-connections)
    nodeList.forEach((node, i) => {
      if (node.topic.prerequisites && node.topic.prerequisites.length > 0) {
        node.topic.prerequisites.forEach((prereqId) => {
          // Only add if the prerequisite exists in our node list
          const prereqExists = nodeList.some((n) => n.id === prereqId);
          if (prereqExists) {
            edgeList.push({
              source: prereqId,
              target: node.id,
            });
          }
        });
      }
    });

    return { nodes: nodeList, edges: edgeList };
  }, [graph]);

  // Use timeline layout instead of force simulation
  const positions = useTimelineLayout(
    nodes,
    dimensions.width,
    dimensions.height
  );

  // Get connected nodes for highlighting
  const connectedNodes = useMemo(() => {
    const active = selectedNode || hoveredNode;
    if (!active) return new Set<string>();

    const connected = new Set<string>();
    edges.forEach((edge) => {
      if (edge.source === active) connected.add(edge.target);
      if (edge.target === active) connected.add(edge.source);
    });
    return connected;
  }, [selectedNode, hoveredNode, edges]);

  const selectedTopic = selectedNode
    ? graph.main_topics.find((t) => t.id === selectedNode)
    : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[500px] bg-gradient-to-br from-[#FAF8F5] via-white to-[#F0EDE8] rounded-2xl overflow-hidden border border-[#E7E2D7]",
        className
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg width="100%" height="100%">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1" fill="#D6CFC2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-[#E7E2D7] shadow-sm z-10">
        <div className="text-xs font-semibold text-[#2a2a2a] mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#6B7F6B]" />
          Difficulty Level
        </div>
        <div className="space-y-1.5">
          {[
            { label: "Beginner", color: COLORS.node.beginner },
            { label: "Intermediate", color: COLORS.node.intermediate },
            { label: "Advanced", color: COLORS.node.advanced },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border-2"
                style={{
                  backgroundColor: item.color.bg,
                  borderColor: item.color.border,
                }}
              />
              <span className="text-xs text-[#666]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-10">
        <button
          onClick={() => setScale((s) => Math.min(s + 0.2, 2))}
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-[#E7E2D7] hover:bg-[#F7F5F0] transition-colors shadow-sm"
        >
          <ZoomIn className="w-4 h-4 text-[#666]" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))}
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-[#E7E2D7] hover:bg-[#F7F5F0] transition-colors shadow-sm"
        >
          <ZoomOut className="w-4 h-4 text-[#666]" />
        </button>
        <button
          onClick={() => setScale(1)}
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-[#E7E2D7] hover:bg-[#F7F5F0] transition-colors shadow-sm"
        >
          <Maximize2 className="w-4 h-4 text-[#666]" />
        </button>
      </div>

      {/* Graph SVG */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Edges */}
        <g>
          {edges.map((edge, index) => {
            const sourcePos = positions.get(edge.source);
            const targetPos = positions.get(edge.target);

            if (!sourcePos || !targetPos) return null;

            const active = selectedNode || hoveredNode;
            const isActive = active === edge.source || active === edge.target;

            return (
              <GraphEdge
                key={`${edge.source}-${edge.target}`}
                sourcePos={sourcePos}
                targetPos={targetPos}
                isActive={isActive}
                index={index}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;

            const isNodeSelected = selectedNode === node.id;
            const isConnected = connectedNodes.has(node.id);

            return (
              <GraphNode
                key={node.id}
                node={node}
                position={pos}
                isSelected={isNodeSelected}
                isConnected={isConnected}
                onSelect={setSelectedNode}
                onHover={setHoveredNode}
              />
            );
          })}
        </g>
      </svg>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedTopic && (
          <DetailPanel
            topic={selectedTopic}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </AnimatePresence>


    </div>
  );
}
