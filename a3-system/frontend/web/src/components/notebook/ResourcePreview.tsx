"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import InteractiveMindMap from "@/components/mindmap/InteractiveMindMap";
import CodeExercise from "@/components/code/CodeExercise";
import LecturePlayer from "@/components/video/LecturePlayer";
import { FaithfulnessBadge } from "@/components/FaithfulnessBadge";
import QuizRenderer from "./QuizRenderer";
import { useAppStore } from "@/lib/store";
import { useNotesTracking } from "@/hooks/useTracking";
import { renderMarkdown } from "@/lib/markdown";
import MermaidRenderer from "@/components/MermaidRenderer";
import TextSelectionPopup from "./TextSelectionPopup";
import { 
  FileText, 
  Target, 
  Code2, 
  GitBranch, 
  Clapperboard, 
  Clock, 
  Minus,
  Plus,
  Moon,
  Sun
} from "lucide-react";

interface GeneratedResource {
  id: string;
  type: "notes" | "quiz" | "code" | "mindmap" | "video";
  topic: string;
  data: any;
  timestamp: number;
  isRemedial?: boolean;
  weakConcepts?: string[];
  consumed?: boolean;
}

interface ResourcePreviewProps {
  resource: GeneratedResource;
  currentTopic: string;
  learningPath: { id: string; title: string; status: string }[];
  isGenerating: boolean;
  onMindMapNodeClick?: (nodeLabel: string) => void;
  onSendToChat?: (selectedText: string, question?: string) => void;
  // Quiz state
  quizState: {
    answers: Record<string, number>;
    confidence: Record<string, number>;
    revealedHints: Record<string, number>;
    eli5Enabled: Record<string, boolean>;
    selectAnswer: (key: string, idx: number) => void;
    setConfidenceLevel: (key: string, level: number) => void;
    revealHint: (key: string, count: number) => void;
    toggleEli5: (key: string) => void;
    resetQuiz: (resourceId: string, count: number) => void;
    calculateScore: (resourceId: string, questions: any[]) => number;
  };
}

export default function ResourcePreview({
  resource,
  currentTopic,
  learningPath,
  isGenerating,
  onMindMapNodeClick,
  onSendToChat,
  quizState,
}: ResourcePreviewProps) {
  const resType = resource.type;
  const res = resource.data;
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Reading progress state
  const [readingProgress, setReadingProgress] = useState(0);
  const [fontSize, setFontSize] = useState(1); // 0.9, 1, 1.1, 1.2
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Extract sections for TOC (only ## and ### headings, skip # which is the title)
  const sections = useMemo(() => {
    const rawContent = res?.content || res?.code || res?.text || "";
    // Match ## or ### headings (not single #)
    const sectionRegex = /^#{2,3}\s+(\d+\.?\d*\.?)?\s*(.+)$/gm;
    const matches: { id: string; title: string; number?: string }[] = [];
    let match;
    while ((match = sectionRegex.exec(rawContent)) !== null) {
      matches.push({
        id: `section-${matches.length}`,
        number: match[1]?.trim(),
        title: match[2].trim()
      });
    }
    return matches;
  }, [res]);

  // Calculate reading time
  const readingTime = useMemo(() => {
    const rawContent = res?.content || res?.code || res?.text || "";
    const wordCount = rawContent.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [res]);

  // Engagement tracking for notes so the milestone gate is reachable by
  // actually reading (not just video/code). Fires notes_opened / notes_scroll
  // and notes_closed (on unmount) which the backend gate aggregates.
  const { studentId } = useAppStore();
  const wordCount = useMemo(() => {
    const rawContent = res?.content || res?.code || res?.text || "";
    return rawContent.split(/\s+/).filter(Boolean).length;
  }, [res]);
  const milestoneId = useMemo(
    () => (currentTopic || "").replace(/\s+/g, "_").toLowerCase(),
    [currentTopic]
  );

  useNotesTracking({
    studentId: studentId || "anonymous",
    milestoneId,
    resourceId: resource.id,
    totalSections: Math.max(1, sections.length),
    wordCount,
    containerRef: scrollContainerRef,
    enabled: resType === "notes" && !!studentId,
  });

  // Track reading progress with throttling for performance
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || resType !== "notes") return;
    
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const progress = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100));
          setReadingProgress(isNaN(progress) ? 0 : progress);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [resType]);

  // Collect completed topic titles for Refresher tooltips
  const completedTopics = learningPath
    .filter((n) => n.status === "completed")
    .map((n) => n.title);

  // Build markdown from code exercises if needed
  const codeMarkdownFromExercises = buildCodeMarkdown(res);
  const rawContent: string | null =
    res?.content || res?.code || res?.text || codeMarkdownFromExercises || null;

  const fontSizeClass = fontSize === 0.9 ? "text-base" : fontSize === 1 ? "text-lg" : fontSize === 1.1 ? "text-xl" : "text-2xl";

  return (
    <div className={`flex-1 flex min-h-0 relative ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Main scrollable content area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto min-h-0 scrollbar-hide" 
        style={{ scrollbarWidth: "none" }}
      >
        {/* Reading Progress Bar - only for notes */}
        {resType === "notes" && (
          <div className={`sticky top-0 left-0 right-0 z-20 h-0.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className={`h-full transition-all duration-150 ${isDarkMode ? 'bg-gray-300' : 'bg-gray-900'}`}
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        )}
        
        <div 
          ref={contentRef}
          className={`relative flex flex-col h-full resource-preview-content ${isDarkMode ? 'bg-gray-900' : 'bg-white'} ${resType === "mindmap" ? "p-0" : "p-5"}`}
        >
        {/* Text Selection Popup */}
        {onSendToChat && (
          <TextSelectionPopup
            containerRef={contentRef}
            onSendToChat={onSendToChat}
          />
        )}

        {/* Reading controls toolbar - only for notes (no duplicate title) */}
        {resType === "notes" && (
          <div className={`flex items-center justify-between gap-2 mb-4 pb-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              {/* Reading time */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{readingTime} min read</span>
              </div>
              
              {/* Faithfulness Badge */}
              <FaithfulnessBadge faithfulness={resource.data?.faithfulness} size="sm" />
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Font size controls */}
              <div className={`flex items-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setFontSize(Math.max(0.9, fontSize - 0.1))}
                  className={`p-1.5 rounded-l-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  title="Decrease font size"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className={`text-sm font-medium px-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>A</span>
                <button
                  onClick={() => setFontSize(Math.min(1.2, fontSize + 0.1))}
                  className={`p-1.5 rounded-r-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  title="Increase font size"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              
              {/* Dark mode toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title={isDarkMode ? "Light mode" : "Dark mode"}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
        
        {/* Faithfulness badge for quiz (header is already shown in parent modal) */}
        {resType === "quiz" && resource.data?.faithfulness && (
          <div className="flex justify-end mb-3">
            <FaithfulnessBadge faithfulness={resource.data.faithfulness} size="sm" />
          </div>
        )}

        {/* Notes */}
        {resType === "notes" &&
          (rawContent ? (
            <div className="pb-8" style={{ fontSize: `${fontSize}em` }}>
              <MarkdownWithMermaid 
                content={rawContent} 
                completedTopics={completedTopics} 
                isDarkMode={isDarkMode}
                fontSizeClass={fontSizeClass}
              />
            </div>
          ) : (
            <EmptyState message="Notes generation returned empty content." />
          ))}

        {/* Quiz */}
        {resType === "quiz" &&
          (res?.questions ? (
            <QuizRenderer
              resourceId={resource.id}
              questions={res.questions}
              metadata={res.metadata}
              quizState={quizState}
            />
          ) : rawContent ? (
            <MarkdownWithMermaid content={rawContent} completedTopics={completedTopics} />
          ) : (
            <EmptyState message="Quiz content is loading or unavailable…" />
          ))}

        {/* Code */}
        {resType === "code" &&
          (res?.problem ? (
            <CodeExercise data={res} topic={resource.topic} />
          ) : rawContent ? (
            <MarkdownWithMermaid content={rawContent} completedTopics={completedTopics} />
          ) : (
            <EmptyState message="Code content is loading or unavailable…" />
          ))}

        {/* Mind Map */}
        {resType === "mindmap" &&
          (res?.nodes && res?.edges ? (
            <div className="flex-1 min-h-0">
              <InteractiveMindMap
                nodes={res.nodes}
                edges={res.edges}
                topic={currentTopic}
                isGenerating={isGenerating}
                onNodeClick={onMindMapNodeClick}
              />
            </div>
          ) : res?.nodes ? (
            <div className="flex-1 min-h-0">
              <InteractiveMindMap
                nodes={res.nodes}
                edges={res.nodes
                  .filter((n: any) => n.level > 0)
                  .map((n: any) => ({
                    from: res.nodes.find((p: any) => p.level === n.level - 1)?.id || "root",
                    to: n.id,
                    label: "relates to",
                  }))}
                topic={currentTopic}
                isGenerating={isGenerating}
              />
            </div>
          ) : rawContent ? (
            <MarkdownWithMermaid content={rawContent} completedTopics={completedTopics} />
          ) : (
            <EmptyState message="Mind map content is loading or unavailable…" />
          ))}

        {/* Lecture Slides */}
        {resType === "video" &&
          (res?.slides && res.slides.length > 0 ? (
            <div className="flex-1 min-h-0 pb-4">
              <LecturePlayer data={res} topic={resource.topic} />
            </div>
          ) : rawContent ? (
            <MarkdownWithMermaid content={rawContent} completedTopics={completedTopics} />
          ) : (
            <EmptyState message="Lecture slides are loading or unavailable…" />
          ))}
        </div>
      </div>
      
      {/* Floating Table of Contents - outside scroll container, stays in middle */}
      {resType === "notes" && sections.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 group/toc">
          {/* Collapsed state - small indicator lines */}
          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-gray-900/90 backdrop-blur-sm border border-gray-700 group-hover/toc:opacity-0 group-hover/toc:pointer-events-none transition-opacity duration-200">
            {sections.slice(0, 8).map((_, idx) => (
              <div 
                key={idx} 
                className="h-0.5 bg-gray-500 rounded-full"
                style={{ width: `${12 + (idx % 3) * 4}px` }}
              />
            ))}
            {sections.length > 8 && (
              <div className="w-2 h-0.5 bg-gray-600 rounded-full" />
            )}
          </div>
          
          {/* Expanded state - full TOC */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover/toc:opacity-100 group-hover/toc:pointer-events-auto transition-all duration-200 transform translate-x-2 group-hover/toc:translate-x-0">
            <div className="p-3 rounded-xl bg-gray-900/95 backdrop-blur-sm border border-gray-700 shadow-xl min-w-[220px] max-w-[280px]">
              <nav className="space-y-0.5 max-h-[50vh] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {sections.map((section, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const container = scrollContainerRef.current;
                      const content = contentRef.current;
                      if (!content || !container) return;
                      
                      // Search headings and key elements
                      const searchElements = content.querySelectorAll('h2, h3, h4, strong, b');
                      const normalizedTitle = section.title.toLowerCase().trim();
                      
                      let targetElement: HTMLElement | null = null;
                      
                      for (const el of Array.from(searchElements)) {
                        const elText = el.textContent?.toLowerCase().trim() || '';
                        if (elText.includes(normalizedTitle) || normalizedTitle.includes(elText.replace(/^\d+\.?\s*/, ''))) {
                          targetElement = el as HTMLElement;
                          break;
                        }
                      }
                      
                      if (targetElement) {
                        const containerRect = container.getBoundingClientRect();
                        const elementRect = targetElement.getBoundingClientRect();
                        container.scrollTo({
                          top: elementRect.top - containerRect.top + container.scrollTop - 20,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="flex items-start gap-2 w-full text-left px-3 py-2.5 rounded-lg text-base transition-colors hover:bg-gray-800 text-gray-300 hover:text-white"
                  >
                    <span className="text-gray-400 leading-tight shrink-0 text-base">{section.number || `${idx + 1}.`}</span>
                    <span className="leading-tight line-clamp-2 text-base">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-base text-[#888] space-y-3">
      <p>{message}</p>
      <p className="text-sm text-[#aaa]">
        This usually means the LLM was rate-limited or the topic has no source material. Try
        regenerating from the resources panel.
      </p>
    </div>
  );
}

// Component to render markdown content with Mermaid diagram support
function MarkdownWithMermaid({ 
  content, 
  completedTopics,
  isDarkMode = false,
  fontSizeClass = "text-lg"
}: { 
  content: string; 
  completedTopics: string[];
  isDarkMode?: boolean;
  fontSizeClass?: string;
}) {
  // Parse content to extract mermaid blocks and regular markdown
  const parts = useMemo(() => {
    const result: Array<{ type: 'markdown' | 'mermaid'; content: string }> = [];
    
    // Split by mermaid code blocks
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/gi;
    let lastIndex = 0;
    let match;
    
    while ((match = mermaidRegex.exec(content)) !== null) {
      // Add markdown before this mermaid block
      if (match.index > lastIndex) {
        const markdownContent = content.slice(lastIndex, match.index);
        if (markdownContent.trim()) {
          result.push({ type: 'markdown', content: markdownContent });
        }
      }
      
      // Add the mermaid block
      result.push({ type: 'mermaid', content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining markdown after last mermaid block
    if (lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex);
      if (remainingContent.trim()) {
        result.push({ type: 'markdown', content: remainingContent });
      }
    }
    
    // If no mermaid blocks found, return entire content as markdown
    if (result.length === 0) {
      result.push({ type: 'markdown', content });
    }
    
    return result;
  }, [content]);

  return (
    <div className={`w-full ${isDarkMode ? 'dark-mode-notes' : ''}`}>
      {parts.map((part, index) => {
        if (part.type === 'mermaid') {
          return <MermaidRenderer key={index} chart={part.content} />;
        }
        return (
          <EnhancedMarkdownContent
            key={index}
            html={renderMarkdown(part.content, completedTopics)}
            isDarkMode={isDarkMode}
            fontSizeClass={fontSizeClass}
          />
        );
      })}
    </div>
  );
}

// Enhanced markdown content with copy buttons for code blocks
const EnhancedMarkdownContent = React.memo(function EnhancedMarkdownContent({ 
  html, 
  isDarkMode,
  fontSizeClass 
}: { 
  html: string; 
  isDarkMode: boolean;
  fontSizeClass: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Add copy buttons to code blocks after render
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const codeBlocks = containerRef.current?.querySelectorAll('pre');
      if (!codeBlocks) return;
      
      codeBlocks.forEach((pre) => {
        // Skip if already has copy button
        if (pre.querySelector('.copy-btn') || pre.parentElement?.querySelector('.copy-btn')) return;
        
        // Create wrapper if not already wrapped
        let wrapper = pre.parentElement;
        if (!wrapper?.classList.contains('group/code')) {
          wrapper = document.createElement('div');
          wrapper.className = 'relative group/code';
          pre.parentNode?.insertBefore(wrapper, pre);
          wrapper.appendChild(pre);
        }
        
        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn absolute top-2 right-2 p-1.5 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white opacity-0 group-hover/code:opacity-100 transition-all z-10';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        copyBtn.title = 'Copy code';
        
        copyBtn.onclick = async (e) => {
          e.stopPropagation();
          const code = pre.querySelector('code')?.textContent || '';
          await navigator.clipboard.writeText(code);
          copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          copyBtn.classList.add('bg-emerald-600', 'text-white');
          setTimeout(() => {
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            copyBtn.classList.remove('bg-emerald-600', 'text-white');
          }, 2000);
        };
        
        wrapper.appendChild(copyBtn);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`study-notes max-w-none leading-[1.75] ${fontSizeClass} ${isDarkMode ? 'text-gray-300' : ''}`}
      style={{ lineHeight: '1.75' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

function buildCodeMarkdown(res: any): string | null {
  if (!res || !Array.isArray(res.exercises) || res.exercises.length === 0) return null;

  const parts: string[] = [];

  if (res.real_world_scenario) {
    parts.push(`## Why this matters\n\n${res.real_world_scenario}`);
  }

  if (Array.isArray(res.learning_objectives) && res.learning_objectives.length) {
    parts.push(
      `## Learning objectives\n\n${res.learning_objectives.map((o: string) => `- ${o}`).join("\n")}`
    );
  }

  res.exercises.forEach((ex: any, idx: number) => {
    const tier = (ex.tier || `tier ${idx + 1}`).toString().toUpperCase();
    const name = ex.name || `Exercise ${idx + 1}`;
    parts.push(`## ${idx + 1}. ${name}  _(${tier})_`);

    if (ex.problem) parts.push(`**Problem:** ${ex.problem}`);
    if (ex.pseudocode) parts.push(`**Pseudocode:**\n\n\`\`\`\n${ex.pseudocode}\n\`\`\``);
    if (ex.starter_code)
      parts.push(`**Starter code:**\n\n\`\`\`${res.language || ""}\n${ex.starter_code}\n\`\`\``);

    if (Array.isArray(ex.hints) && ex.hints.length) {
      parts.push(`**Hints:**\n\n${ex.hints.map((h: string, i: number) => `${i + 1}. ${h}`).join("\n")}`);
    }

    if (Array.isArray(ex.test_cases) && ex.test_cases.length) {
      const rows = ex.test_cases
        .map((tc: any) => `| \`${tc.input}\` | \`${tc.expected}\` | ${tc.description || ""} |`)
        .join("\n");
      parts.push(`**Test cases:**\n\n| Input | Expected | Description |\n|---|---|---|\n${rows}`);
    }

    if (ex.solution)
      parts.push(
        `<details><summary>Show solution</summary>\n\n\`\`\`${res.language || ""}\n${ex.solution}\n\`\`\`\n\n</details>`
      );
  });

  if (Array.isArray(res.common_bugs) && res.common_bugs.length) {
    parts.push(
      `## Common bugs\n\n${res.common_bugs
        .map((b: any) => (typeof b === "string" ? `- ${b}` : `- **${b.bug || ""}** — ${b.fix || ""}`))
        .join("\n")}`
    );
  }

  if (res.complexity_analysis) {
    const c = res.complexity_analysis;
    parts.push(
      `## Complexity\n\n- **Time:** ${c.time_complexity || "n/a"}\n- **Space:** ${c.space_complexity || "n/a"}${
        c.why_it_matters ? `\n\n${c.why_it_matters}` : ""
      }`
    );
  }

  if (Array.isArray(res.key_takeaways) && res.key_takeaways.length) {
    parts.push(`## Key takeaways\n\n${res.key_takeaways.map((t: string) => `- ${t}`).join("\n")}`);
  }

  return parts.join("\n\n");
}
