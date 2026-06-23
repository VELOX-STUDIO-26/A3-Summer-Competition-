# Optional Supplementary Materials

## NOBOGYAN - A3 Summer Competition

**Version:** 1.0  
**Date:** 2026-06-18  
**Team:** VELOX STUDIO

---

## 1. Online Demo Access

### Web Deployment

| Environment | URL | Status |
|-------------|-----|--------|
| Frontend (Netlify) | [TBD] | 🟡 Pending |
| Backend (Railway) | [TBD] | 🟡 Pending |
| API Docs | [TBD]/docs | 🟡 Pending |

### Local Demo

```bash
# Clone and run locally
git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git
cd A3-Summer-Competition-/a3-system/backend
docker-compose up -d
pip install -r requirements.txt
uvicorn main:app --reload

# In another terminal
cd ../frontend/web
npm install
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 2. Test Report

### Test Coverage Summary

| Component | Tests | Passing | Coverage |
|-----------|-------|---------|----------|
| Path Planner | 17 | 17 | ✅ 100% |
| Adaptation Engine | 18 | 18 | ✅ 100% |
| Recommender | 14 | 14 | ✅ 100% |
| Conversation Manager | 27 | 27 | ✅ 100% |
| ASR Client | 22 | 22 | ✅ 100% |
| ASR Router | 12 | 12 | ✅ 100% |
| Faithfulness Checker | 15 | 15 | ✅ 100% |
| Content Moderator | 19 | 19 | ✅ 100% |
| Analytics Insights | 9 | 9 | ✅ 100% |
| Comparative Analytics | 8 | 8 | ✅ 100% |
| Dynamic Knowledge Graph | 24 | 24 | ✅ 100% |
| Knowledge Graph Generator | 37 | 37 | ✅ 100% |
| Graph Service | 23 | 23 | ✅ 100% |
| Hierarchical Graph Generator | 23 | 23 | ✅ 100% |
| Hierarchical Models | 20 | 20 | ✅ 100% |
| Profile Builder | 15 | 15 | ✅ 100% |
| Gap Detector | 15 | 15 | ✅ 100% |
| Orchestrator | 10 | 10 | ✅ 100% |
| **Total** | **295+** | **295+** | **✅** |

### Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| OpenRouter API key exhaustion | 🟡 Ongoing | Kimi/Moonshot primary |
| True video generation | ❌ Not implemented | Animated slides + TTS |
| Teacher dashboard | ❌ Not implemented | Student dashboard only |
| Mobile app | ❌ Not implemented | Responsive web only |

---

## 3. Design Drafts

### Digital Human Character Design

**NOBOGYAN AI Tutor Avatar:**
- **Style**: Friendly, approachable, gender-neutral
- **Colors**: Sage green (#8B9A7F) + Deep charcoal (#2D2D2D)
- **Expression**: Encouraging smile, curious eyes
- **Accessories**: Small book or lightbulb prop
- **Animation**: Subtle idle animation (blinking, head tilt)

### System Prototype Sketches

1. **Landing Page Wireframe**
   - Hero section with animated illustration
   - Feature cards (5 core features)
   - CTA buttons (Get Started, Learn More)

2. **Notebook Wireframe**
   - 3-column layout (path | resources | tutor)
   - Collapsible side panels
   - Floating action buttons

3. **Quiz Interface Wireframe**
   - Progress bar at top
   - Question card in center
   - Navigation buttons at bottom

### Campus UI Mockups

See `frontend/web/design/` for Figma exports (if available).

---

## 4. Dataset Sample Files

### Knowledge Graph Sample (JSON)

```json
{
  "node_id": "N01",
  "title": "Cloud Services",
  "difficulty": 0.61,
  "est_minutes": 45,
  "hard_prerequisites": ["N04", "N11", "N27"],
  "soft_prerequisites": [],
  "topic_tags": ["cloud", "infrastructure", "services"],
  "content_types": ["diagram", "interactive", "text"],
  "description": "Cloud services refer to infrastructure, platforms, or software hosted by third-party providers...",
  "pagerank_score": 6.3734,
  "is_active": true
}
```

### Expert Corpus Sample (JSON)

```json
{
  "topic": "docker_containers",
  "expert_answers": [
    "Docker containers are lightweight, standalone, executable packages...",
    "A container is a runtime instance of an image...",
    "Containers share the host OS kernel but have isolated filesystems..."
  ]
}
```

### Moderation Rules Sample (JSON)

```json
{
  "category": "self_harm",
  "severity": "high",
  "patterns": ["kill myself", "end my life", "suicide"],
  "action": "block",
  "refusal_message": "I'm here to help with your learning. If you're struggling, please reach out..."
}
```

---

*Document Version: 1.0 | Generated: 2026-06-18*
