---
name: rag-indexer
description: Index text documents into a vector database (Weaviate/Chroma) for Retrieval-Augmented Generation (RAG). Use this skill when you need to process text files, chunk them into appropriate sizes, generate embeddings, and store them in a vector database for semantic search. Essential for building the knowledge base for AI tutors and adaptive learning systems.
---

# RAG Indexer

Indexes text documents into a vector database for semantic retrieval.

## When to use this skill

Use this skill when you need to:
1. Process text documents (PDF, TXT, DOCX) into chunks for RAG
2. Generate embeddings using OpenRouter, OpenAI, or local models
3. Index documents into Weaviate or Chroma vector database
4. Search indexed documents using semantic similarity
5. Update or delete indexed documents
6. Export/backup indexed data

## Prerequisites

- Python 3.10+
- Weaviate or ChromaDB running locally or via cloud
- API key for embedding service (OpenRouter recommended for free tier)

## Input data format

The indexer expects documents organized as follows:

```
documents/
├── node_01/
│   ├── source_1.txt
│   └── source_2.txt
├── node_02/
│   └── content.txt
└── metadata.json
```

`metadata.json` format:
```json
{
  "node_01": {
    "node_id": "N01",
    "title": "云计算概述",
    "topic_tags": ["overview", "fundamentals"],
    "content_types": ["text", "diagram"]
  }
}
```

## Usage steps

### Step 1: Configure environment

Create `.env` file:

```bash
# OpenRouter (Free tier - recommended for development)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Vector Database
WEAVIATE_URL=http://localhost:8080
# or
CHROMA_PERSIST_DIR=./chroma_db

# Chunking settings
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

### Step 2: Start vector database

Using Weaviate with Docker:

```bash
docker-compose up -d weaviate
```

Using Chroma (in-memory or persistent):

```python
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
```

### Step 3: Index documents

Run the indexing script:

```bash
python -m scripts.index_documents \
  --docs-dir ./documents \
  --db-type weaviate \
  --embedding-provider openrouter \
  --class-name KnowledgeChunk
```

This will:
1. Read all text files from `documents/`
2. Chunk text into 512-token segments with 50-token overlap
3. Generate embeddings via OpenRouter
4. Store in Weaviate with metadata (node_id, content_type, source, etc.)

### Step 4: Search indexed documents

```python
from core.rag_client import RAGClient

rag = RAGClient()
results = rag.search(
    query="What is Docker containerization?",
    node_filter="N05",  # Optional: filter by node_id
    top_k=5
)

for result in results:
    print(f"Score: {result.score}")
    print(f"Text: {result.text}")
    print(f"Source: {result.metadata.source}")
```

### Step 5: Update or delete documents

Update chunks for a specific node:

```bash
python -m scripts.update_node \
  --node-id N05 \
  --docs-dir ./documents/node_05 \
  --db-type weaviate
```

Delete all chunks for a node:

```bash
python -m scripts.delete_node \
  --node-id N05 \
  --db-type weaviate
```

## Chunking strategies

### Fixed-size chunking (default)
- Size: 512 tokens
- Overlap: 50 tokens
- Good for: General text, mixed content
- Pros: Simple, consistent embedding sizes
- Cons: May split mid-sentence or mid-concept

### Semantic chunking (advanced)
- Split on semantic boundaries (paragraphs, sections)
- Dynamic size based on content coherence
- Good for: Well-structured documents with clear sections
- Pros: Preserves context, better semantic coherence
- Cons: Variable embedding sizes, more complex

### Configuring chunking

```python
from core.chunker import Chunker

# Fixed-size (default)
chunker = Chunker(
    strategy="fixed",
    chunk_size=512,
    chunk_overlap=50
)

# Semantic
chunker = Chunker(
    strategy="semantic",
    min_chunk_size=200,
    max_chunk_size=1000
)
```

## Embedding providers

### OpenRouter (recommended for free tier)
- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Dimensions: 384
- Cost: Free tier available
- Rate limits: Reasonable for development

### OpenAI
- Model: `text-embedding-3-small`
- Dimensions: 1536
- Cost: Pay per token
- Pros: Higher quality, more dimensions

### Local (no API)
- Model: `sentence-transformers/all-MiniLM-L6-v2` (local)
- Pros: No API key, no rate limits, free forever
- Cons: Requires local setup, slower for large datasets

### Configuring embedding provider

```python
from core.embedder import Embedder

# OpenRouter (default)
embedder = Embedder(
    provider="openrouter",
    api_key=os.getenv("OPENROUTER_API_KEY"),
    model="sentence-transformers/all-MiniLM-L6-v2"
)

# OpenAI
embedder = Embedder(
    provider="openai",
    api_key=os.getenv("OPENAI_API_KEY"),
    model="text-embedding-3-small"
)

# Local
embedder = Embedder(
    provider="local",
    model="sentence-transformers/all-MiniLM-L6-v2",
    device="cpu"  # or "cuda" if GPU available
)
```

## Vector database options

### Weaviate
- **Best for:** Production deployments, complex queries, hybrid search
- **Pros:** GraphQL interface, semantic + keyword search, scalable
- **Cons:** More complex setup, requires Docker or cloud instance
- **Use when:** You need production-grade RAG with filtering, complex metadata queries

### Chroma
- **Best for:** Development, simple deployments, local testing
- **Pros:** Simple Python API, persistent storage, easy setup
- **Cons:** Less query flexibility, not as scalable
- **Use when:** Quick prototyping, smaller datasets (<100k documents), local development

### Quick reference: Weaviate vs Chroma

| Feature | Weaviate | Chroma |
|---------|----------|--------|
| Setup complexity | Medium (Docker) | Low (pip install) |
| Query language | GraphQL | Python API |
| Hybrid search | Built-in | Requires manual implementation |
| Metadata filtering | Advanced | Basic |
| Scalability | High | Medium |
| Best for | Production | Development |

## Troubleshooting

### Connection errors to vector database

**Weaviate:**
```bash
# Check if Weaviate is running
curl http://localhost:8080/v1/.well-known/live

# Check Docker container
docker ps | grep weaviate

# Restart if needed
docker-compose restart weaviate
```

**Chroma:**
```python
# Check if persist directory exists
import os
print(os.path.exists("./chroma_db"))

# List collections
from chromadb import PersistentClient
client = PersistentClient(path="./chroma_db")
print(client.list_collections())
```

### Embedding API errors

**OpenRouter rate limit:**
- Wait and retry (exponential backoff)
- Use smaller batch sizes for embedding calls
- Consider caching embeddings for duplicate content

**API key issues:**
```bash
# Check if key is set
echo $OPENROUTER_API_KEY

# Test the key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/auth/key
```

### Chunking issues

**Chunks too large:**
- Reduce `chunk_size` (try 256 or 384)
- Increase `chunk_overlap` for better context preservation

**Chunks split mid-sentence:**
- Use semantic chunking instead of fixed-size
- Or implement sentence-aware splitting with `nltk.sent_tokenize`

### Search quality issues

**Irrelevant results:**
- Check if embeddings are normalized
- Try different embedding models
- Add metadata filtering to narrow search

**Missing relevant results:**
- Increase `top_k` parameter
- Check if content was properly indexed
- Verify chunk size isn't too small (losing context)

## Best practices

1. **Always validate before indexing:** Run `validate_input` before large indexing jobs
2. **Use batching:** Don't index one document at a time — batch for efficiency
3. **Monitor token usage:** Embeddings cost tokens — track usage for cost management
4. **Keep backups:** Export indexed data periodically with `export_collection`
5. **Test search quality:** Periodically test with known queries to ensure retrieval quality
6. **Version your graph:** When updating nodes, create a new version rather than overwriting
7. **Document manual changes:** If you manually edit the graph, document why for future reference

## Integration with A* Planner

The generated `knowledge_graph.json` is directly usable by the A* planner:

```python
from knowledge_graph import KnowledgeGraph
from adaptive_path_planner import AdaptivePathPlanner

# Load the knowledge graph
kg = KnowledgeGraph("knowledge_graph.json")

# Create planner with student profile
planner = AdaptivePathPlanner(kg, student_profile)

# Generate learning path
path = planner.plan(
    start_nodes={"N01"},
    goal_id="N20"
)
```

See `A-algorithm.md` for the full A* planner implementation.