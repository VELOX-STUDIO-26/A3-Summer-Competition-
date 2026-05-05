# Embedding Strategy — Future Migration to iFlytek AI

**Date:** 2026-04-27
**Status:** Development workaround in place, production migration planned

---

## Current Situation (Development)

### Why We Are Not Using Neural Embeddings Now

1. **OpenRouter free tier has no embedding models**
   - Verified: 360 models available, zero free embedding endpoints
   - All tested models return `402 Payment Required`:
     - `sentence-transformers/all-MiniLM-L6-v2`
     - `openai/text-embedding-3-small`
     - `nvidia/llama-nemotron-embed-v2:free`

2. **Local embedding installation failed on Windows**
   - `sentence-transformers` requires PyTorch + transformers (~200MB+)
   - Installation blocked by Windows setuptools permission conflict
   - Will work fine in Linux/Docker containers

3. **Current Fallback**
   - `InMemoryVectorStore.search_by_text()` uses keyword overlap
   - `TutorEngine._retrieve_chunks()` tries embeddings first, then falls back automatically
   - Functional for development and demo purposes

---

## Production Plan: iFlytek Spark Embeddings

**Target:** Switch to iFlytek Spark embedding API for competition submission

### Why iFlytek

- Competition sponsor (Track A3)
- Provides both LLM and embedding APIs
- Expected to have stable Chinese/English embedding models
- Required by competition specifications

### Implementation Tasks

- [ ] Register iFlytek Spark API credentials at [open.xfyun.cn](https://open.xfyun.cn)
- [ ] Obtain embedding model endpoint (e.g., ` Spark Embedding API`)
- [ ] Update `core/llm_client.py`:
  - Add `iFlytekEmbeddingClient` class
  - Implement `get_embeddings()` using iFlytek REST API
  - Add fallback chain: iFlytek → OpenRouter (paid) → keyword fallback
- [ ] Update `.env` with iFlytek credentials:
  ```bash
  IFLYTEK_APP_ID=your_app_id
  IFLYTEK_API_KEY=your_api_key
  IFLYTEK_API_SECRET=your_api_secret
  ```
- [ ] Test embedding quality with cloud computing course content
- [ ] Benchmark retrieval accuracy vs. keyword fallback
- [ ] Update `docker-compose.yml` to use iFlytek configs

### Code Locations to Modify

| File | Change |
|------|--------|
| `core/llm_client.py` | Add iFlytek embedding client |
| `core/config.py` | Add iFlytek settings |
| `.env` / `.env.template` | Add iFlytek credentials |
| `rag/vector_store.py` | Remove keyword fallback once embeddings work |
| `core/tutor_engine.py` | Keep fallback chain as safety net |

---

## Alternative: Local Embeddings (Docker/Linux)

If iFlytek is unavailable, run `sentence-transformers` inside the backend Docker container:

```dockerfile
# backend/Dockerfile
RUN pip install sentence-transformers
```

Model to use: `all-MiniLM-L6-v2` (384-dim, ~80MB, fast on CPU)

This gives full offline capability with no API costs.

---

## Decision Log

**Decision:** Use keyword fallback for development, migrate to iFlytek for production.

**Rationale:**
- Free tier limitations block OpenRouter embeddings
- Windows dev environment blocks local embeddings
- iFlytek is the competition-mandated provider anyway
- Keyword fallback is safe and does not block other features

**Owner:** Backend team
**Deadline:** Before Week 9 (submission preparation)
