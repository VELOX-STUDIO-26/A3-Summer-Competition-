/**
 * Markdown to HTML renderer for study notes and content
 * Includes XSS sanitization and special formatting for educational content
 */

export function renderMarkdown(raw: string, completedTopics: string[] = []): string {
  let html = raw;

  // 0a. Remove the first H1 heading (duplicate of topic title shown in header)
  html = html.replace(/^#\s+.+\n+/, '');
  
  // 0b. Remove standalone dash lines (horizontal rules artifacts) - only 2+ dashes with no text
  html = html.replace(/^\s*-{2,}\s*$/gm, '');
  
  // 0c. Basic XSS sanitization - remove dangerous tags and attributes
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  html = html.replace(/javascript\s*:/gi, "");
  html = html.replace(/<(iframe|object|embed|form|input|button)[^>]*>/gi, "");
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 1. Fenced code blocks — stash into placeholders with enhanced styling
  const preBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const lines = escaped.split('\n');
    const langLabel = lang ? `<span class="absolute top-2 left-3 text-[9px] font-mono text-gray-500 uppercase tracking-wider">${lang}</span>` : '';
    
    // Add line numbers
    const numberedLines = lines.map((line: string, i: number) => 
      `<span class="table-row"><span class="table-cell pr-4 text-gray-600 select-none text-right w-8">${i + 1}</span><span class="table-cell">${line}</span></span>`
    ).join('\n');
    
    // Copy button with inline onclick handler
    const copyButton = `<button class="copy-code-btn absolute top-2 right-2 p-1.5 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white opacity-0 hover:opacity-100 transition-all z-10" title="Copy code" onclick="(function(btn){var code=btn.parentElement.querySelector('code').textContent;navigator.clipboard.writeText(code);btn.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><polyline points=\\'20 6 9 17 4 12\\'/></svg>';btn.style.background='#059669';setTimeout(function(){btn.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'14\\' height=\\'14\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><rect width=\\'14\\' height=\\'14\\' x=\\'8\\' y=\\'8\\' rx=\\'2\\'/><path d=\\'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\\'/></svg>';btn.style.background='';},2000);})(this)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>`;
    
    const block = `<div class="relative group/code my-4"><pre class="relative bg-[#1a1a2e] rounded-xl p-4 pt-8 border border-[#2d2d44] overflow-x-auto scrollbar-hide" style="scrollbar-width:none;-ms-overflow-style:none;">${langLabel}<code style="color:#e2e8f0" class="text-[11px] leading-relaxed font-mono whitespace-pre table">${numberedLines}</code></pre>${copyButton}</div>`;
    const idx = preBlocks.push(block) - 1;
    return `\u0000PRE_BLOCK_${idx}\u0000`;
  });

  // 2. (Dash lines already removed in step 0b)

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
            `<th class="px-3 py-2 text-left text-[0.85em] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">${h}</th>`
        )
        .join("");
      const trRows = rows
        .map(
          (cols: string[]) =>
            '<tr class="border-b border-gray-100 hover:bg-gray-50">' +
            cols.map((c: string) => `<td class="px-3 py-2 text-gray-600">${c}</td>`).join("") +
            "</tr>"
        )
        .join("");
      return `<div class="my-4 overflow-x-auto rounded-xl border border-gray-200"><table class="w-full"><thead class="bg-gray-100"><tr>${thCells}</tr></thead><tbody class="bg-white">${trRows}</tbody></table></div>`;
    }
  );

  // 4. Block-quotes / mental-model callouts
  html = html.replace(
    /^> (.+)$/gm,
    '<div class="my-3 pl-4 py-2.5 border-l-2 border-[#B8C3C9] bg-[#C9D2D6]/20 rounded-r-lg"><span class="italic text-[#4a5568]">💡 $1</span></div>'
  );

  // 5. Headers (process ### before ## before #) - use relative sizes
  html = html.replace(
    /^### (.+)$/gm,
    '<h4 class="text-[0.9em] font-semibold text-[#888] mt-3 mb-1 uppercase tracking-widest">$1</h4>'
  );
  html = html.replace(
    /^## (\d+)\.\s*(.+)$/gm,
    '<h3 class="text-[1.15em] font-bold text-[#4a5568] mt-5 mb-2 flex items-center gap-2"><span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#B8C3C9]/30 text-[#4a5568] text-[0.9em] font-black">$1</span>$2</h3>'
  );
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-[1.15em] font-bold text-[#4a5568] mt-5 mb-2">$1</h3>');
  html = html.replace(
    /^# (.+)$/gm,
    '<h2 class="text-[1.3em] font-extrabold text-[#2a2a2a] mt-5 mb-3 pb-2 border-b border-[#D6CFC2]">$1</h2>'
  );

  // 6. Bold → dark emphasis
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#2a2a2a] font-semibold">$1</strong>');

  // 7. Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="text-[#666] italic">$1</em>');

  // 8. Inline code (with inline style to ensure proper sizing)
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="inline-code bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono border border-gray-200" style="font-size:0.85em">$1</code>'
  );

  // 9. Unordered list items → clean dashes
  html = html.replace(
    /^[-*] (.+)$/gm,
    '<li class="flex items-start gap-2 py-0.5"><span class="text-[#8a9ba3] mt-px select-none">–</span><span>$1</span></li>'
  );

  // 10. Ordered list items
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    '<li class="flex items-start gap-2 py-0.5"><span class="text-[#8a9ba3] font-semibold min-w-[1rem]">$1.</span><span>$2</span></li>'
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
    return `<details class="my-2 rounded-lg border border-gray-200 bg-gray-50/50"><summary class="px-3 py-2 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none">${summary}</summary><div class="px-3 py-2 text-gray-600 border-t border-gray-200 bg-white/50">${detailsContent}</div></details>`;
  });

  // 14. Visual Summary callout boxes
  html = html.replace(
    /Visual Summary/gi,
    '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 text-gray-600 font-semibold">📐 Visual Summary</span>'
  );

  // 15. Focus Area callout boxes
  html = html.replace(
    /⚠️\s*Focus Area/g,
    '<div class="my-3 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/50"><span class="flex items-center gap-1 font-semibold text-amber-700">⚠️ Focus Area</span>'
  );

  // 16. Quick Reference Card header styling
  html = html.replace(
    /Quick Reference Card/gi,
    '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 text-gray-600 font-semibold">📋 Quick Reference</span>'
  );

  // 17. Remaining plain lines → paragraphs with improved typography
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
      return `<p class="text-gray-700 my-2">${line}</p>`;
    })
    .join("\n");

  // 18. Restore protected <pre> code blocks
  html = html.replace(/\u0000PRE_BLOCK_(\d+)\u0000/g, (_m, idx) => preBlocks[Number(idx)] || "");

  return html;
}
