"""
RAG Indexing Pipeline for A3 Learning System.

Processes text files from reference data, chunks content,
generates embeddings via OpenRouter, and stores in Weaviate.
"""

import hashlib
import os
from pathlib import Path
from typing import Dict, List, Optional

from core.llm_client import llm_client
from core.logging import get_logger
from rag.vector_store import get_vector_store

logger = get_logger(__name__)

# Chunking parameters
DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 50


def chunk_text(text: str, chunk_size: int = DEFAULT_CHUNK_SIZE, overlap: int = DEFAULT_CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk.strip())
        start = end - overlap
        if start >= len(text):
            break

    return chunks


def load_text_files(directory: Path) -> Dict[str, str]:
    """Load all .txt files from a directory."""
    texts = {}
    if not directory.exists():
        logger.warning(f"Directory not found: {directory}")
        return texts

    for file_path in directory.glob("*.txt"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                texts[file_path.stem] = f.read()
        except Exception as e:
            logger.warning(f"Failed to read {file_path}: {e}")

    logger.info(f"Loaded {len(texts)} text files from {directory}")
    return texts


async def index_text_files(
    source_dir: Path,
    node_id_mapping: Optional[Dict[str, str]] = None,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
) -> int:
    """Index all text files from source directory into vector store.

    Args:
        source_dir: Directory containing .txt files
        node_id_mapping: Map of filename stem to knowledge graph node_id
        chunk_size: Max characters per chunk
        chunk_overlap: Overlap between consecutive chunks

    Returns:
        Number of chunks indexed
    """
    from core.config import settings

    texts = load_text_files(source_dir)
    if not texts:
        return 0

    store = get_vector_store()
    if hasattr(store, "init_schema"):
        store.init_schema()

    total_chunks = 0
    all_chunks = []
    all_embeddings = []

    for filename, text in texts.items():
        chunks = chunk_text(text, chunk_size, chunk_overlap)
        if not chunks:
            continue

        node_id = node_id_mapping.get(filename, filename) if node_id_mapping else filename

        chunk_dicts = []
        for i, chunk_text_content in enumerate(chunks):
            chunk_id = hashlib.md5(f"{node_id}:{i}:{chunk_text_content[:50]}".encode()).hexdigest()
            chunk_dicts.append({
                "chunk_id": chunk_id,
                "node_id": node_id,
                "course_id": "cloud-computing",
                "text": chunk_text_content,
                "source": filename,
                "chunk_index": i
            })

        # Generate embeddings in batches
        try:
            embeddings = await llm_client.get_embeddings([c["text"] for c in chunk_dicts])
            all_chunks.extend(chunk_dicts)
            all_embeddings.extend(embeddings)
            total_chunks += len(chunk_dicts)
            logger.info(f"Indexed {len(chunk_dicts)} chunks for {filename}")
        except Exception as e:
            logger.error(f"Failed to embed chunks for {filename}: {e}")

    # Store all chunks
    if all_chunks:
        store.add_chunks(all_chunks, all_embeddings)

    logger.info(f"RAG indexing complete: {total_chunks} total chunks")
    return total_chunks


async def index_course_content(course_id: str = "cloud-computing"):
    """Index all course content for a given course."""
    reference_txt_dir = Path(
        "D:/Main project/A3 Summer Project/多源异构资源的云计算课程知识图谱研究/代码/txt"
    )

    # Load knowledge graph to map titles to node IDs
    kg_path = Path("D:/Main project/A3 Summer Project/a3-system/data/knowledge_graph.json")
    node_id_mapping = {}
    if kg_path.exists():
        import json
        with open(kg_path, "r", encoding="utf-8") as f:
            kg = json.load(f)
        for node in kg.get("nodes", []):
            # Map various filename patterns to node_id
            node_id_mapping[node["title"]] = node["node_id"]
            # Also map common aliases
            aliases = [node["title"].replace("_sougou", ""), node["title"].replace("_", "")]
            for alias in aliases:
                node_id_mapping[alias] = node["node_id"]

    total = await index_text_files(reference_txt_dir, node_id_mapping)
    return total


def main():
    """CLI entry point for RAG indexing."""
    import asyncio
    asyncio.run(index_course_content())


if __name__ == "__main__":
    main()
