# A3 Learning System - Premium Landing Page Design PRD

> **Version:** 3.0 - Agent Swarm Edition  
> **Last Updated:** 2026-05-19  
> **Status:** Ready for Design Team  
> **Vibe:** "An intelligent swarm, working just for you"

---

## 1. Design Philosophy

### The Core Concept: "The Swarm"

A3 isn't a single AI. It's a **swarm of 15+ specialized agents** — each with a unique role — that collaborate in real-time to build your perfect learning experience. The landing page should make visitors feel the **scale, intelligence, and orchestration** of this system.

Think:
- **Redacted's** 3D organic landscape — but with agents orbiting like fireflies
- **TrueCaller's** floating UI cards — but showing live agent activity
- **Oppoai's** bold data cards — but with real-time learning metrics
- **BrightPath's** playful warmth — but with the precision of a neural network

### Three Principles

1. **Swarm Intelligence** — The page should feel alive with coordinated activity. Agents don't sit still; they orbit, pulse, collaborate.
2. **Dimensional Depth** — 3D space with parallax, floating layers, and spatial relationships between agents.
3. **Living Interactions** — Nothing is static. Everything responds, connects, or breathes.

---

## 2. Visual System

### 2.1 Color Palette

#### Primary: "Sage & Sand"
```css
--sage-50:  #F4F7F2
--sage-100: #E3EBDE
--sage-200: #C5D6BE
--sage-300: #9EBA93
--sage-400: #7C9A6B  /* Primary brand */
--sage-500: #5E7A4F
--sage-600: #49613D
--sage-700: #3A4D31

--sand-50:  #FAF8F5
--sand-100: #F5F1EB
--sand-200: #EDE8E0
--sand-300: #E0D9CE
--sand-400: #C8BFB0

--deep-charcoal: #1A1D1F
```

#### Agent Swarm Colors
```css
/* Content Agents */
--agent-content:    #9B59B6   /* Scholar - Purple */
--agent-mindmap:    #E67E22   /* Mapper - Orange */
--agent-quiz:       #1ABC9C   /* Sage - Teal */
--agent-media:      #E74C3C   /* Director - Red */
--agent-code:       #34495E   /* Architect - Navy */

/* System Agents */
--agent-orchestrator: #7C9A6B   /* Sage Green */
--agent-tutor:        #3498DB   /* Blue */
--agent-planner:      #F39C12   /* Amber */
--agent-faithful:     #2ECC71   /* Green */
--agent-moderator:    #E74C3C   /* Red alert */
--agent-evaluator:    #9B59B6   /* Purple */
--agent-grader:       #1ABC9C   /* Teal */
--agent-recommender:  #E67E22   /* Orange */
--agent-vision:       #8E44AD   /* Deep purple */
--agent-voice:        #16A085   /* Deep teal */
```

#### Dynamic Gradients
```css
/* Hero - Living Mesh with swarm colors */
--mesh-primary: radial-gradient(at 40% 20%, rgba(124,154,107,0.3) 0px, transparent 50%),
                radial-gradient(at 80% 0%, rgba(52,152,219,0.2) 0px, transparent 50%),
                radial-gradient(at 0% 50%, rgba(155,89,182,0.15) 0px, transparent 50%),
                radial-gradient(at 80% 50%, rgba(26,188,156,0.2) 0px, transparent 50%),
                radial-gradient(at 50% 100%, rgba(230,126,34,0.15) 0px, transparent 50%);

/* Swarm network glow */
--swarm-glow: 0 0 20px rgba(124,154,107,0.3), 0 0 40px rgba(52,152,219,0.1);
```

#### Glassmorphism Surface
```css
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-border: rgba(255, 255, 255, 0.3);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
--glass-blur: backdrop-filter: blur(20px) saturate(180%);
```

### 2.2 Typography

**Font Pairing:**
```css
--font-display: "Playfair Display", Georgia, serif;    /* Headlines */
--font-body: "Inter", -apple-system, sans-serif;       /* Body */
--font-mono: "JetBrains Mono", monospace;              /* Code/agent labels */
```

**Type Scale:**
| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Hero H1 | Playfair Display | 72px | 700 | 1.0 |
| Section H2 | Playfair Display | 48px | 600 | 1.1 |
| Section H3 | Inter | 24px | 600 | 1.3 |
| Body Large | Inter | 20px | 400 | 1.6 |
| Body | Inter | 16px | 400 | 1.6 |
| Label | Inter | 12px | 600 | 1.4 |
| Stat | Playfair Display | 56px | 700 | 1.0 |
| Agent Label | JetBrains Mono | 11px | 500 | 1.2 |

---

## 3. Global Effects & Animations

### 3.1 Swarm Network Background (Canvas)

**Implementation:** HTML5 Canvas particle network  
**Effect:** 40-60 dots representing agents, connected by lines when nearby  
**Colors:** Each dot uses its agent color (see palette above)  
**Behavior:**
- Dots drift slowly in random directions
- Lines connect dots within 150px distance
- Line opacity based on distance (closer = more visible)
- Mouse repels dots gently (like a magnetic field)
- Occasional "pulse" — a dot glows brighter and sends a ripple to connected dots (simulating agent communication)

**Placement:** Hero section background, Agent Swarm section background

### 3.2 Living Mesh Gradient

**Implementation:** CSS animated radial gradients  
**Effect:** 5 blob shapes that morph position over 15s  
**Colors:** Sage, blue, purple, teal, orange at 15-25% opacity  
**Interaction:** Mouse movement subtly shifts gradient center

### 3.3 Scroll-Triggered Reveals (GSAP)

```
Default: opacity 0, translateY(40px) → opacity 1, translateY(0)
Duration: 0.8s, power3.out, stagger 0.1s
```

### 3.4 Magnetic Buttons

Button follows cursor within 50px radius. Spring physics: damping 0.3, stiffness 150.

### 3.5 Text Scramble

Headlines decode from random characters. Duration: 1.5s. Used on hero and section headers.

---

## 4. Page Sections

---

### SECTION 1: Navigation

**Layout:** Fixed top, 80px height
**Background:** Transparent → glassmorphism on scroll (after 100px)

```
[A3 Logo — animated SVG]    [How It Works] [The Swarm] [Features] [Pricing]    [Sign In] [Start Free]
```

**Logo:** "A3" with orbiting dot (represents the swarm)

**Links:** 14px, weight 500. Hover: sage green + underline slide-in.

**CTA:** Pill shape, sage green, magnetic hover.

---

### SECTION 2: Hero — "The Swarm Awakens"

**Height:** 100vh
**Layout:** 50/50 split
**Background:** Canvas swarm network + living mesh gradient

#### Left Side — Content

```
Badge: "15+ AI AGENTS • ONE LEARNING EXPERIENCE"

Headline (Playfair Display, 72px):
"An Entire AI Team
 Learning With You"

Subheadline (Inter, 20px):
"A3 deploys a swarm of specialized agents that profile, 
plan, tutor, and assess — all working together to build 
your perfect learning path."

[Email Input — glassmorphism] [Start Free — magnetic button]

Live Stats Bar (updates every 3s):
"2,847 learners online now • 14,203 paths generated today • 89,412 agent collaborations"
```

**Animation Sequence:**
1. **0ms:** Canvas swarm fades in, dots begin drifting
2. **300ms:** Badge slides in
3. **500ms:** Headline text scramble ("An Entire AI Team...")
4. **1200ms:** Subheadline fades up
5. **1400ms:** Input + button
6. **1600ms:** Live stats bar types in (character by character)

#### Right Side — Swarm Visualization

**Concept:** A 3D visualization showing agents collaborating in real-time  
**Implementation:** CSS 3D + animated orbs

```
Visual Stack:
1. Background: Swarm canvas (dots + connections)
2. Central Orb: "Orchestrator" — largest, sage green, pulses rhythmically
3. Satellite Orbs: 5 content agents orbiting the center in elliptical paths
   - Scholar (purple) — top-left orbit
   - Mapper (orange) — top-right orbit
   - Sage (teal) — bottom-left orbit
   - Director (red) — bottom-right orbit
   - Architect (navy) — center-right orbit
4. Small dots: System agents (tutor, planner, grader, etc.) — inner orbits, faster
5. Connection lines: Animated SVG paths between orbs, pulsing with "data packets"
6. Floating cards: Glassmorphism cards showing live activity:
   - "Quiz Agent: Generating adaptive assessment..."
   - "Path Planner: Optimizing route..."
   - "Tutor Engine: Streaming response..."
```

**Orb Animation:**
```css
@keyframes orbit {
  from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
}

.orbit-slow { animation: orbit 20s linear infinite; }
.orbit-medium { animation: orbit 15s linear infinite; }
.orbit-fast { animation: orbit 10s linear infinite; }
```

**Data Packet Animation:**
- Small dots travel along connection lines
- Speed: 1-2s per journey
- Fade in at source, fade out at destination
- Color matches source agent

**Mouse Interaction:**
- Tilting the entire 3D container toward cursor
- Orbs subtly shift with parallax

---

### SECTION 3: Orbital Trust Bar

**Layout:** Full width, centered
**Background:** White
**Padding:** 48px 0

```
Marquee scrolling left:
"Trusted by learners at" [Stanford] [MIT] [Google] [Amazon] [Microsoft] [Coursera]
```

**Style:** Logos grayscale, 40% opacity. Hover: full color, 100% opacity, scale 1.1.

---

### SECTION 4: How It Works — "From First Chat to Mastery"

**Layout:** 4-step horizontal flow
**Background:** Warm sand (#F5F1EB)
**Padding:** 160px 0

```
Label: "HOW IT WORKS"
Headline: "Four Steps. Infinite Personalization."

Step 1: Discover          Step 2: Plan           Step 3: Learn           Step 4: Master
┌──────────────┐        ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  [Chat Icon] │   →    │  [Graph Icon]│   →   │  [Book Icon] │   →   │  [Trophy Icon│
│              │        │              │       │              │       │              │
│  Talk to A3  │        │  Get Your    │       │  Learn With  │       │  Unlock      │
│  naturally.  │        │  Unique Path │       │  Your Swarm  │       │  Milestones  │
│              │        │              │       │              │       │              │
│  Profile     │        │  A* path     │       │  5 content   │       │  Gates open  │
│  Extractor   │        │  planning    │       │  agents +    │       │  as you      │
│  & Gap      │        │  over        │       │  real-time   │       │  prove       │
│  Detector    │        │  knowledge   │       │  tutor       │       │  mastery     │
│  analyze     │        │  graph       │       │              │       │              │
│  every word. │        │              │       │              │       │              │
└──────────────┘        └──────────────┘       └──────────────┘       └──────────────┘
```

**Step Cards:**
- Border-radius: 24px
- Background: White
- Icon: 48px, sage green
- Agent labels at bottom: Mono font, small badges showing which agents activate
- Hover: Card lifts, agent badges glow

**Connecting Arrows:** Animated dashed lines with traveling dots (like data packets)

---

### SECTION 5: The Swarm — "Meet Your Agents"

**Layout:** Full width, immersive
**Background:** Dark charcoal (#1A1D1F) — dark mode section for contrast
**Padding:** 200px 0

**Concept:** This is the star section. A live visualization of all 15+ agents.

```
Label: "THE SWARM" (sage green, glowing)
Headline (white, Playfair Display, 56px):
"15+ Specialized Agents.
One Coordinated Mind."

Subheadline (white/70%):
"Each agent has a unique role. Together, they build, guide, 
and assess your learning — in real-time."
```

#### Swarm Grid — Categorized

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  CONTENT GENERATION SWARM          │  SYSTEM INTELLIGENCE SWARM          │
│  (The creators — they build)       │  (The coordinators — they orchestrate)│
│                                    │                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ │  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │Scholar │ │ Mapper │ │  Sage  │ │  │Orchest-│ │  Tutor │ │ Planner│  │
│  │Notes   │ │MindMaps│ │ Quiz   │ │  │rator   │ │Engine  │ │A* Path │  │
│  │Purple  │ │Orange  │ │Teal    │ │  │Green   │ │Blue    │ │Amber   │  │
│  └────────┘ └────────┘ └────────┘ │  └────────┘ └────────┘ └────────┘  │
│  ┌────────┐ ┌────────┐            │  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │Director│ │Architect│           │  │Faithful│ │Moderat-│ │Recommen│  │
│  │Video   │ │Code    │            │  │ness    │ │or      │ │der     │  │
│  │Red     │ │Navy    │            │  │Green   │ │Red     │ │Orange  │  │
│  └────────┘ └────────┘            │  └────────┘ └────────┘ └────────┘  │
│                                    │  ┌────────┐ ┌────────┐            │
│                                    │  │Vision  │ │ Voice  │            │
│                                    │  │LLM     │ │ASR/TTS │            │
│                                    │  │Purple  │ │Teal    │            │
│                                    │  └────────┘ └────────┘            │
│                                    │  ┌────────┐ ┌────────┐            │
│                                    │  │Coding  │ │Short   │            │
│                                    │  │Grader  │ │Answer  │            │
│                                    │  │Teal    │ │Grader  │            │
│                                    │  └────────┘ └────────┘            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Agent Card Design (Dark):**
- Background: rgba(255,255,255,0.05)
- Border: 1px solid rgba(255,255,255,0.1)
- Border-radius: 16px
- Top: Colored accent bar (4px, agent color)
- Icon: 32px, agent color
- Name: 16px, white, weight 600
- Role: 13px, white/50%
- Hover: Background brightens to rgba(255,255,255,0.1), border glows with agent color, subtle scale 1.02

**Activity Simulation:**
- Random cards pulse gently (like a heartbeat) to show "active"
- Small "status dots" in top-right: green (active), amber (processing), blue (idle)
- Status changes every 2-3 seconds to simulate live swarm activity

**Scroll Animation:** Cards stagger in from edges:
- Content agents: Slide from left
- System agents: Slide from right
- Duration: 0.6s, stagger 0.08s

---

### SECTION 6: Feature Spotlight — "See the Swarm In Action"

**Layout:** Alternating rows with floating annotation cards
**Background:** White
**Padding:** 160px 0

#### Row 1: Conversational Profiling
```
[Left: Screenshot of profile chat]
[Right: Content]

Label: "FEATURE 01"
Headline: "Your Profile, Built From Conversation"
Body: "No forms. No quizzes. Just chat naturally. Our Profile 
Extractor and Gap Detector analyze every message to build 
a 6-dimension learning model — all in real-time."

Agent Badges:
[Profile Extractor] [Gap Detector]

Feature List:
✓ Knowledge base scoring (0.0-1.0 per topic)
✓ Cognitive style detection (visual / verbal / kinesthetic)
✓ Weak point identification via embedding analysis
✓ Confidence-weighted profile updates
```

**Visual Treatment:**
- Screenshot tilted with 3D perspective
- Floating badge: "6 Dimensions Analyzed" with animated count-up
- Small "confidence score" indicators floating near chat bubbles

#### Row 2: Adaptive Path Planning (Reversed)
```
[Left: Content]
[Right: Screenshot of path visualization]

Label: "FEATURE 02"
Headline: "A* Path Planning Over Knowledge Graphs"
Body: "A3 runs A* search across a knowledge graph of 500+ topics 
to find your optimal learning path. The Dynamic Adaptation 
Engine reshuffles your route based on quiz performance, 
goals, and engagement."

Agent Badges:
[Path Planner] [Recommender] [Gate Agent]

Feature List:
✓ PageRank-informed heuristics
✓ Real-time replanning on quiz events
✓ Milestone gates with unlock scoring
✓ Content-based + collaborative filtering
```

**Visual Treatment:**
- Path graph with animated node activation
- Floating metrics: "Path optimized in 200ms"
- Animated "packet" traveling along the path

#### Row 3: Multi-Agent Resource Generation
```
[Left: Screenshot of resource cards]
[Right: Content]

Label: "FEATURE 03"
Headline: "Five Agents. One Click. Instant Resources."
Body: "The Orchestrator dispatches specialized agents in parallel 
— Scholar for notes, Mapper for mind maps, Sage for quizzes, 
Director for video scripts, Architect for code. All checked 
for faithfulness before delivery."

Agent Badges:
[Orchestrator] [Scholar] [Mapper] [Sage] [Director] [Architect]

Feature List:
✓ Parallel async generation (30-60s total)
✓ Streaming progress via SSE
✓ Faithfulness verification on every output
✓ Content moderation for safety
```

**Visual Treatment:**
- Cards fan out like a hand of cards
- "Generating..." progress bars on each
- Checkmark appears as each completes

#### Row 4: Real-Time AI Tutoring (Reversed)
```
[Left: Content]
[Right: Screenshot of tutor chat with multimodal]

Label: "FEATURE 04"
Headline: "Multimodal Tutoring — Text, Voice, Image, Diagram"
Body: "Ask via text, speak your question, upload a diagram, or 
receive auto-generated Mermaid charts. The Tutor Engine 
uses RAG grounding, profile adaptation, and rolling 
context summarization for deep, contextual help."

Agent Badges:
[Tutor Engine] [Vision LLM] [ASR] [TTS] [Faithfulness Checker]

Feature List:
✓ Streaming SSE responses
✓ Voice input (iFlytek WebSocket)
✓ Voice output (Edge-TTS + caching)
✓ Image analysis (GPT-4o / Claude / Gemini)
✓ Auto-generated Mermaid diagrams
✓ Rolling context with LLM summarization
```

**Visual Treatment:**
- Chat interface with image preview
- Waveform animation for voice
- Mermaid diagram rendering inline

#### Row 5: Assessment & Analytics
```
[Left: Screenshot of analytics dashboard]
[Right: Content]

Label: "FEATURE 05"
Headline: "Assessment That Adapts With You"
Body: "Adaptive quizzes, automated grading (code + short answer), 
gate-based milestone unlocking, and comprehensive analytics. 
The Evaluator Agent identifies weak topics and triggers 
remedial resource generation automatically."

Agent Badges:
[Quiz Agent] [Coding Grader] [SA Grader] [Evaluator] [Gate Agent]

Feature List:
✓ Dynamic difficulty based on mastery
✓ Judge0 sandbox for code execution
✓ LLM-based short answer evaluation
✓ Gate scoring (completion × quiz × engagement)
✓ Behavioral signal tracking
```

---

### SECTION 7: Interactive Demo — "Talk to the Swarm"

**Layout:** Centered, contained
**Background:** Living mesh gradient (subtle)
**Padding:** 160px 0

```
Headline: "Experience the Swarm"
Subheadline: "Ask anything. Watch 15+ agents collaborate in real-time."

┌─────────────────────────────────────────────────────────┐
│  A3 Swarm                                    [● Live]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  👋 Hi! I'm your AI learning swarm. Ask me about:       │
│     Docker, Kubernetes, System Design, or anything!     │
│                                                         │
│  [What is Docker?]  [Explain K8s pods]  [Load Balancing]│
│                                                         │
│  [_______________________________________] [Ask →]    │
│                                                         │
└─────────────────────────────────────────────────────────┘

"No signup • 3 free questions • See agent activity in real-time"
```

**Demo Enhancements:**
- Below the chat widget, show a "Swarm Activity" panel:
  - Real-time agent status (who's working on the response)
  - "Tutor Engine: Retrieving context..."
  - "Faithfulness Checker: Verifying claims..."
  - Progress bars for agent collaboration

---

### SECTION 8: Metrics — "By The Numbers"

**Layout:** Full width
**Background:** Sand
**Padding:** 120px 0

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│                 │                 │                 │                 │
│      15+        │      10K+       │     500+        │     200ms       │
│                 │                 │                 │                 │
│  AI Agents      │  Active         │  Knowledge      │  Path Plan      │
│  Collaborating  │  Learners       │  Graph Nodes    │  Generation     │
│                 │                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Animation:** Count up from 0 when scrolled into view.

---

### SECTION 9: Testimonials — "Voices"

**Layout:** Horizontal carousel
**Background:** White
**Padding:** 160px 0

```
Label: "VOICES"
Headline: "Loved by Learners Worldwide"

Cards with:
- Quote in Playfair Display, 24px, italic
- 5-star rating
- Avatar with agent-colored ring (shows their dominant learning style)
- Name + role
```

---

### SECTION 10: Pricing — "Simple & Fair"

**Layout:** 3-column grid
**Background:** Sand
**Padding:** 160px 0

```
Label: "PRICING"
Headline: "Access the Swarm"

Free ($0):        Core swarm agents, 5 chats/day, basic paths
Pro ($12/mo):     Full swarm access, unlimited, advanced analytics
Team ($29/user):  Everything + team analytics, shared resources, SSO
```

---

### SECTION 11: FAQ

**Layout:** Centered accordion
**Background:** White
**Padding:** 120px 0

Questions updated to reflect swarm architecture:
- "What makes A3 different from ChatGPT?"
- "How do the 15+ agents work together?"
- "Can I see which agents are active?"
- "Is my data used to train AI models?"
- "How accurate is the faithfulness checker?"

---

### SECTION 12: Final CTA — "Join the Swarm"

**Layout:** Centered, immersive
**Height:** 80vh
**Background:** Dark charcoal + particle network

```
Headline (Playfair Display, 64px, white):
"Ready to Learn Smarter?"

Subheadline (white/80%):
"Your personal swarm of 15+ AI agents is waiting."

[Email Input] [Get Started Free]

"No credit card • Free forever tier • Full swarm access"
```

**Background:** Particle network (same as hero but on dark). Particles are agent-colored dots.

---

### SECTION 13: Footer

**Background:** #1A1D1F
**Padding:** 80px 0 40px

Standard multi-column footer with product/resources/company/legal links.

---

## 5. Special Effects

### 5.1 Agent Pulse Effect

```css
@keyframes agent-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--agent-color), 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(var(--agent-color), 0); }
}

.agent-active {
  animation: agent-pulse 2s infinite;
}
```

### 5.2 Data Packet Travel

Small dots travel along connection lines between agents:
- Duration: 1.5s
- Easing: ease-in-out
- Color: Matches source agent
- Trail: 2-3px fade behind

### 5.3 Scroll Progress

Thin line at top: `linear-gradient(90deg, #7C9A6B, #1ABC9C)`

### 5.4 Cursor Spotlight (Dark Sections)

```css
background: radial-gradient(
  600px circle at var(--mouse-x) var(--mouse-y),
  rgba(124,154,107,0.1),
  transparent 40%
);
```

---

## 6. Responsive Design

### Mobile (< 768px)
- Hero: Single column, swarm visualization simplified to static image
- Agent Swarm section: 2-column grid instead of categorized layout
- Feature rows: Stack vertically
- Interactive demo: Full-width widget
- Particle count reduced to 20

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: opacity 0.2s !important; }
}
```

---

## 7. Asset Checklist

| Asset | Description | Priority |
|-------|-------------|----------|
| A3 Logo SVG | Animated orbiting dot | High |
| Swarm Canvas | Particle network implementation | High |
| Agent Icons | 15+ unique icons for each agent | High |
| Notebook Screenshot | Chat with multimodal | High |
| Path Graph Screenshot | Visual node graph | High |
| Resource Cards Screenshot | 5 agent outputs | High |
| Analytics Dashboard | Progress visualization | Medium |
| Testimonial Avatars | 6 photos | Medium |
| Company/Uni Logos | 8 grayscale | Medium |

---

## 8. Animation Timing

| Animation | Duration | Easing |
|-----------|----------|--------|
| Page load stagger | 100ms between | power2.out |
| Scroll reveal | 0.8s | power3.out |
| Card hover | 0.4s | cubic-bezier(0.23,1,0.32,1) |
| Text scramble | 1.5s | linear |
| Number count | 2.0s | power2.out |
| Orbit rotation | 15-20s | linear |
| Data packet | 1.5s | ease-in-out |
| Agent pulse | 2s | ease-in-out |
| Mesh gradient | 15s | linear |

---

*This landing page showcases the full power of the A3 Agent Swarm — 15+ specialized agents collaborating to create the most personalized learning experience ever built.*
