/**
 * Markdown to HTML renderer for study notes and content
 * Includes XSS sanitization and special formatting for educational content
 */

export function renderMarkdown(raw: string, completedTopics: string[] = []): string {
  let html = raw;

  // 0. Basic XSS sanitization - remove dangerous tags and attributes
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  html = html.replace(/javascript\s*:/gi, "");
  html = html.replace(/<(iframe|object|embed|form|input|button)[^>]*>/gi, "");
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 1. Fenced code blocks — stash into placeholders
  const preBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const block = `<pre class="bg-[#2a2a2a] rounded-xl p-4 my-4 border border-[#444] overflow-x-auto scrollbar-hide" style="scrollbar-width:none;-ms-overflow-style:none;"><code style="color:#ffffff" class="text-[11px] leading-relaxed font-mono whitespace-pre">${escaped}</code></pre>`;
    const idx = preBlocks.push(block) - 1;
    return `\u0000PRE_BLOCK_${idx}\u0000`;
  });

  // 2. Horizontal rules → styled divider
  html = html.replace(/^---+$/gm, '<div class="my-5 border-t border-dashed border-[#D6CFC2]"></div>');

  // 3. Tables (| col1 | col2 |)
  html = html.replace(
    /^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm,
    (_match: string, headerRow: string, _sep: string, bodyRows: string) => {
      const headers = headerRow
        .split("|")
        .filter(Boolean)
        .map((h: string) => h.trim());
      const rows = bodyRows
        .trim()
        .split("\n")
        .map((r: string) =>
          r
            .split("|")
            .filter(Boolean)
            .map((c: string) => c.trim())
        );
      const thCells = headers
        .map(
          (h: string) =>
            `<th class="px-3 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-wider border-b border-[#D6CFC2]">${h}</th>`
        )
        .join("");
      const trRows = rows
        .map(
          (cols: string[]) =>
            '<tr class="border-b border-[#E7E2D7] hover:bg-[#F7F5F0]">' +
            cols.map((c: string) => `<td class="px-3 py-2 text-[11px] text-[#555]">${c}</td>`).join("") +
            "</tr>"
        )
        .join("");
      return `<div class="my-4 overflow-x-auto rounded-xl border border-[#D6CFC2]"><table class="w-full"><thead class="bg-[#E7E2D7]"><tr>${thCells}</tr></thead><tbody class="bg-white">${trRows}</tbody></table></div>`;
    }
  );

  // 4. Block-quotes / mental-model callouts
  html = html.replace(
    /^> (.+)$/gm,
    '<div class="my-3 pl-4 py-2.5 border-l-2 border-[#B8C3C9] bg-[#C9D2D6]/20 rounded-r-lg"><span class="text-[11px] italic text-[#4a5568]">💡 $1</span></div>'
  );

  // 5. Headers (process ### before ## before #)
  html = html.replace(
    /^### (.+)$/gm,
    '<h4 class="text-[11px] font-semibold text-[#888] mt-3 mb-1 uppercase tracking-widest">$1</h4>'
  );
  html = html.replace(
    /^## (\d+)\.\s*(.+)$/gm,
    '<h3 class="text-[13px] font-bold text-[#4a5568] mt-5 mb-2 flex items-center gap-2"><span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#B8C3C9]/30 text-[#4a5568] text-[11px] font-black">$1</span>$2</h3>'
  );
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-[13px] font-bold text-[#4a5568] mt-5 mb-2">$1</h3>');
  html = html.replace(
    /^# (.+)$/gm,
    '<h2 class="text-[15px] font-extrabold text-[#2a2a2a] mt-5 mb-3 pb-2 border-b border-[#D6CFC2]">$1</h2>'
  );

  // 6. Bold → dark emphasis
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#2a2a2a] font-semibold">$1</strong>');

  // 7. Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="text-[#666] italic">$1</em>');

  // 8. Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-[#E7E2D7] px-1.5 py-0.5 rounded text-[#4a5568] text-[10px] font-mono border border-[#D6CFC2]">$1</code>'
  );

  // 9. Unordered list items → clean dashes
  html = html.replace(
    /^[-*] (.+)$/gm,
    '<li class="flex items-start gap-2 py-0.5"><span class="text-[#8a9ba3] mt-px select-none">–</span><span class="text-[#444]">$1</span></li>'
  );

  // 10. Ordered list items
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    '<li class="flex items-start gap-2 py-0.5"><span class="text-[#8a9ba3] font-semibold min-w-[1rem]">$1.</span><span class="text-[#444]">$2</span></li>'
  );

  // 11. Wrap consecutive <li> runs in <ul>
  html = html.replace(/((?:<li[\s\S]*?<\/li>\s*)+)/g, '<ul class="my-2 space-y-0.5 pl-1">$1</ul>');

  // 12. Refresher tooltips – wrap completed-milestone terms
  completedTopics.forEach((term) => {
    if (!term) return;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![<\\w])\\b(${escaped})\\b(?![\\w>])`, "gi");
    html = html.replace(
      re,
      '<span class="relative group/tip cursor-help border-b border-dashed border-[#B8C3C9]">$1<span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#D6CFC2] shadow-lg shadow-black/10 text-[10px] text-[#4a5568] whitespace-nowrap z-50">🔗 Refresher: $1</span></span>'
    );
  });

  // 13. HTML details/summary tags (Self-Check answers)
  html = html.replace(/<details>([\s\S]*?)<\/details>/g, (_match: string, content: string) => {
    const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/);
    const summary = summaryMatch ? summaryMatch[1] : "Click to reveal answer";
    const detailsContent = content.replace(/<summary>[\s\S]*?<\/summary>/, "").trim();
    return `<details class="my-2 rounded-lg border border-[#D6CFC2] bg-[#F7F5F0]/50"><summary class="px-3 py-2 text-[11px] font-semibold text-[#4a5568] cursor-pointer hover:bg-[#E7E2D7]/50 transition-colors select-none">${summary}</summary><div class="px-3 py-2 text-[11px] text-[#555] border-t border-[#D6CFC2] bg-white/50">${detailsContent}</div></details>`;
  });

  // 14. Visual Summary callout boxes
  html = html.replace(
    /Visual Summary/gi,
    '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#B8C3C9]/20 text-[#4a5568] text-[10px] font-semibold">📐 Visual Summary</span>'
  );

  // 15. Focus Area callout boxes
  html = html.replace(
    /⚠️\s*Focus Area/g,
    '<div class="my-3 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/50"><span class="flex items-center gap-1 text-[11px] font-semibold text-amber-700">⚠️ Focus Area</span>'
  );

  // 16. Quick Reference Card header styling
  html = html.replace(
    /Quick Reference Card/gi,
    '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#8a9ba3]/20 text-[#4a5568] text-[10px] font-semibold">📋 Quick Reference</span>'
  );

  // 17. Remaining plain lines → paragraphs
  html = html
    .split("\n")
    .map((line: string) => {
      const t = line.trim();
      if (
        t === "" ||
        /^\u0000PRE_BLOCK_\d+\u0000$/.test(t) ||
        t.startsWith("<h") ||
        t.startsWith("<ul") ||
        t.startsWith("<li") ||
        t.startsWith("<div") ||
        t.startsWith("<table") ||
        t.startsWith("</") ||
        t.startsWith("<tr") ||
        t.startsWith("<td") ||
        t.startsWith("<th") ||
        t.startsWith("<thead") ||
        t.startsWith("<tbody") ||
        t.startsWith("<details")
      )
        return line;
      return `<p class="text-[#555] my-1.5 leading-relaxed text-[11px]">${line}</p>`;
    })
    .join("\n");

  // 18. Restore protected <pre> code blocks
  html = html.replace(/\u0000PRE_BLOCK_(\d+)\u0000/g, (_m, idx) => preBlocks[Number(idx)] || "");

  return html;
}
