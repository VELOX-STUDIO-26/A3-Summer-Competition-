"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { X, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

// Initialize mermaid once at module level
let mermaidInitialized = false;

export default function MermaidRenderer({ chart, className = "" }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fullscreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid only once
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          primaryColor: "#E7E2D7",
          primaryTextColor: "#2a2a2a",
          primaryBorderColor: "#B8C3C9",
          lineColor: "#8a9ba3",
          secondaryColor: "#F7F5F0",
          tertiaryColor: "#D6CFC2",
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
        flowchart: {
          curve: "basis",
          padding: 15,
          nodeSpacing: 50,
          rankSpacing: 50,
          htmlLabels: true,
        },
        sequence: {
          actorMargin: 50,
          messageMargin: 30,
        },
        securityLevel: "loose",
        htmlLabels: true,
      });
      mermaidInitialized = true;
    }

    const renderChart = async () => {
      if (!chart) {
        setIsRendering(false);
        setError("No diagram content provided");
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        // Clean the chart string - remove any leading/trailing whitespace and normalize
        let cleanChart = chart.trim();
        
        // Skip if empty after trim
        if (!cleanChart) {
          setError("Diagram content is empty");
          setIsRendering(false);
          return;
        }
        
        
        // If chart doesn't start with a valid mermaid directive, show warning
        const validDirectives = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|mindmap|timeline|sankey|xychart)/i;
        if (!cleanChart.match(validDirectives)) {
          console.warn("[MermaidRenderer] Chart may be invalid. First 100 chars:", cleanChart.substring(0, 100));
          setError(`Invalid diagram format. Chart should start with: graph, flowchart, sequenceDiagram, etc.`);
          setIsRendering(false);
          return;
        }

        // Sanitize chart for common issues:
        // 1. Escape special characters inside square brackets (node labels)
        cleanChart = cleanChart.replace(/\[([^\]]*)\]/g, (match, content) => {
          const sanitized = content
            .replace(/\(/g, '❨')  // Unicode left parenthesis ornament
            .replace(/\)/g, '❩')  // Unicode right parenthesis ornament
            .replace(/"/g, "'")   // Replace double quotes with single
            .replace(/;/g, ',')   // Replace semicolons with commas
            .replace(/:/g, '꞉');  // Unicode modifier letter colon
          return `[${sanitized}]`;
        });
        
        // 2. Also escape special characters in edge labels |...|
        cleanChart = cleanChart.replace(/\|([^|]*)\|/g, (match, content) => {
          const sanitized = content
            .replace(/\(/g, '❨')
            .replace(/\)/g, '❩')
            .replace(/"/g, "'")
            .replace(/;/g, ',')
            .replace(/:/g, '꞉');
          return `|${sanitized}|`;
        });
        
        // 3. Escape special characters in curly brace subgraph labels {...}
        cleanChart = cleanChart.replace(/\{([^}]*)\}/g, (match, content) => {
          // Only sanitize if it looks like a label (not subgraph definition)
          if (content.includes('-->') || content.includes('---')) {
            return match; // It's a subgraph body, don't modify
          }
          const sanitized = content
            .replace(/\(/g, '❨')
            .replace(/\)/g, '❩')
            .replace(/"/g, "'")
            .replace(/;/g, ',');
          return `{${sanitized}}`;
        });
        
        // 4. Replace <br/> with proper mermaid line break
        cleanChart = cleanChart.replace(/<br\s*\/?>/gi, '<br/>');
        
        // 5. Ensure proper line endings
        cleanChart = cleanChart.replace(/\r\n/g, '\n');
        
        // 6. Remove any stray quotes that might break parsing
        // But preserve quoted strings in proper contexts
        cleanChart = cleanChart.replace(/(\w)\s*"\s*(\w)/g, '$1 $2');

        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Validate first with suppressErrors so invalid/partial input never
        // causes mermaid to inject its default "Syntax error" bomb SVG.
        const isValid = await mermaid.parse(cleanChart, { suppressErrors: true });
        if (!isValid) {
          setError("Syntax error in diagram. Check for special characters or malformed syntax.");
          setSvg("");
          setIsRendering(false);
          return;
        }

        // Render the chart
        const result = await mermaid.render(id, cleanChart);
        setSvg(result.svg);
        setError(null);
      } catch (err: any) {
        console.error("[MermaidRenderer] Render error:", err);
        console.error("[MermaidRenderer] Chart content was:", chart);
        
        // Try to provide a more helpful error message
        let errorMsg = err?.message || "Failed to render diagram";
        if (errorMsg.includes("Duplicate")) {
          errorMsg = "Diagram has duplicate node definitions. Each node ID should be unique.";
        } else if (errorMsg.includes("Parse error")) {
          errorMsg = "Syntax error in diagram. Check for special characters or malformed syntax.";
        }
        
        setError(errorMsg);
        setSvg("");

        // mermaid can leave an orphaned error ("bomb") node attached to the
        // body when render() throws; remove it so it doesn't pile up in the DOM.
        document
          .querySelectorAll('[id^="dmermaid-"], [id^="mermaid-"]')
          .forEach((node) => {
            if (!containerRef.current?.contains(node)) {
              node.remove();
            }
          });
      } finally {
        setIsRendering(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(renderChart, 100);
    return () => clearTimeout(timer);
  }, [chart]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handlers for dragging
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    hasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    // Check if user has actually dragged (moved more than 5px)
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx > 5 || dy > 5) {
      hasDragged.current = true;
    }
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Handle click on background to close (only if not dragging)
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking directly on the background (not the diagram)
    // and user hasn't dragged
    if (e.target === e.currentTarget && !hasDragged.current) {
      closeFullscreen();
    }
  }, [closeFullscreen]);

  // Close on Escape key and handle wheel zoom with non-passive listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        closeFullscreen();
      }
    };
    
    // Handle wheel zoom - must use native event listener with passive: false
    // Increased sensitivity: 0.15 per scroll tick (was 0.1)
    const handleWheelZoom = (e: WheelEvent) => {
      if (!isFullscreen) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.25), 4));
    };
    
    window.addEventListener("keydown", handleKeyDown);
    
    // Add wheel listener to the fullscreen container with passive: false
    const container = fullscreenRef.current;
    if (container && isFullscreen) {
      container.addEventListener("wheel", handleWheelZoom, { passive: false });
    }
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (container) {
        container.removeEventListener("wheel", handleWheelZoom);
      }
    };
  }, [isFullscreen, closeFullscreen]);

  // Show error state
  if (error && !isRendering) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm my-3">
        <p className="font-medium flex items-center gap-2">
          <span>⚠️</span> Diagram couldn't be rendered
        </p>
        <p className="text-xs mt-1 text-amber-600">{error}</p>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer text-amber-600 hover:text-amber-800">Show diagram code</summary>
          <pre className="mt-2 p-2 bg-amber-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  // Show loading state
  if (isRendering) {
    return (
      <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#D6CFC2] my-3">
        <div className="flex items-center gap-2 text-[#8a9ba3]">
          <div className="w-4 h-4 border-2 border-[#8a9ba3] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Rendering diagram...</span>
        </div>
      </div>
    );
  }
  
  // No SVG and not rendering - nothing to show
  if (!svg) {
    return null;
  }

  // Show rendered diagram with fullscreen capability
  return (
    <>
      {/* Inline diagram with click to expand */}
      <div
        ref={containerRef}
        onClick={openFullscreen}
        className={`mermaid-diagram my-4 p-4 bg-[#F7F5F0] rounded-xl border border-[#D6CFC2] overflow-x-auto cursor-pointer group relative ${className}`}
        title="Click to view fullscreen"
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        {/* Expand hint overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-sm text-[#4a5568]">
            <Maximize2 className="w-4 h-4" />
            <span>Click to expand</span>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col"
          onClick={(e) => e.target === e.currentTarget && closeFullscreen()}
        >
          {/* Header with controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-md border-b border-white/20">
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm font-medium">Diagram View</span>
              <span className="text-xs text-white/60">({Math.round(zoom * 100)}%)</span>
            </div>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                title="Reset view"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <button
                onClick={closeFullscreen}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Diagram container with pan/zoom */}
          <div 
            ref={fullscreenRef}
            className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleBackgroundClick}
          >
            <div 
              className="w-full h-full flex items-center justify-center p-8 pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <div 
                className="bg-white rounded-2xl p-8 shadow-2xl max-w-[90vw] pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 bg-white/5 text-center">
            <span className="text-xs text-white/50">
              Scroll to zoom • Drag to pan • Click outside or Esc to close
            </span>
          </div>
        </div>
      )}
    </>
  );
}
