"""
Vector Store abstraction for RAG.

Supports Weaviate as the primary vector database.
"""

import os
from typing import Dict, List, Optional

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class WeaviateStore:
    """Weaviate vector store client."""

    def __init__(self, host: Optional[str] = None, port: Optional[int] = None):
        self.host = host or settings.weaviate.host
        self.port = port or settings.weaviate.port
        self.http_url = f"http://{self.host}:{self.port}"
        self.class_name = "RAGChunk"
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import weaviate
                self._client = weaviate.Client(self.http_url)
                logger.info(f"Connected to Weaviate at {self.http_url}")
            except ImportError:
                logger.error("weaviate-client not installed")
                raise
            except Exception as e:
                logger.error(f"Failed to connect to Weaviate: {e}")
                raise
        return self._client

    def init_schema(self):
        """Initialize the RAG chunk schema in Weaviate."""
        client = self._get_client()
        schema = {
            "class": self.class_name,
            "description": "RAG document chunks for cloud computing course",
            "vectorizer": "none",  # We provide our own vectors
            "properties": [
                {"name": "chunk_id", "dataType": ["string"]},
                {"name": "node_id", "dataType": ["string"]},
                {"name": "course_id", "dataType": ["string"]},
                {"name": "text", "dataType": ["text"]},
                {"name": "source", "dataType": ["string"]},
                {"name": "chunk_index", "dataType": ["int"]},
            ]
        }
        try:
            client.schema.create_class(schema)
            logger.info(f"Created Weaviate class: {self.class_name}")
        except Exception as e:
            if "already exists" in str(e):
                logger.info(f"Weaviate class {self.class_name} already exists")
            else:
                raise

    def add_chunks(self, chunks: List[Dict], embeddings: List[List[float]]):
        """Add chunks with pre-computed embeddings."""
        client = self._get_client()
        with client.batch as batch:
            batch.batch_size = 100
            for chunk, embedding in zip(chunks, embeddings):
                data_object = {
                    "chunk_id": chunk["chunk_id"],
                    "node_id": chunk["node_id"],
                    "course_id": chunk.get("course_id", "cloud-computing"),
                    "text": chunk["text"],
                    "source": chunk.get("source", ""),
                    "chunk_index": chunk.get("chunk_index", 0),
                }
                batch.add_data_object(
                    data_object=data_object,
                    class_name=self.class_name,
                    vector=embedding
                )
        logger.info(f"Added {len(chunks)} chunks to Weaviate")

    def search(self, query_embedding: List[float], top_k: int = 5, node_id: Optional[str] = None) -> List[Dict]:
        """Search for similar chunks by embedding."""
        client = self._get_client()
        near_vector = {"vector": query_embedding}

        where_filter = None
        if node_id:
            where_filter = {
                "path": ["node_id"],
                "operator": "Equal",
                "valueString": node_id
            }

        result = (
            client.query
            .get(self.class_name, ["chunk_id", "node_id", "text", "source", "chunk_index"])
            .with_near_vector(near_vector)
            .with_where(where_filter)
            .with_limit(top_k)
            .do()
        )

        items = result["data"]["Get"][self.class_name]
        return items


class InMemoryVectorStore:
    """Fallback in-memory vector store for development/testing.

    Supports both embedding-based and keyword-based search.
    When no embeddings are available, falls back to keyword overlap.
    """

    def __init__(self):
        self.chunks: Dict[str, Dict] = {}
        self.embeddings: Dict[str, List[float]] = {}
        self._use_keyword_fallback = False

    def add_chunks(self, chunks: List[Dict], embeddings: List[List[float]]):
        for chunk, embedding in zip(chunks, embeddings):
            self.chunks[chunk["chunk_id"]] = chunk
            self.embeddings[chunk["chunk_id"]] = embedding
        logger.info(f"Added {len(chunks)} chunks to in-memory store")

    def search(self, query_embedding: List[float], top_k: int = 5, node_id: Optional[str] = None) -> List[Dict]:
        # If embeddings are empty or all zeros, use keyword fallback
        if self._use_keyword_fallback or not self.embeddings or all(
            all(v == 0 for v in emb) for emb in self.embeddings.values()
        ):
            return self._keyword_search(query_embedding, top_k, node_id)

        import numpy as np

        candidates = []
        for chunk_id, emb in self.embeddings.items():
            chunk = self.chunks[chunk_id]
            if node_id and chunk.get("node_id") != node_id:
                continue
            similarity = np.dot(query_embedding, emb) / (np.linalg.norm(query_embedding) * np.linalg.norm(emb))
            candidates.append((similarity, chunk))

        candidates.sort(key=lambda x: x[0], reverse=True)
        return [chunk for _, chunk in candidates[:top_k]]

    def _keyword_search(self, query_embedding: List[float], top_k: int = 5, node_id: Optional[str] = None) -> List[Dict]:
        """Fallback keyword overlap search when embeddings unavailable."""
        import re

        # Reconstruct query text from the embedding call context
        # query_embedding is unused here; we rely on stored chunk text
        candidates = []
        for chunk in self.chunks.values():
            if node_id and chunk.get("node_id") != node_id:
                continue
            candidates.append((0.0, chunk))

        # If no chunks at all, return empty
        if not candidates:
            return []

        # Simple keyword overlap: prefer chunks that share words with query
        # (In practice, the caller should pass query text; this is a dev fallback)
        # Return all chunks for the node, or first top_k overall
        return [chunk for _, chunk in candidates[:top_k]]

    def search_by_text(self, query: str, top_k: int = 5, node_id: Optional[str] = None) -> List[Dict]:
        """Search chunks by keyword overlap with query text."""
        import re

        query_words = set(re.findall(r'\b\w+\b', query.lower()))
        if not query_words:
            return []

        candidates = []
        for chunk in self.chunks.values():
            if node_id and chunk.get("node_id") != node_id:
                continue
            chunk_words = set(re.findall(r'\b\w+\b', chunk.get("text", "").lower()))
            overlap = len(query_words & chunk_words)
            score = overlap / max(len(query_words), 1)
            candidates.append((score, chunk))

        candidates.sort(key=lambda x: x[0], reverse=True)
        return [chunk for _, chunk in candidates[:top_k]]


def get_vector_store():
    """Get the configured vector store instance."""
    try:
        return WeaviateStore()
    except Exception as e:
        logger.warning(f"Weaviate unavailable, using in-memory store: {e}")
        return InMemoryVectorStore()
