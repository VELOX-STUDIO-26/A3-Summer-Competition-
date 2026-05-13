"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export default function MermaidRenderer({ chart, className = "" }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize mermaid with custom theme
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
      },
      sequence: {
        actorMargin: 50,
        messageMargin: 30,
      },
      securityLevel: "strict",
    });

    const renderChart = async () => {
      if (!chart || !containerRef.current) return;

      try {
        // Clean the chart string
        const cleanChart = chart.trim();

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the chart
        const { svg } = await mermaid.render(id, cleanChart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Failed to render diagram");
        setSvg("");
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
        <p className="font-medium">Diagram Error</p>
        <p className="text-xs mt-1">{error}</p>
        <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram my-4 p-4 bg-[#F7F5F0] rounded-xl border border-[#D6CFC2] overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
