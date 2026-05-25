"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Brain, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// ─────────────────────────────────────────────
// TYPES (compatible with existing props)
// ─────────────────────────────────────────────
interface MindMapNode {
  id: string;
  label: string;
  level?: number;
  summary?: string;
  description?: string;
  importance?: "core" | "supplementary";
  difficulty?: "beginner" | "intermediate" | "advanced";
  mastery?: number;
  is_weak_point?: boolean;
}

interface MindMapEdge {
  from: string;
  to: string;
  label?: string;
  relationship_note?: string;
}

interface Props {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  topic: string;
  isGenerating?: boolean;
  onNodeClick?: (nodeLabel: string) => void;
}

// ─────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────
const CW = 1200;          // Increased width
const CH = 800;           // Increased height
const CX = CW / 2;
const CY = CH / 2;

const CENTER_W = 210;
const CENTER_H = 72;

const BRANCH_W = 180;          // Wider for text + icon
const BRANCH_H = 46;
const BRANCH_X_OFFSET = 250;
const BRANCH_Y_PADDING = 55;

const LEAF_W = 140;
const LEAF_H = 36;
const LEAF_X_OFFSET = 175;
const LEAF_Y_GAP = 52;

// Color palette for branches
const BRANCH_COLORS = [
  { bg: "#3b82f6", leafBg: "#eff6ff", leafBorder: "#3b82f6" },
  { bg: "#8b5cf6", leafBg: "#f5f3ff", leafBorder: "#8b5cf6" },
  { bg: "#f59e0b", leafBg: "#fffbeb", leafBorder: "#f59e0b" },
  { bg: "#ec4899", leafBg: "#fdf2f8", leafBorder: "#ec4899" },
  { bg: "#06b6d4", leafBg: "#ecfeff", leafBorder: "#06b6d4" },
  { bg: "#10b981", leafBg: "#ecfdf5", leafBorder: "#10b981" },
];

// ─────────────────────────────────────────────
// INTERNAL TYPES FOR LAYOUT
// ─────────────────────────────────────────────
interface PositionedLeaf {
  id: string;
  label: string;
  x: number;
  y: number;
  side: "left" | "right";
}

interface PositionedBranch {
  id: string;
  label: string;
  x: number;
  y: number;
  side: "left" | "right";
  color: string;
  leafBg: string;
  leafBorder: string;
  leaves: PositionedLeaf[];
}

// ─────────────────────────────────────────────
// TREE HELPERS
// ─────────────────────────────────────────────
function buildTree(edges: MindMapEdge[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!children.has(e.from)) children.set(e.from, []);
    children.get(e.from)!.push(e.to);
  });
  return children;
}

function findRoot(nodes: MindMapNode[], edges: MindMapEdge[]): string | null {
  const withLevel = nodes.find((n) => n.level === 0);
  if (withLevel) return withLevel.id;
  const hasParent = new Set(edges.map((e) => e.to));
  const root = nodes.find((n) => !hasParent.has(n.id));
  return root?.id || nodes[0]?.id || null;
}

// ─────────────────────────────────────────────
// LAYOUT ENGINE
// Converts nodes/edges to positioned branches
// ─────────────────────────────────────────────
function computeLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  collapsed: Set<string>
): { rootLabel: string; branches: PositionedBranch[] } {
  const childrenMap = buildTree(edges);
  const rootId = findRoot(nodes, edges);
  if (!rootId) return { rootLabel: "Topic", branches: [] };

  const rootNode = nodes.find((n) => n.id === rootId);
  const rootLabel = rootNode?.label || "Topic";

  // Get level-1 children (branches)
  const branchIds = childrenMap.get(rootId) || [];
  const branchNodes = branchIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean) as MindMapNode[];

  // Split: first half → right, remainder → left
  const total = branchNodes.length;
  const rightCount = Math.ceil(total / 2);
  const rightBranches = branchNodes.slice(0, rightCount);
  const leftBranches = branchNodes.slice(rightCount);

  const positioned: PositionedBranch[] = [];

  const placeBranches = (group: MindMapNode[], side: "left" | "right") => {
    const count = group.length;
    const branchX = side === "right" ? CX + BRANCH_X_OFFSET : CX - BRANCH_X_OFFSET;
    const leafX =
      side === "right"
        ? branchX + BRANCH_W / 2 + LEAF_X_OFFSET
        : branchX - BRANCH_W / 2 - LEAF_X_OFFSET;

    // Get leaves for each branch
    const branchLeaves = group.map((branch) => {
      const leafIds = childrenMap.get(branch.id) || [];
      return leafIds
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean) as MindMapNode[];
    });

    // Calculate vertical spans
    const totalLeafHeight = (n: number) => Math.max(0, n - 1) * LEAF_Y_GAP;
    const spans = branchLeaves.map((leaves) =>
      collapsed.has(group[branchLeaves.indexOf(leaves)]?.id || "")
        ? BRANCH_H
        : totalLeafHeight(leaves.length)
    );
    const totalGroupHeight =
      spans.reduce((a, s) => a + Math.max(s, BRANCH_H), 0) +
      (count - 1) * BRANCH_Y_PADDING;

    let cursorY = CY - totalGroupHeight / 2;

    group.forEach((branch, i) => {
      const colorIdx = (side === "right" ? i : rightCount + i) % BRANCH_COLORS.length;
      const colors = BRANCH_COLORS[colorIdx];
      const leafSpan = spans[i];
      const branchSpan = Math.max(leafSpan, BRANCH_H);
      const branchY = cursorY + branchSpan / 2;

      const isCollapsed = collapsed.has(branch.id);
      const leaves: PositionedLeaf[] = isCollapsed
        ? []
        : branchLeaves[i].map((leaf, li) => ({
            id: leaf.id,
            label: leaf.label,
            x: leafX,
            y: branchY - leafSpan / 2 + li * LEAF_Y_GAP,
            side,
          }));

      positioned.push({
        id: branch.id,
        label: branch.label,
        x: branchX,
        y: branchY,
        side,
        color: colors.bg,
        leafBg: colors.leafBg,
        leafBorder: colors.leafBorder,
        leaves,
      });

      cursorY += branchSpan + BRANCH_Y_PADDING;
    });
  };

  placeBranches(rightBranches, "right");
  placeBranches(leftBranches, "left");

  return { rootLabel, branches: positioned };
}

// ─────────────────────────────────────────────
// BEZIER CONNECTOR HELPERS
// ─────────────────────────────────────────────
function centerEdgePoint(branchY: number, side: "left" | "right"): { x: number; y: number } {
  const halfH = CENTER_H / 2;
  const clampedY = Math.max(CY - halfH + 8, Math.min(CY + halfH - 8, branchY));
  const edgeX = side === "right" ? CX + CENTER_W / 2 : CX - CENTER_W / 2;
  return { x: edgeX, y: clampedY };
}

function branchConnectorPath(b: PositionedBranch): string {
  const start = centerEdgePoint(b.y, b.side);
  const endX = b.side === "right" ? b.x - BRANCH_W / 2 : b.x + BRANCH_W / 2;
  const endY = b.y;
  const cp1x = start.x + (b.side === "right" ? 60 : -60);
  const cp2x = endX + (b.side === "right" ? -60 : 60);
  return `M ${start.x} ${start.y} C ${cp1x} ${start.y} ${cp2x} ${endY} ${endX} ${endY}`;
}

function leafConnectorPath(branch: PositionedBranch, leaf: PositionedLeaf): string {
  const startX = branch.side === "right" ? branch.x + BRANCH_W / 2 : branch.x - BRANCH_W / 2;
  const startY = branch.y;
  const endX = leaf.side === "right" ? leaf.x - LEAF_W / 2 : leaf.x + LEAF_W / 2;
  const endY = leaf.y;
  const cp1x = startX + (leaf.side === "right" ? 45 : -45);
  const cp2x = endX + (leaf.side === "right" ? -45 : 45);
  return `M ${startX} ${startY} C ${cp1x} ${startY} ${cp2x} ${endY} ${endX} ${endY}`;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export default function InteractiveMindMap({
  nodes,
  edges,
  topic,
  isGenerating = false,
  onNodeClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  
  // Zoom and pan state (pan is in SVG coordinates)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const { rootLabel, branches } = useMemo(
    () => computeLayout(nodes, edges, collapsed),
    [nodes, edges, collapsed]
  );

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.2, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom - use native event listener to avoid passive event issue
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.5, Math.min(3, z + delta)));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Pan handlers - convert screen movement to SVG coordinates
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && containerRef.current) {
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      // Convert screen pixels to SVG units with 1.5x sensitivity boost
      const scaleX = (CW / rect.width / zoom) * 1.5;
      const scaleY = (CH / rect.height / zoom) * 1.5;
      const dx = (e.clientX - lastMouse.current.x) * scaleX;
      const dy = (e.clientY - lastMouse.current.y) * scaleY;
      setPan(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
    >
      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all hover:scale-105"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all hover:scale-105"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all hover:scale-105"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
        <div className="mt-1 px-2 py-1 bg-white/80 rounded text-xs text-gray-500 text-center">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      <svg
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${CW / zoom} ${CH / zoom}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ 
          fontFamily: "var(--font-nunito), 'Nunito', 'Inter', system-ui, sans-serif",
        }}
      >
        {/* Glow filter - simplified for performance */}
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Connector lines (drawn first, under nodes) ── */}
        {branches.map((branch) => (
          <g key={`conn-${branch.id}`}>
            {/* Center → Branch */}
            <path
              d={branchConnectorPath(branch)}
              fill="none"
              stroke={branch.color}
              strokeWidth={2.5}
              strokeOpacity={0.7}
              strokeLinecap="round"
            />
            {/* Branch → Leaves */}
            {branch.leaves.map((leaf) => (
              <path
                key={`conn-leaf-${leaf.id}`}
                d={leafConnectorPath(branch, leaf)}
                fill="none"
                stroke={branch.leafBorder}
                strokeWidth={1.8}
                strokeOpacity={0.5}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}

        {/* ── Center Node ── */}
        <g>
          <rect
            x={CX - CENTER_W / 2}
            y={CY - CENTER_H / 2}
            width={CENTER_W}
            height={CENTER_H}
            rx={18}
            fill="url(#centerGradient)"
            filter="url(#glow)"
          />
          <defs>
            <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          {/* Brain icon */}
          <foreignObject x={CX - CENTER_W / 2 + 12} y={CY - 12} width={24} height={24}>
            <Brain className="w-5 h-5 text-white/80" />
          </foreignObject>
          {/* Label */}
          <text
            x={CX + 10}
            y={CY - 6}
            textAnchor="middle"
            fontSize={16}
            fontWeight={700}
            fill="white"
          >
            {rootLabel || topic}
          </text>
          <text
            x={CX + 10}
            y={CY + 14}
            textAnchor="middle"
            fontSize={10}
            letterSpacing={1.2}
            fill="white"
            opacity={0.8}
          >
            CENTRAL CONCEPT
          </text>
          {/* Generating pulse */}
          {isGenerating && (
            <rect
              x={CX - CENTER_W / 2 - 4}
              y={CY - CENTER_H / 2 - 4}
              width={CENTER_W + 8}
              height={CENTER_H + 8}
              rx={20}
              fill="none"
              stroke="#10b981"
              strokeWidth={2}
              opacity={0.5}
              className="animate-pulse"
            />
          )}
        </g>

        {/* ── Branch Nodes + Leaf Nodes ── */}
        {branches.map((branch) => {
          const isCollapsed = collapsed.has(branch.id);
          const isHov = hovered === branch.id;

          return (
            <g key={branch.id}>
              {/* Branch node */}
              <g
                style={{ cursor: "pointer" }}
                onClick={() => toggle(branch.id)}
                onMouseEnter={() => setHovered(branch.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect
                  x={branch.x - BRANCH_W / 2}
                  y={branch.y - BRANCH_H / 2}
                  width={BRANCH_W}
                  height={BRANCH_H}
                  rx={22}
                  fill={branch.color}
                  opacity={isHov ? 0.9 : 1}
                />
                {/* Branch label - offset to make room for chevron */}
                <text
                  x={branch.side === "right" ? branch.x - 10 : branch.x + 10}
                  y={branch.y + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={600}
                  fill="white"
                >
                  {branch.label}
                </text>
                {/* Chevron toggle indicator */}
                <circle
                  cx={branch.side === "right" ? branch.x + BRANCH_W / 2 - 18 : branch.x - BRANCH_W / 2 + 18}
                  cy={branch.y}
                  r={11}
                  fill="white"
                  opacity={0.3}
                />
                <text
                  x={branch.side === "right" ? branch.x + BRANCH_W / 2 - 18 : branch.x - BRANCH_W / 2 + 18}
                  y={branch.y + 5}
                  textAnchor="middle"
                  fontSize={12}
                  fill="white"
                  fontWeight={700}
                >
                  {isCollapsed
                    ? branch.side === "right" ? "›" : "‹"
                    : branch.side === "right" ? "‹" : "›"}
                </text>
              </g>

              {/* Leaf nodes */}
              {branch.leaves.map((leaf) => (
                <g
                  key={leaf.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => onNodeClick?.(leaf.label)}
                >
                  <rect
                    x={leaf.x - LEAF_W / 2}
                    y={leaf.y - LEAF_H / 2}
                    width={LEAF_W}
                    height={LEAF_H}
                    rx={17}
                    fill={branch.leafBg}
                    stroke={branch.leafBorder}
                    strokeWidth={1.5}
                  />
                  <text
                    x={leaf.x}
                    y={leaf.y + 5}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#374151"
                    fontWeight={500}
                  >
                    {leaf.label}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
