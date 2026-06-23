const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak
} = require("docx");
const fs = require("fs");
const path = require("path");

const projectRoot = "D:\\Main project\\A3 Summer Project";
const outputDir = path.join(projectRoot, "submission");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function p(text, opts = {}) {
  const { bold, size, font, align, numbering, indent } = opts;
  const runOpts = { font: font || "Arial", size: size || 24 };
  if (bold) runOpts.bold = true;
  const paraOpts = { children: [new TextRun({ text, ...runOpts })] };
  if (align) paraOpts.alignment = align;
  if (numbering) paraOpts.numbering = numbering;
  if (indent) paraOpts.indent = indent;
  return new Paragraph(paraOpts);
}

function h1(text, font = "Arial") {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32, font })]
  });
}

function h2(text, font = "Arial") {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 28, font })]
  });
}

function h3(text, font = "Arial") {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 26, font })]
  });
}

function cell(text, width, bold = false, fill = null, font = "Arial") {
  const opts = {
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold, font, size: 22 })] })]
  };
  if (fill) opts.shading = { fill, type: ShadingType.CLEAR };
  return new TableCell(opts);
}

function makeTable(headers, rows, colWidths, font = "Arial") {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerCells = headers.map((h, i) => cell(h, colWidths[i], true, "D5E8F0", font));
  const tableRows = [
    new TableRow({ children: headerCells })
  ];
  rows.forEach(row => {
    tableRows.push(new TableRow({
      children: row.map((text, i) => cell(text, colWidths[i], false, null, font))
    }));
  });
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: tableRows
  });
}

function addImage(imagePath, caption, width = 500, font = "Arial") {
  if (!fs.existsSync(imagePath)) {
    return [
      p(`[Image not found: ${caption}]`, { italic: true, size: 20 }),
      p(caption, { size: 20, align: AlignmentType.CENTER })
    ];
  }
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const validTypes = ["png", "jpg", "jpeg", "gif", "bmp"];
  const type = validTypes.includes(ext) ? ext : "png";
  const data = fs.readFileSync(imagePath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type,
        data,
        transformation: { width, height: Math.round(width * 0.6) },
        altText: { title: caption, description: caption, name: caption }
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: caption, size: 20, italics: true, font })]
    })
  ];
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// Test counts from docs
const testCounts = [
  ["Conversational Profiling", "30+", "Profile builder + gap detector"],
  ["Multi-Agent Resources", "35+", "Orchestrator, content, mindmap, media, code"],
  ["Adaptive Path Planning", "176+", "A*, adaptation engine, recommender, graph generation"],
  ["AI Tutoring", "94+", "Conversation manager, ASR, faithfulness, moderation"],
  ["Analytics & Assessment", "25+", "Insights engine, comparative analytics"],
  ["Total Backend Tests", "360+", "Across 35+ pytest files"]
];

function generateEnglishReport() {
  const children = [];

  // Title page
  children.push(p("NOBOGYAN A3 Learning System", { bold: true, size: 48, align: AlignmentType.CENTER }));
  children.push(p("A3 - Personalized Resource Generation and Learning Multi-Agent System Based on Large Language Models", { size: 28, align: AlignmentType.CENTER }));
  children.push(p("", { size: 24 }));
  children.push(p("Team: Velox Studio", { size: 28, align: AlignmentType.CENTER }));
  children.push(p("Sabbir Hossain · Rahber Hassen · Shoriful Islam", { size: 24, align: AlignmentType.CENTER }));
  children.push(p("", { size: 24 }));
  children.push(p("Nanjing University of Posts and Telecommunications (NJUPT)", { size: 24, align: AlignmentType.CENTER }));
  children.push(p("Advisor: LIU QIANG", { size: 24, align: AlignmentType.CENTER }));
  children.push(p("Project Duration: 3 months", { size: 24, align: AlignmentType.CENTER }));
  children.push(p("June 2026", { size: 24, align: AlignmentType.CENTER }));
  children.push(pageBreak());

  // 1. Project Overview
  children.push(h1("1. Project Overview & Background"));
  children.push(h2("1.1 Problem Statement"));
  children.push(p("Traditional online education platforms deliver the same content to every learner, ignoring individual knowledge gaps, learning pace, and cognitive preferences. This one-size-fits-all approach leads to low engagement, poor retention, and inefficient study paths. Students often waste time reviewing material they already know or skip foundational concepts they have not mastered."));
  children.push(h2("1.2 Project Objectives"));
  children.push(p("NOBOGYAN A3 is an AI-native adaptive learning platform that builds a six-dimensional learner profile through natural conversation, generates personalized learning resources via specialized agents, plans adaptive learning paths over a knowledge graph, provides real-time multimodal tutoring, and continuously improves through learning analytics."));
  children.push(h2("1.3 Why This Topic"));
  children.push(p("The rapid development of large language models and multi-agent systems creates an opportunity to move beyond static courses. By combining conversational profiling, orchestrated content generation, graph-based path planning, and data-driven analytics, the project addresses a real educational need while demonstrating advanced software engineering, AI integration, and system design competencies required by the competition."));

  // 2. Requirement Analysis
  children.push(h1("2. Requirement Analysis"));
  children.push(h2("2.1 Functional Requirements"));
  children.push(p("The system implements five core functional modules:"));
  children.push(makeTable(
    ["Module", "Description", "Key Capabilities"],
    [
      ["Conversational Profiling", "Extract learner model from chat", "6 dimensions, confidence scoring, gap detection"],
      ["Resource Generation", "Orchestrate specialized agents", "Notes, mind maps, quizzes, media, code exercises"],
      ["Path Planning", "Generate adaptive learning paths", "A* search, milestones, dynamic adaptation"],
      ["AI Tutoring", "Real-time Q&A and support", "Text, voice, image, diagram, streaming"],
      ["Analytics", "Track and analyze learning", "Behavioral insights, predictions, recommendations"]
    ],
    [2200, 2800, 4360]
  ));
  children.push(h2("2.2 Non-Functional Requirements"));
  children.push(makeTable(
    ["Category", "Requirement", "Target"],
    [
      ["Performance", "Time to first token", "< 2 seconds"],
      ["Performance", "Text resource generation", "< 60 seconds"],
      ["Performance", "Path planning latency", "< 3 seconds"],
      ["Scalability", "Concurrent active users", "50+"],
      ["Security", "Content moderation", "Pattern-based filtering on all inputs"],
      ["Quality", "Factual consistency", "Faithfulness checker on generated content"],
      ["UX", "Responsive design", "Desktop-first web application"]
    ],
    [2200, 3600, 3560]
  ));

  // 3. System Design
  children.push(h1("3. System Design"));
  children.push(h2("3.1 Overall Architecture"));
  children.push(p("The system follows a four-layer architecture:"));
  children.push(makeTable(
    ["Layer", "Technology", "Responsibility"],
    [
      ["Presentation Layer", "Next.js 16 + React 19 + Tailwind", "User interface, streaming rendering"],
      ["Application Layer", "FastAPI (Python)", "REST APIs, authentication, session management"],
      ["Intelligence Layer", "Kimi + iFLYTEK + RAG", "Content generation, reasoning, retrieval"],
      ["Data Layer", "PostgreSQL + Redis + Weaviate", "Persistent storage, cache, vector search"]
    ],
    [2200, 3400, 3760]
  ));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-19 191848.png"), "Figure 1: Agent architecture of NOBOGYAN A3", 520));
  children.push(h2("3.2 Database Design"));
  children.push(p("The PostgreSQL schema includes tables for student profiles, learning paths, milestones, quizzes, quiz attempts, chat sessions, generated resources, analytics events, cohorts, and knowledge graphs. JSONB columns store flexible structured content such as profile dimensions and resource payloads."));
  children.push(makeTable(
    ["Table", "Purpose", "Key Fields"],
    [
      ["student_profiles", "Learner model", "knowledge_base, cognitive_style, weak_points, goals"],
      ["learning_paths", "Generated paths", "path_sequence, milestones, metrics"],
      ["generated_resources", "Agent outputs", "resource_type, content, source, weak_concepts_targeted"],
      ["quiz_attempts", "Assessment records", "score, time_taken, answers"],
      ["chat_sessions", "Tutor history", "session_type, context_summary, current_node_id"],
      ["knowledge_graphs", "Dynamic graphs", "subject, nodes, edges, status"]
    ],
    [2200, 2600, 4560]
  ));
  children.push(h2("3.3 Module Division"));
  children.push(p("Backend modules are organized under agents/, api/routers/, core/, nlp/, rag/, analytics/, and adaptation/. The frontend uses Next.js app router with route groups for onboarding, dashboard, and authentication."));

  // 4. Implementation Details
  children.push(h1("4. Implementation Details"));
  children.push(h2("4.1 Technology Stack"));
  children.push(makeTable(
    ["Layer", "Technology", "Version / Notes"],
    [
      ["Frontend Framework", "Next.js + React", "Next.js 16, React 19"],
      ["Frontend Styling", "Tailwind CSS", "Tailwind v4"],
      ["Backend Framework", "FastAPI", "Python 3.10+"],
      ["LLM", "Kimi (domestic model)", "Production reasoning engine"],
      ["Voice (TTS/ASR)", "iFLYTEK", "WebSocket TTS and IAT ASR"],
      ["Vector Store", "Weaviate / Chroma", "RAG grounding"],
      ["Database", "PostgreSQL + SQLAlchemy + Alembic", "16 tables"],
      ["Cache", "Redis", "Session and insights cache"],
      ["Code Sandbox", "Judge0", "Coding exercise execution"]
    ],
    [2400, 3200, 3760]
  ));
  children.push(h2("4.2 Core Logic and Algorithms"));
  children.push(h3("4.2.1 A* Learning Path Planning"));
  children.push(p("The path planner treats topics as nodes and prerequisites as edges. The cost function is f(n) = g(n) + h(n) + profile_bias + preference_bonus, where g(n) accumulates difficulty-weighted time, h(n) estimates importance via PageRank, profile_bias adjusts for weak points and goals, and preference_bonus rewards matching content types."));
  children.push(h3("4.2.2 Dynamic Adaptation Engine"));
  children.push(p("An event-driven engine consumes QuizCompletedEvent, GateCalculatedEvent, GoalChangedEvent, and MilestoneStuckEvent. It selects strategies such as remediate, accelerate, replan, and tutor_nudge with per-student cooldowns to prevent flapping."));
  children.push(h3("4.2.3 Hybrid Recommendation"));
  children.push(p("The recommender fuses content-based scoring (weak points and goals) with collaborative filtering (Jaccard similarity over mastered topics). Weak-point matches receive a 2.0x boost, and already-mastered nodes are excluded."));
  children.push(h3("4.2.4 Faithfulness Guardrail"));
  children.push(p("Every agent output and tutor response passes through a faithfulness checker that classifies claims as supported, contradicted, or unverifiable against retrieved RAG chunks. Low-scoring content receives a warning prefix."));
  children.push(h2("4.3 Interface Design and Screenshots"));
  children.push(p("The user interface follows a calm, focused design system using sage green and sand tones. Key screens include the landing page, learning path creation, interactive mind map, generated notes, code exercises, quizzes, and the AI tutor."));
  children.push(...addImage(path.join(projectRoot, "a3-system", "frontend", "web", "a3-learning landing page", "Screenshot 2026-05-19 112506.png"), "Figure 2: Landing page showing the agent swarm", 520));
  children.push(...addImage(path.join(projectRoot, "image.png"), "Figure 3: Creating a new personalized learning path", 480));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-02 125443.png"), "Figure 4: Interactive mind map for Distributed Computing", 500));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-03 170327.png"), "Figure 5: Generated learning notes with analogies and tables", 480));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-03 180930.png"), "Figure 6: Scaffolded coding exercise with example solution", 480));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-04 171000.png"), "Figure 7: Adaptive quiz interface with scenario-based question", 480));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-14 003040.png"), "Figure 8: AI tutor input with image, voice, and text support", 480));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-14 003242.png"), "Figure 9: AI tutor generating visual ASCII diagrams", 480));

  // 5. Testing & Results
  children.push(h1("5. Testing & Results"));
  children.push(h2("5.1 Backend Unit Tests"));
  children.push(p("The backend includes 35+ pytest files covering critical paths. Test counts per feature are summarized below:"));
  children.push(makeTable(
    ["Feature", "Tests", "Coverage Focus"],
    testCounts.map(r => [r[0], r[1], r[2]]),
    [2600, 1600, 5160]
  ));
  children.push(h2("5.2 Frontend Testing"));
  children.push(p("Frontend verification is performed through manual testing. The team validated key user flows including registration, onboarding chat, profile summary, learning path generation, resource consumption, quiz submission, and tutor interaction across Chrome and Edge browsers."));
  children.push(h2("5.3 Performance Estimates"));
  children.push(makeTable(
    ["Metric", "Estimated Value", "Notes"],
    [
      ["Time to first token (tutor)", "2-5 seconds", "Includes RAG retrieval and LLM call"],
      ["Text resource generation", "30-60 seconds", "All selected agents in parallel"],
      ["Path planning (80-node graph)", "~200 ms", "A* with custom heuristic"],
      ["Recommendation latency", "~50 ms", "Hybrid CB + CF scoring"],
      ["ASR partial result latency", "~200 ms", "iFLYTEK IAT WebSocket"],
      ["TTS generation (cached)", "~1 second / 100 words", "Edge-TTS with content hashing"]
    ],
    [2800, 2200, 4360]
  ));
  children.push(h2("5.4 Bug Fixes and Iteration"));
  children.push(p("Recent development addressed race conditions in milestone progress tracking, implemented fallback LLM key rotation, fixed TTS audio playback timeouts, resolved single-slide media agent truncation, and corrected routing between profile summary, new path, and notebook screens."));

  // 6. Conclusion & Outlook
  children.push(h1("6. Conclusion & Outlook"));
  children.push(h2("6.1 Completed Work"));
  children.push(p("The project delivered a working end-to-end adaptive learning platform. All five core modules are functional: conversational profiling, multi-agent resource generation, A* path planning with dynamic adaptation, real-time AI tutoring, and learning analytics with an interactive dashboard."));
  children.push(h2("6.2 Project Advantages"));
  children.push(p("NOBOGYAN A3 differentiates itself through a closed-loop learning cycle where assessment data continuously refines the learner profile and regenerates resources. The orchestrator-worker agent pattern, RAG-grounded outputs, faithfulness guardrails, and dynamic knowledge graph generation provide strong technical depth."));
  children.push(h2("6.3 Shortcomings and Future Work"));
  children.push(makeTable(
    ["Item", "Status", "Planned Improvement"],
    [
      ["Teacher dashboard", "Future work", "Class roster, at-risk flags, progress summary"],
      ["True video generation", "Under evaluation", "Testing different models for integration"],
      ["Frontend automated tests", "Not implemented", "Add Jest/Playwright coverage"],
      ["Load testing", "Not performed", "k6 test at 50 concurrent users"],
      ["iFLYTEK Spark LLM", "Partial", "TTS/ASR integrated; evaluating LLM migration"]
    ],
    [2800, 2200, 4360]
  ));

  // 7. References
  children.push(h1("7. References"));
  children.push(p("1. iFLYTEK Developer Documentation (open.xfyun.cn)."));
  children.push(p("2. FastAPI Documentation (fastapi.tiangolo.com)."));
  children.push(p("3. Next.js Documentation (nextjs.org)."));
  children.push(p("4. Tailwind CSS Documentation (tailwindcss.com)."));
  children.push(p("5. Kimi Large Language Model Documentation."));
  children.push(p("6. Project internal documentation: PROJECT_STATUS.md, GAP_ANALYSIS.md, officialdoc.md."));

  return new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 24 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 2 } }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: { default: new Header({ children: [p("NOBOGYAN A3 Learning System - Defense Report", { size: 20 })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "Page ", size: 20 }), new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] }) },
      children
    }]
  });
}

function generateChineseReport() {
  const children = [];
  const cnFont = "SimSun";

  children.push(p("NOBOGYAN A3 智能学习系统", { bold: true, size: 48, align: AlignmentType.CENTER, font: cnFont }));
  children.push(p("A3 - 基于大模型的个性化资源生成与学习多智能体系统开发", { size: 28, align: AlignmentType.CENTER, font: cnFont }));
  children.push(p("", { size: 24 }));
  children.push(p("团队：Velox Studio", { size: 28, align: AlignmentType.CENTER, font: cnFont }));
  children.push(p("Sabbir Hossain · Rahber Hassen · Shoriful Islam", { size: 24, align: AlignmentType.CENTER, font: cnFont }));
  children.push(p("", { size: 24 }));
  children.push(p("南京邮电大学 (NJUPT)", { size: 24, align: AlignmentType.CENTER, font: cnFont }));
  children.push(p("指导教师：LIU QIANG", { size: 24, align: AlignmentType.CENTER, font: cnFont }));
  children.push(p("项目周期：3 个月", { size: 24, align: AlignmentType.CENTER, font: cnFont }));
  children.push(p("2026 年 6 月", { size: 24, align: AlignmentType.CENTER, font: cnFont }));
  children.push(pageBreak());

  children.push(h1("一、项目概述与背景", cnFont));
  children.push(h2("1.1 问题提出", cnFont));
  children.push(p("传统在线教育平台向所有学习者提供相同内容，忽视了个人知识差距、学习节奏和认知偏好。这种“一刀切”的方式导致学习参与度低、知识留存差、学习路径低效。学生常常在已掌握的内容上浪费时间，或跳过尚未掌握的基础概念。", { font: cnFont }));
  children.push(h2("1.2 项目目标", cnFont));
  children.push(p("NOBOGYAN A3 是一款 AI 原生的自适应学习平台，通过自然语言对话构建六维学习者画像，利用多智能体生成个性化学习资源，在知识图谱上规划自适应学习路径，提供实时多模态辅导，并通过学习分析持续优化。", { font: cnFont }));
  children.push(h2("1.3 选题意义", cnFont));
  children.push(p("大语言模型与多智能体系统的快速发展，使超越静态课程成为可能。本项目将对话式画像、编排式内容生成、图路径规划与数据驱动分析相结合，既解决了真实教育需求，又展示了软件工程、人工智能集成与系统设计的综合能力。", { font: cnFont }));

  children.push(h1("二、需求分析", cnFont));
  children.push(h2("2.1 功能需求", cnFont));
  children.push(p("系统实现五大核心功能模块：", { font: cnFont }));
  children.push(makeTable(
    ["模块", "说明", "关键能力"],
    [
      ["对话式学习者画像", "从聊天中提取学习者模型", "六个维度、置信度评分、差距检测"],
      ["资源生成", "编排专业智能体", "笔记、思维导图、测验、媒体、编程题"],
      ["路径规划", "生成自适应学习路径", "A* 搜索、里程碑、动态调整"],
      ["AI 辅导", "实时问答与辅导", "文本、语音、图像、图表、流式输出"],
      ["学习分析", "追踪与分析学习行为", "行为洞察、预测、推荐"]
    ],
    [2200, 2800, 4360], cnFont
  ));
  children.push(h2("2.2 非功能需求", cnFont));
  children.push(makeTable(
    ["类别", "需求", "目标"],
    [
      ["性能", "首 token 时间", "< 2 秒"],
      ["性能", "文本资源生成", "< 60 秒"],
      ["性能", "路径规划延迟", "< 3 秒"],
      ["可扩展性", "并发活跃用户", "50+"],
      ["安全", "内容审核", "所有输入均经过模式过滤"],
      ["质量", "事实一致性", "生成内容经过忠实度校验"],
      ["用户体验", "响应式设计", "桌面优先 Web 应用"]
    ],
    [2200, 3600, 3560], cnFont
  ));

  children.push(h1("三、系统设计", cnFont));
  children.push(h2("3.1 总体架构", cnFont));
  children.push(p("系统采用四层架构：", { font: cnFont }));
  children.push(makeTable(
    ["层级", "技术", "职责"],
    [
      ["表现层", "Next.js 16 + React 19 + Tailwind", "用户界面、流式渲染"],
      ["应用层", "FastAPI (Python)", "REST API、认证、会话管理"],
      ["智能层", "Kimi + 讯飞 + RAG", "内容生成、推理、检索"],
      ["数据层", "PostgreSQL + Redis + Weaviate", "持久化、缓存、向量检索"]
    ],
    [2200, 3400, 3760], cnFont
  ));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-19 191848.png"), "图 1：NOBOGYAN A3 智能体架构", 520, cnFont));
  children.push(h2("3.2 数据库设计", cnFont));
  children.push(p("PostgreSQL 模式包含学生画像、学习路径、里程碑、测验、答题记录、聊天会话、生成资源、分析事件、班级与知识图谱等表。JSONB 列用于存储灵活结构化内容，如画像维度与资源载荷。", { font: cnFont }));
  children.push(makeTable(
    ["表", "用途", "关键字段"],
    [
      ["student_profiles", "学习者模型", "knowledge_base, cognitive_style, weak_points, goals"],
      ["learning_paths", "生成路径", "path_sequence, milestones, metrics"],
      ["generated_resources", "智能体输出", "resource_type, content, source, weak_concepts_targeted"],
      ["quiz_attempts", "评估记录", "score, time_taken, answers"],
      ["chat_sessions", "辅导历史", "session_type, context_summary, current_node_id"],
      ["knowledge_graphs", "动态图谱", "subject, nodes, edges, status"]
    ],
    [2200, 2600, 4560], cnFont
  ));
  children.push(h2("3.3 模块划分", cnFont));
  children.push(p("后端模块按 agents/、api/routers/、core/、nlp/、rag/、analytics/、adaptation/ 组织；前端使用 Next.js App Router，按 onboarding、dashboard、auth 路由组划分。", { font: cnFont }));

  children.push(h1("四、实现细节", cnFont));
  children.push(h2("4.1 技术栈", cnFont));
  children.push(makeTable(
    ["层级", "技术", "版本 / 说明"],
    [
      ["前端框架", "Next.js + React", "Next.js 16, React 19"],
      ["前端样式", "Tailwind CSS", "Tailwind v4"],
      ["后端框架", "FastAPI", "Python 3.10+"],
      ["大语言模型", "Kimi（国产模型）", "生产环境推理引擎"],
      ["语音 (TTS/ASR)", "科大讯飞", "WebSocket TTS 与 IAT 语音听写"],
      ["向量库", "Weaviate / Chroma", "RAG  grounding"],
      ["数据库", "PostgreSQL + SQLAlchemy + Alembic", "16 张表"],
      ["缓存", "Redis", "会话与洞察缓存"],
      ["代码沙箱", "Judge0", "编程题运行"]
    ],
    [2400, 3200, 3760], cnFont
  ));
  children.push(h2("4.2 核心逻辑与算法", cnFont));
  children.push(h3("4.2.1 A* 学习路径规划", cnFont));
  children.push(p("路径规划器将知识点视为节点，先修关系视为边。代价函数为 f(n) = g(n) + h(n) + profile_bias + preference_bonus，其中 g(n) 累加难度加权时间，h(n) 通过 PageRank 估计重要性，profile_bias 针对薄弱点与目标调整，preference_bonus 奖励匹配的内容类型。", { font: cnFont }));
  children.push(h3("4.2.2 动态自适应引擎", cnFont));
  children.push(p("事件驱动引擎消费 QuizCompletedEvent、GateCalculatedEvent、GoalChangedEvent 和 MilestoneStuckEvent，选择 remediate、accelerate、replan、tutor_nudge 等策略，并通过 per-student 冷却时间防止抖动。", { font: cnFont }));
  children.push(h3("4.2.3 混合推荐", cnFont));
  children.push(p("推荐器融合基于内容的评分（薄弱点与目标）与协同过滤（已掌握主题的 Jaccard 相似度）。薄弱点匹配获得 2.0 倍加权，已掌握节点被排除。", { font: cnFont }));
  children.push(h3("4.2.4 忠实度护栏", cnFont));
  children.push(p("所有智能体输出与辅导回复均经过忠实度校验，将声明分类为 supported、contradicted 或 unverifiable。低分内容会附加警告前缀。", { font: cnFont }));
  children.push(h2("4.3 界面设计与截图", cnFont));
  children.push(p("界面采用宁静、专注的设计系统，主色为鼠尾草绿与沙色。关键页面包括落地页、学习路径创建、交互式思维导图、生成笔记、编程练习、测验与 AI 辅导。", { font: cnFont }));
  children.push(...addImage(path.join(projectRoot, "a3-system", "frontend", "web", "a3-learning landing page", "Screenshot 2026-05-19 112506.png"), "图 2：落地页展示智能体群", 520, cnFont));
  children.push(...addImage(path.join(projectRoot, "image.png"), "图 3：创建新的个性化学习路径", 480, cnFont));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-02 125443.png"), "图 4：分布式计算交互式思维导图", 500, cnFont));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-03 170327.png"), "图 5：带类比与表格的生成笔记", 480, cnFont));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-03 180930.png"), "图 6：带示例解的分层编程练习", 480, cnFont));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-04 171000.png"), "图 7：带场景题的自适应测验界面", 480, cnFont));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-14 003040.png"), "图 8：支持图像、语音、文本的 AI 辅导输入", 480, cnFont));
  children.push(...addImage(path.join(projectRoot, "testing image", "Screenshot 2026-05-14 003242.png"), "图 9：AI 辅导生成可视化 ASCII 图表", 480, cnFont));

  children.push(h1("五、测试与结果", cnFont));
  children.push(h2("5.1 后端单元测试", cnFont));
  children.push(p("后端包含 35 个以上 pytest 文件，覆盖关键路径。各功能测试数量如下：", { font: cnFont }));
  children.push(makeTable(
    ["功能", "测试数", "覆盖重点"],
    testCounts.map(r => [r[0], r[1], r[2]]),
    [2600, 1600, 5160], cnFont
  ));
  children.push(h2("5.2 前端测试", cnFont));
  children.push(p("前端通过手动测试完成验证。团队已验证注册、 onboarding 对话、画像摘要、学习路径生成、资源消费、测验提交与辅导交互等关键流程，并在 Chrome 与 Edge 浏览器中完成测试。", { font: cnFont }));
  children.push(h2("5.3 性能估算", cnFont));
  children.push(makeTable(
    ["指标", "估算值", "说明"],
    [
      ["辅导首 token 时间", "2-5 秒", "包含 RAG 检索与大模型调用"],
      ["文本资源生成", "30-60 秒", "所选智能体并行运行"],
      ["路径规划（80 节点图）", "约 200 毫秒", "带自定义启发函数的 A*"],
      ["推荐延迟", "约 50 毫秒", "混合 CB + CF 评分"],
      ["ASR 部分结果延迟", "约 200 毫秒", "讯飞 IAT WebSocket"],
      ["TTS 生成（已缓存）", "约 1 秒 / 100 词", "Edge-TTS 内容哈希缓存"]
    ],
    [2800, 2200, 4360], cnFont
  ));
  children.push(h2("5.4 Bug 修复与迭代", cnFont));
  children.push(p("近期开发修复了里程碑进度跟踪中的竞态条件、实现了 LLM 备用密钥轮换、修复了 TTS 音频播放超时、解决了媒体智能体单幻灯片截断问题，并修正了画像摘要、新路径与笔记本之间的路由。", { font: cnFont }));

  children.push(h1("六、结论与展望", cnFont));
  children.push(h2("6.1 完成工作", cnFont));
  children.push(p("项目交付了一套端到端可用的自适应学习平台。五大核心模块均已实现：对话式画像、多智能体资源生成、带动态调整的 A* 路径规划、实时 AI 辅导，以及带交互式仪表板的学习分析。", { font: cnFont }));
  children.push(h2("6.2 项目优势", cnFont));
  children.push(p("NOBOGYAN A3 的优势在于闭环学习：评估数据持续精炼学习者画像并触发资源重生成。编排-工作者智能体模式、RAG  grounding、忠实度护栏与动态知识图谱生成提供了较强的技术深度。", { font: cnFont }));
  children.push(h2("6.3 不足与未来工作", cnFont));
  children.push(makeTable(
    ["项目", "状态", "计划改进"],
    [
      ["教师仪表盘", "未来工作", "班级名单、风险学生标记、进度汇总"],
      ["真实视频生成", "评估中", "测试并集成不同模型"],
      ["前端自动化测试", "未实现", "增加 Jest / Playwright 覆盖"],
      ["压力测试", "未执行", "50 并发用户的 k6 测试"],
      ["讯飞星火大模型", "部分", "TTS/ASR 已集成；评估 LLM 迁移"]
    ],
    [2800, 2200, 4360], cnFont
  ));

  children.push(h1("七、参考文献", cnFont));
  children.push(p("1. 科大讯飞开发者文档 (open.xfyun.cn)。", { font: cnFont }));
  children.push(p("2. FastAPI 官方文档 (fastapi.tiangolo.com)。", { font: cnFont }));
  children.push(p("3. Next.js 官方文档 (nextjs.org)。", { font: cnFont }));
  children.push(p("4. Tailwind CSS 官方文档 (tailwindcss.com)。", { font: cnFont }));
  children.push(p("5. Kimi 大语言模型文档。", { font: cnFont }));
  children.push(p("6. 项目内部文档：PROJECT_STATUS.md、GAP_ANALYSIS.md、officialdoc.md。", { font: cnFont }));

  return new Document({
    styles: {
      default: { document: { run: { font: cnFont, size: 24 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: cnFont },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: cnFont },
          paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: cnFont },
          paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 2 } }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: { default: new Header({ children: [p("NOBOGYAN A3 智能学习系统 - 项目报告", { size: 20, font: cnFont })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "第 ", size: 20, font: cnFont }), new TextRun({ children: [PageNumber.CURRENT], size: 20, font: cnFont }), new TextRun({ text: " 页", size: 20, font: cnFont })] })] }) },
      children
    }]
  });
}

async function main() {
  const enDoc = generateEnglishReport();
  const enBuffer = await Packer.toBuffer(enDoc);
  fs.writeFileSync(path.join(outputDir, "NOBOGYAN_A3_Defense_Report_EN.docx"), enBuffer);
  console.log("English report saved.");

  const cnDoc = generateChineseReport();
  const cnBuffer = await Packer.toBuffer(cnDoc);
  fs.writeFileSync(path.join(outputDir, "NOBOGYAN_A3_Defense_Report_CN.docx"), cnBuffer);
  console.log("Chinese report saved.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
