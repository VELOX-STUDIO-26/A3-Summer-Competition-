"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect, useId } from "react";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { useMindMapTracking } from "@/hooks/useTracking";
import { useAppStore } from "@/lib/store";

// Layout constants - shared across layout and focus calculations
const LAYOUT = {
  levelGap: 210,
  rootXOffset: 260,
  nodeHeight: 52,
  minGap: 28,
  cx: 500,
  cy: 400,
};

// ────────────────────────────── Types ──────────────────────────────
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

interface PositionedNode extends MindMapNode {
  x: number;
  y: number;
  depth: number;
}

// ────────────────────────── Tree helpers ──────────────────────────
function buildTree(edges: MindMapEdge[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!children.has(e.from)) children.set(e.from, []);
    children.get(e.from)!.push(e.to);
  });
  return children;
}

function computeDepths(edges: MindMapEdge[], rootId: string): Map<string, number> {
  const children = buildTree(edges);
  const depths = new Map<string, number>();
  const queue: { id: string; depth: number }[] = [{ id: rootId, depth: 0 }];
  const visited = new Set<string>();
  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    depths.set(id, depth);
    (children.get(id) || []).forEach((cid) => {
      if (!visited.has(cid)) queue.push({ id: cid, depth: depth + 1 });
    });
  }
  return depths;
}

function findRoot(nodes: MindMapNode[], edges: MindMapEdge[]): string | null {
  const withLevel = nodes.find((n) => n.level === 0);
  if (withLevel) return withLevel.id;
  const hasParent = new Set(edges.map((e) => e.to));
  const root = nodes.find((n) => !hasParent.has(n.id));
  return root?.id || nodes[0]?.id || null;
}

function getDescendants(nodeId: string, children: Map<string, string[]>): string[] {
  const result: string[] = [];
  const queue = [nodeId];
  while (queue.length) {
    const id = queue.shift()!;
    const kids = children.get(id) || [];
    kids.forEach((kid) => {
      result.push(kid);
      queue.push(kid);
    });
  }
  return result;
}

// ────────────────────────── Layout ──────────────────────────
/**
 * Two-pass tree layout:
 * 1. Bottom-up: calculate subtree height for each node
 * 2. Top-down: assign Y positions by centering children on parent
 */
function layoutTree(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  rootId: string,
  collapsed: Set<string>,
  centerX: number,
  centerY: number
): PositionedNode[] {
  const children = buildTree(edges);
  const depths = computeDepths(edges, rootId);
  const { levelGap, nodeHeight, minGap } = LAYOUT;

  // 1. Find visible nodes
  const visible = new Set<string>();
  const queue: string[] = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    visible.add(id);
    if (collapsed.has(id)) continue;
    (children.get(id) || []).forEach((kid) => {
      if (!visible.has(kid)) queue.push(kid);
    });
  }

  // Helper to get visible children of a node
  const getKids = (id: string) => (children.get(id) || []).filter((k) => visible.has(k));

  // 2. Bottom-up pass: calculate subtree height for each node
  // Subtree height = max(1, sum of children's subtree heights)
  const subHeight = new Map<string, number>();
  const byDepth = new Map<number, string[]>();

  visible.forEach((id) => {
    const d = depths.get(id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  });

  const maxDepth = byDepth.size > 0 ? Math.max(...Array.from(byDepth.keys())) : 0;

  for (let d = maxDepth; d >= 0; d--) {
    const ids = byDepth.get(d) || [];
    ids.forEach((id) => {
      const kids = getKids(id);
      if (kids.length === 0 || collapsed.has(id)) {
        subHeight.set(id, 1);
      } else {
        let sum = 0;
        kids.forEach((k) => {
          const h = subHeight.get(k);
          if (h !== undefined) sum += h;
        });
        subHeight.set(id, Math.max(1, sum));
      }
    });
  }

  // 3. Top-down pass: assign Y positions
  const yPos = new Map<string, number>();

  // Assign root at 0 (we'll center the whole tree later)
  yPos.set(rootId, 0);

  // BFS to process parents before children
  const bfs: string[] = [rootId];
  while (bfs.length) {
    const id = bfs.shift()!;
    const kids = getKids(id);

    if (kids.length === 0 || collapsed.has(id)) continue;

    const parentY = yPos.get(id) ?? 0;
    const parentHeight = subHeight.get(id) ?? 1;
    const totalSpace = (parentHeight - 1) * (nodeHeight + minGap);

    // Distribute children around parent's Y
    let currentOffset = -totalSpace / 2;

    kids.forEach((kid) => {
      const kidHeight = subHeight.get(kid) ?? 1;
      const kidSpace = (kidHeight - 1) * (nodeHeight + minGap);
      const kidY = parentY + currentOffset + kidSpace / 2;
      yPos.set(kid, kidY);
      bfs.push(kid);
      currentOffset += kidSpace + nodeHeight + minGap;
    });
  }

  // 4. Build positioned nodes (no centering - viewBox handles that)
  const positioned: PositionedNode[] = [];

  nodes.forEach((node) => {
    if (!visible.has(node.id)) return;
    const d = depths.get(node.id) ?? 0;
    const x = centerX - LAYOUT.rootXOffset + d * levelGap;
    const y = yPos.get(node.id);
    if (y === undefined) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[MindMap] Node "${node.id}" has no Y position - not reachable from root?`);
      }
      return;
    }

    positioned.push({ ...node, x, y, depth: d });
  });

  return positioned;
}

// ─────────────── S-curve path for edges ───────────────
function nodeHalfWidth(depth: number): number {
  if (depth === 0) return 110; // 220 / 2
  if (depth === 1) return 90;  // 180 / 2
  return 85;                   // 170 / 2
}

function sCurvePath(x1: number, y1: number, x2: number, y2: number, fromDepth: number, toDepth: number): string {
  const startX = x1 + nodeHalfWidth(fromDepth);
  const endX = x2 - nodeHalfWidth(toDepth);
  const dx = endX - startX;
  const cpOffset = Math.max(dx * 0.5, 20);
  return `M ${startX} ${y1} C ${startX + cpOffset} ${y1}, ${endX - cpOffset} ${y2}, ${endX} ${y2}`;
}

// ───────────────────── Hex grid pattern ─────────────────────
function HexGrid({ patternId }: { patternId: string }) {
  return (
    <defs>
      <pattern id={patternId} width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
        <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="rgba(138,155,163,0.06)" strokeWidth="0.5" />
        <path d="M28 0L56 16L56 50L28 66L0 50L0 16" fill="none" stroke="rgba(138,155,163,0.06)" strokeWidth="0.5" />
      </pattern>
    </defs>
  );
}

// ─────────────────────────── Component ───────────────────────────
export default function InteractiveMindMap({ nodes, edges, topic, isGenerating = false, onNodeClick }: Props) {
  const { studentId } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [animatingPan, setAnimatingPan] = useState(false);

  // Initialize mindmap tracking
  const { trackNodeClick, trackNodeExpand } = useMindMapTracking({
    studentId: studentId || "anonymous",
    milestoneId: topic.replace(/\s+/g, "_").toLowerCase(),
    resourceId: `mindmap_${topic.replace(/\s+/g, "_").toLowerCase()}`,
    totalNodes: nodes.length,
    totalBranches: edges.length,
    enabled: !!studentId && nodes.length > 0,
  });

  // Unique IDs for SVG patterns/filters to avoid collisions
  const uniqueId = useId().replace(/:/g, '');
  const hexGridId = `hexGrid-${uniqueId}`;
  const glowId = `glow-${uniqueId}`;

  // Cleanup refs for async operations
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

  const rootId = useMemo(() => findRoot(nodes, edges), [nodes, edges]);
  const children = useMemo(() => buildTree(edges), [edges]);
  const depths = useMemo(() => (rootId ? computeDepths(edges, rootId) : new Map<string, number>()), [edges, rootId]);

  // Collapse depth >= 2 only on initial load, not on every nodes change
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedInitialized, setCollapsedInitialized] = useState(false);
  useEffect(() => {
    if (!nodes.length || !rootId || collapsedInitialized) return;
    const toCollapse = new Set<string>();
    nodes.forEach((n) => {
      const d = depths.get(n.id) ?? (n.level ?? 0);
      if (d >= 2) toCollapse.add(n.id);
    });
    setCollapsed(toCollapse);
    setCollapsedInitialized(true);
  }, [nodes, rootId, depths, collapsedInitialized]);

  // Cleanup async operations on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const positioned = useMemo(() => {
    if (!rootId) return [];
    return layoutTree(nodes, edges, rootId, collapsed, LAYOUT.cx, LAYOUT.cy);
  }, [nodes, edges, rootId, collapsed]);

  const posMap = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    positioned.forEach((p) => m.set(p.id, p));
    return m;
  }, [positioned]);

  // Keep posMapRef in sync with posMap to avoid stale closures in RAF
  const posMapRef = useRef(posMap);
  useEffect(() => {
    posMapRef.current = posMap;
  }, [posMap]);

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(positioned.map((p) => p.id));
    return edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));
  }, [edges, positioned]);

  const hasChildren = useMemo(() => {
    const m = new Map<string, boolean>();
    nodes.forEach((n) => m.set(n.id, (children.get(n.id) || []).length > 0));
    return m;
  }, [nodes, children]);

  // Animate pan/zoom to focus on a bounding box
  const focusOnRect = useCallback((minX: number, minY: number, maxX: number, maxY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewW = rect.width;
    const viewH = rect.height;

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const padding = 60;

    const targetZoom = Math.min(
      (viewW - padding * 2) / contentW,
      (viewH - padding * 2) / contentH,
      1.5
    );
    const clampedZoom = Math.max(0.5, Math.min(targetZoom, 4.0));

    const contentCX = (minX + maxX) / 2;
    const contentCY = (minY + maxY) / 2;

    const { tx: baseTx, ty: baseTy, scale: baseScale } = baseTransformVals.current;

    // Account for baseTransform already applied inside the SVG <g>.
    // With transformOrigin: "center center", the screen position of a raw point is:
    // screen = (raw * baseScale + baseTx - viewW/2) * zoom + viewW/2 + pan
    // To center contentCX on screen, solve for pan:
    const targetPanX = (viewW / 2 - contentCX * baseScale - baseTx) * clampedZoom;
    const targetPanY = (viewH / 2 - contentCY * baseScale - baseTy) * clampedZoom;

    setAnimatingPan(true);
    setZoom(clampedZoom);
    setPan({ x: targetPanX, y: targetPanY });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAnimatingPan(false), 400);
  }, []);

  // Toggle collapse + auto-focus
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      const willExpand = next.has(nodeId);

      if (willExpand) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        const desc = getDescendants(nodeId, children);
        desc.forEach((d) => next.add(d));
      }

      // After state update, focus on the toggled node + its visible children
      rafRef.current = requestAnimationFrame(() => {
        const allKids = children.get(nodeId) || [];
        const visibleKids = willExpand ? allKids : [];

        // Compute bounding box of node + visible children using ref to get latest posMap
        const nodePos = posMapRef.current.get(nodeId);
        if (!nodePos) return;

        let minX = nodePos.x;
        let maxX = nodePos.x + 180;
        let minY = nodePos.y;
        let maxY = nodePos.y;

        if (willExpand && visibleKids.length > 0) {
          visibleKids.forEach((kidId) => {
            // Estimate position using LAYOUT constants
            const kidDepth = depths.get(kidId) ?? (nodePos.depth + 1);
            const kidX = LAYOUT.cx - LAYOUT.rootXOffset + kidDepth * LAYOUT.levelGap;
            minX = Math.min(minX, kidX);
            maxX = Math.max(maxX, kidX + 160);
          });
          // Estimate y spread
          const spread = (visibleKids.length - 1) * (LAYOUT.nodeHeight + LAYOUT.minGap);
          minY = nodePos.y - spread / 2 - 40;
          maxY = nodePos.y + spread / 2 + 40;
        } else {
          // Collapsing: just focus on this node
          minX = nodePos.x - 100;
          maxX = nodePos.x + 200;
          minY = nodePos.y - 80;
          maxY = nodePos.y + 80;
        }

        focusOnRect(minX, minY, maxX, maxY);
      });

      return next;
    });
  }, [children, depths, focusOnRect]);

  // Pan handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-node]")) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pan]
  );
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    });
  }, []);
  const onPointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => Math.min(Math.max(prev - e.deltaY * 0.001, 0.3), 5.0));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const viewBox = "0 0 1000 800";

  // Compute base transform once so the tree is always centered in the viewBox.
  // This prevents clipping at edges and gives focusOnRect a stable reference frame.
  const baseTransformVals = useRef({ tx: 0, ty: 0, scale: 1, ready: false });
  const baseTransform = useMemo(() => {
    if (positioned.length === 0) return "";
    if (baseTransformVals.current.ready) {
      const { tx, ty, scale } = baseTransformVals.current;
      return `translate(${tx}, ${ty}) scale(${scale})`;
    }

    const vbW = 1000;
    const vbH = 800;
    const padding = 80;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    positioned.forEach((p) => {
      minX = Math.min(minX, p.x - 100);
      minY = Math.min(minY, p.y - 40);
      maxX = Math.max(maxX, p.x + 100);
      maxY = Math.max(maxY, p.y + 40);
    });

    const treeW = maxX - minX;
    const treeH = maxY - minY;
    const scale = Math.min((vbW - padding * 2) / treeW, (vbH - padding * 2) / treeH, 1);
    const tx = (vbW - treeW * scale) / 2 - minX * scale;
    const ty = (vbH - treeH * scale) / 2 - minY * scale;

    baseTransformVals.current = { tx, ty, scale, ready: true };
    return `translate(${tx}, ${ty}) scale(${scale})`;
  }, [positioned]);

  const nodeStyle = (depth: number, hasKids: boolean, isCollapsed: boolean, node: MindMapNode) => {
    // Color coding by mastery/weak point status
    const mastery = node.mastery ?? 0;
    const isWeakPoint = node.is_weak_point ?? false;
    const importance = node.importance ?? "core";

    // Determine background color based on mastery and weak points
    let bgColor: string;
    let borderColor: string;

    if (isWeakPoint) {
      // Red/orange for weak points
      bgColor = "rgba(254, 243, 199, 0.95)"; // amber-50
      borderColor = "#f59e0b"; // amber-500
    } else if (mastery >= 0.8) {
      // Green for mastered
      bgColor = "rgba(220, 252, 231, 0.95)"; // green-50
      borderColor = "#22c55e"; // green-500
    } else if (mastery >= 0.4) {
      // Yellow for in progress
      bgColor = "rgba(254, 249, 195, 0.95)"; // yellow-50
      borderColor = "#eab308"; // yellow-500
    } else {
      // Default based on depth
      borderColor = importance === "core" ? "#8a9ba3" : "#D6CFC2";
      if (depth === 0) {
        bgColor = "rgba(184,195,201,0.45)";
      } else if (depth === 1) {
        bgColor = isCollapsed ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.85)";
      } else {
        bgColor = "rgba(255,255,255,0.95)";
      }
    }

    if (depth === 0)
      return {
        bg: bgColor,
        border: borderColor,
        glow: "0 0 18px rgba(138,155,163,0.3)",
        text: "#3a4548",
        padding: "px-5 py-3",
        minW: 150,
        maxW: 220,
        fontSize: "text-[12px]",
      };
    if (depth === 1)
      return {
        bg: bgColor,
        border: borderColor,
        glow: "0 2px 10px rgba(0,0,0,0.06)",
        text: "#4a5568",
        padding: "px-4 py-2.5",
        minW: 130,
        maxW: 180,
        fontSize: "text-[11px]",
      };
    return {
      bg: bgColor,
      border: borderColor,
      glow: "0 1px 6px rgba(0,0,0,0.04)",
      text: "#555",
      padding: "px-3.5 py-2",
      minW: 120,
      maxW: 170,
      fontSize: "text-[11px]",
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] overflow-hidden rounded-xl select-none"
      style={{ background: "radial-gradient(ellipse at center, #F7F5F0 0%, #E7E2D7 100%)" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* SVG layer - applies fitTransform to content via group */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: animatingPan ? "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
      >
        <HexGrid patternId={hexGridId} />
        <rect width="100%" height="100%" fill={`url(#${hexGridId})`} />

        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={baseTransform}>
          {/* Edges */}
          {visibleEdges.map((edge) => {
          const from = posMap.get(edge.from);
          const to = posMap.get(edge.to);
          if (!from || !to) return null;
          const isHovered = hovered === edge.from || hovered === edge.to;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path
                d={sCurvePath(from.x, from.y, to.x, to.y, from.depth, to.depth)}
                fill="none"
                stroke={isHovered ? "#8a9ba3" : "rgba(138,155,163,0.35)"}
                strokeWidth={isHovered ? 2.2 : 1.3}
                style={{ transition: "all 0.3s ease" }}
              />
            </g>
          );
        })}

          {/* Nodes rendered inside SVG via foreignObject for perfect alignment */}
          {positioned.map((node) => {
            const hasKids = hasChildren.get(node.id) || false;
            const isCollapsed = collapsed.has(node.id);
            const isHov = hovered === node.id;
            const isRoot = node.depth === 0;
            const isPulsing = isGenerating && isRoot;
            const style = nodeStyle(node.depth, hasKids, isCollapsed, node);
            const kidCount = (children.get(node.id) || []).length;

            return (
              <foreignObject
                key={node.id}
                x={node.x}
                y={node.y}
                width={style.maxW + 40}
                height={140}
                style={{
                  overflow: "visible",
                  pointerEvents: "none",
                }}
              >
                <div
                  data-node="true"
                  className="flex items-center justify-center"
                  style={{
                    width: style.maxW + 40,
                    height: 140,
                    marginLeft: -(style.maxW + 40) / 2,
                    marginTop: -70,
                    pointerEvents: "auto",
                  }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Pulse ring */}
                  {isPulsing && (
                    <>
                      <div
                        className="absolute inset-0 rounded-2xl animate-ping"
                        style={{ background: "rgba(138,155,163,0.12)", animationDuration: "2s" }}
                      />
                      <div
                        className="absolute -inset-1 rounded-2xl animate-pulse"
                        style={{ border: "1px solid rgba(138,155,163,0.2)", animationDuration: "1.5s" }}
                      />
                    </>
                  )}

                  {/* Node body */}
                  <div
                    className={`relative ${style.padding} rounded-xl backdrop-blur-md cursor-pointer transition-all duration-300`}
                    style={{
                      background: isHov ? "rgba(255,255,255,0.98)" : style.bg,
                      border: `1.5px solid ${isHov ? "#8a9ba3" : style.border}`,
                      boxShadow: isHov ? "0 4px 18px rgba(138,155,163,0.22)" : style.glow,
                      minWidth: style.minW,
                      maxWidth: style.maxW,
                      textAlign: "center",
                    }}
                    onClick={() => {
                      // Track node click
                      trackNodeClick(node.id, node.label, node.depth);
                      onNodeClick?.(node.label);
                    }}
                  >
                    {/* Label */}
                    <span className={`block ${style.fontSize} font-semibold leading-tight`} style={{ color: isHov ? "#3a4548" : style.text }}>
                      {node.label}
                    </span>

                    {/* Root badge */}
                    {isRoot && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Sparkles className="w-3 h-3 text-[#8a9ba3]" />
                        <span className="text-[8px] uppercase tracking-widest text-[#8a9ba3] font-medium">Central Concept</span>
                      </div>
                    )}

                    {/* Expand/collapse button */}
                    {hasKids && !isRoot && (
                      <button
                        className="absolute flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                        style={{
                          right: -10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 18,
                          height: 18,
                          background: isCollapsed ? "#8a9ba3" : "rgba(255,255,255,0.95)",
                          border: `1.5px solid ${isCollapsed ? "#8a9ba3" : "#D6CFC2"}`,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                          zIndex: 5,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const willExpand = collapsed.has(node.id);
                          if (willExpand) {
                            // Track node expand
                            trackNodeExpand(node.id, 0);
                          }
                          toggleCollapse(node.id);
                        }}
                        title={isCollapsed ? `Show ${kidCount} sub-topics` : "Hide sub-topics"}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-white" />
                        ) : (
                          <ChevronLeft className="w-3 h-3 text-[#666]" />
                        )}
                      </button>
                    )}

                    {/* Child count badge */}
                    {hasKids && isCollapsed && !isRoot && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap"
                        style={{ background: "rgba(138,155,163,0.12)", color: "#8a9ba3", top: "calc(100% + 2px)" }}
                      >
                        {kidCount} hidden
                      </div>
                    )}
                  </div>

                  {/* Hover tooltip */}
                  {isHov && !isRoot && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2.5 rounded-xl pointer-events-none"
                      style={{
                        background: "rgba(255,255,255,0.98)",
                        border: "1px solid #D6CFC2",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                        minWidth: 160,
                        maxWidth: 260,
                        zIndex: 50,
                      }}
                    >
                      {/* Header with label and badges */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-[10px] font-semibold text-[#4a5568]">{node.label}</p>
                        {node.importance === "core" && (
                          <span className="px-1 py-0.5 rounded text-[7px] font-medium bg-[#8a9ba3]/20 text-[#4a5568]">
                            Core
                          </span>
                        )}
                        {node.difficulty && (
                          <span className={`px-1 py-0.5 rounded text-[7px] font-medium ${
                            node.difficulty === "beginner" ? "bg-green-100 text-green-700" :
                            node.difficulty === "intermediate" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {node.difficulty.charAt(0).toUpperCase() + node.difficulty.slice(1)}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[9px] text-[#555] leading-relaxed mb-1.5">
                        {node.description || node.summary || `Part of ${topic}`}
                      </p>

                      {/* Weak point indicator */}
                      {node.is_weak_point && (
                        <div className="flex items-center gap-1 mb-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-200">
                          <span className="text-amber-500 text-[8px]">⚠️</span>
                          <span className="text-[8px] text-amber-700">Focus Area</span>
                        </div>
                      )}

                      {/* Mastery indicator */}
                      {node.mastery !== undefined && node.mastery > 0 && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[8px] text-[#888]">Mastery:</span>
                          <div className="flex-1 h-1.5 bg-[#E7E2D7] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                node.mastery >= 0.8 ? "bg-green-500" :
                                node.mastery >= 0.4 ? "bg-yellow-500" :
                                "bg-[#8a9ba3]"
                              }`}
                              style={{ width: `${Math.round(node.mastery * 100)}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-[#666] font-medium">{Math.round(node.mastery * 100)}%</span>
                        </div>
                      )}

                      {/* Expand/collapse hint */}
                      {hasKids && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] bg-[#E7E2D7] text-[#666]">
                          {isCollapsed ? `Click to show ${kidCount} sub-topics` : "Click to hide sub-topics"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </foreignObject>
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/90 border border-[#D6CFC2] text-[10px] text-[#666] z-30">
        <button className="hover:text-[#4a5568] transition-colors px-1" onClick={() => setZoom((z) => Math.min(z + 0.2, 5.0))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button className="hover:text-[#4a5568] transition-colors px-1" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}>−</button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 px-3 py-2.5 rounded-lg bg-white/90 border border-[#D6CFC2] text-[10px] z-30 max-w-[210px]">
        <div className="font-semibold text-[#4a5568] mb-0.5">Progressive Exploration</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8a9ba3]" />
          <span className="text-[#666]">Root topic</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border border-[#8a9ba3] bg-white" />
          <span className="text-[#666]">Branch (click to expand)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E7E2D7]" />
          <span className="text-[#666]">Sub-topic</span>
        </div>
        <div className="text-[8px] text-[#999] mt-1 pt-1 border-t border-[#E7E2D7]">
          <div className="font-semibold text-[#666] mb-1">Mastery Status:</div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Mastered (≥80%)</span>
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>In Progress (40-79%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Weak Point</span>
          </div>
        </div>
        <div className="text-[8px] text-[#999] mt-1 pt-1 border-t border-[#E7E2D7]">
          • Click nodes with ▶ to expand<br />• Scroll to zoom • Drag to pan
        </div>
      </div>
    </div>
  );
}
