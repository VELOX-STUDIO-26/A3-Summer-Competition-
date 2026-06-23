# Final Round Extra Submissions

## NOBOGYAN - A3 Summer Competition

**Version:** 1.0  
**Date:** 2026-06-18  
**Team:** VELOX STUDIO

---

## 1. Hard-Copy Printed Bound Version

### Contents

| Section | Pages | Format |
|---------|-------|--------|
| Cover Page | 1 | A4, color |
| Table of Contents | 1 | A4, black & white |
| Project Design Specification | 15-20 | A4, color diagrams |
| Deployment Manual | 5-8 | A4, black & white |
| Team Information | 1-2 | A4, black & white |
| Architecture Diagrams | 3-5 | A4, color |
| API Documentation | 5-10 | A4, black & white |
| Test Results | 3-5 | A4, black & white |
| Appendices | 2-3 | A4, black & white |
| **Total** | **35-50** | **A4 bound** |

### Binding Specifications
- **Format**: A4 (210mm x 297mm)
- **Binding**: Perfect bound or spiral bound
- **Cover**: Color printed, laminated
- **Paper**: 80gsm white for content, 250gsm for cover
- **Print**: Color for diagrams, B&W for text

---

## 2. Live Offline Demo Environment

### Hardware Requirements

| Component | Specification | Quantity |
|-----------|--------------|----------|
| Laptop | Intel i7 / AMD Ryzen 7, 16GB RAM, SSD | 1 |
| OR Server | 4-core CPU, 16GB RAM, 100GB SSD | 1 |

### Software Setup

```bash
# Pre-configured environment
docker-compose up -d  # PostgreSQL + Redis + Weaviate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
npm run build
npm start
```

### Pre-Loaded Data
- Sample student profiles (3)
- Sample learning paths (2)
- Sample quiz attempts (10)
- Sample tutor conversations (5)

### Demo Script

1. **Onboarding** (2 min)
   - Register new account
   - Complete conversational profiling
   - Review profile summary

2. **Path Generation** (1 min)
   - Enter subject
   - Preview generated path
   - Start learning

3. **Notebook** (3 min)
   - Show resource cards
   - Interact with mind map
   - Take a quiz

4. **AI Tutor** (2 min)
   - Ask a question
   - Show streaming response
   - Demonstrate diagram generation

5. **Analytics** (1 min)
   - Show dashboard
   - Highlight insights

---

## 3. Live Defense Presentation

### Presentation Structure (5-8 minutes)

| Section | Time | Content |
|---------|------|---------|
| Introduction | 1 min | Team, project, problem |
| Architecture | 2 min | System design, multi-agent pattern |
| Demo | 3 min | Live walkthrough |
| Innovation | 1 min | Key technical highlights |
| Q&A | 2-3 min | Judge questions |

### Q&A Preparation

#### Anticipated Questions

**Q: How do you handle LLM hallucinations?**
A: Every agent output passes through a faithfulness checker that extracts claims and verifies them against RAG sources. Scores below 0.8 trigger a warning. We also have a content moderator for harmful content.

**Q: What makes your multi-agent approach better than a single LLM call?**
A: Parallel generation is faster, profile-driven selection ensures relevance, and the orchestrator can adapt which agents run based on the student's needs. A single prompt would be too large and less targeted.

**Q: How do you ensure the learning path is valid?**
A: A* search with dependency satisfaction checking. All hard prerequisites must be completed before a node is unlocked. We also validate the graph structure during generation.

**Q: What happens if the LLM API is unavailable?**
A: We have OpenRouter as a fallback with automatic key rotation. For critical paths, we cache generated content. The system degrades gracefully — showing cached content rather than failing.

**Q: How do you handle concurrent users?**
A: Docker Compose for development, Kubernetes for production. The backend uses async/await with semaphore-based concurrency limiting. PostgreSQL handles concurrent connections.

**Q: What's your business model?**
A: Freemium — 3 free knowledge graph generations per subject, then paid. Premium users get unlimited generations, advanced analytics, and priority support.

---

## 4. Intellectual Property Statement

### Plagiarism Self-Declaration

**We, the undersigned members of VELOX STUDIO, declare that:**

1. This project is our original work
2. All code has been written by team members
3. All third-party libraries are properly licensed (MIT, Apache 2.0, etc.)
4. All data used is either public domain or properly licensed
5. We have not plagiarized any part of this project

### Third-Party Dependencies

| Library | License | Usage |
|---------|---------|-------|
| FastAPI | MIT | Backend framework |
| Next.js | MIT | Frontend framework |
| React | MIT | UI library |
| Tailwind CSS | MIT | Styling |
| Framer Motion | MIT | Animations |
| Recharts | MIT | Charts |
| SQLAlchemy | MIT | ORM |
| Alembic | MIT | Migrations |
| pytest | MIT | Testing |
| Kimi (Moonshot) | Commercial | LLM API |
| iFlytek | Commercial | ASR/TTS API |

### Open Source Contributions

This project uses and contributes to the following open-source projects:
- FastAPI community
- Next.js community
- Tailwind CSS community

---

*Document Version: 1.0 | Generated: 2026-06-18*
