"use client";

import { useMemo, useRef } from "react";
import InteractiveMindMap from "@/components/mindmap/InteractiveMindMap";
import CodeExercise from "@/components/code/CodeExercise";
import LecturePlayer from "@/components/video/LecturePlayer";
import { FaithfulnessBadge } from "@/components/FaithfulnessBadge";
import QuizRenderer from "./QuizRenderer";
import { renderMarkdown } from "@/lib/markdown";
import MermaidRenderer from "@/components/MermaidRenderer";
import TextSelectionPopup from "./TextSelectionPopup";
import { FileText, Target, Code2, GitBranch, Clapperboard } from "lucide-react";

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

  // Collect completed topic titles for Refresher tooltips
  const completedTopics = learningPath
    .filter((n) => n.status === "completed")
    .map((n) => n.title);

  // Build markdown from code exercises if needed
  const codeMarkdownFromExercises = buildCodeMarkdown(res);
  const rawContent: string | null =
    res?.content || res?.code || res?.text || codeMarkdownFromExercises || null;

  return (
    <div className="flex-1 overflow-auto min-h-0 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
      <div 
        ref={contentRef}
        className={`relative flex flex-col h-full bg-white ${resType === "mindmap" ? "p-0" : "p-5"}`}
      >
        {/* Text Selection Popup */}
        {onSendToChat && (
          <TextSelectionPopup
            containerRef={contentRef}
            onSendToChat={onSendToChat}
          />
        )}

        {/* Header bar */}
        <div className={`flex items-center gap-2.5 ${resType === "mindmap" ? "px-5 pt-5 pb-3" : "mb-4"}`}>
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            {resType === "notes" ? (
              <FileText className="w-3.5 h-3.5 text-gray-600" />
            ) : resType === "quiz" ? (
              <Target className="w-3.5 h-3.5 text-gray-600" />
            ) : resType === "code" ? (
              <Code2 className="w-3.5 h-3.5 text-gray-600" />
            ) : resType === "mindmap" ? (
              <GitBranch className="w-3.5 h-3.5 text-gray-600" />
            ) : (
              <Clapperboard className="w-3.5 h-3.5 text-gray-600" />
            )}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              {resType}
            </span>
            <h2 className="text-sm font-semibold text-gray-900 -mt-0.5 leading-tight">
              {resource.topic}
            </h2>
          </div>
          {/* Faithfulness Badge for notes and quiz */}
          {(resType === "notes" || resType === "quiz") && (
            <div className="ml-auto">
              <FaithfulnessBadge faithfulness={resource.data?.faithfulness} size="sm" />
            </div>
          )}
        </div>

        {/* Notes */}
        {resType === "notes" &&
          (rawContent ? (
            <div className="pb-8">
              <MarkdownWithMermaid content={rawContent} completedTopics={completedTopics} />
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
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-xs text-[#888] space-y-2">
      <p>{message}</p>
      <p className="text-[10px] text-[#aaa]">
        This usually means the LLM was rate-limited or the topic has no source material. Try
        regenerating from the resources panel.
      </p>
    </div>
  );
}

// Component to render markdown content with Mermaid diagram support
function MarkdownWithMermaid({ 
  content, 
  completedTopics 
}: { 
  content: string; 
  completedTopics: string[];
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
    <>
      {parts.map((part, index) => {
        if (part.type === 'mermaid') {
          return <MermaidRenderer key={index} chart={part.content} />;
        }
        return (
          <div
            key={index}
            className="study-notes max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content, completedTopics) }}
          />
        );
      })}
    </>
  );
}

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
