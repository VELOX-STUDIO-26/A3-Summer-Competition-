"""
Knowledge Graph Loader for A3 Learning System.

Parses reference data from the cloud computing knowledge graph research project
and generates a structured knowledge_graph.json compatible with the A3 system.

Reference data sources:
- newwords.txt: 80 cloud computing keywords
- result_to_neo4j.csv: Subject-Relation-Object triples
- pagerank.csv: PageRank importance scores
- result_localData.csv: Detailed concept descriptions
"""

import csv
import json
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

# Paths to reference data
REFERENCE_DIR = Path("D:/Main project/A3 Summer Project/多源异构资源的云计算课程知识图谱研究/代码")
DATA_DIR = Path("D:/Main project/A3 Summer Project/a3-system/data")

NEWWORDS_PATH = REFERENCE_DIR / "filter" / "newwords.txt"
TRIPLES_PATH = REFERENCE_DIR / "result_to_neo4j.csv"
PAGERANK_PATH = REFERENCE_DIR / "pagerank.csv"
LOCALDATA_PATH = REFERENCE_DIR / "result_localData.csv"
OUTPUT_PATH = DATA_DIR / "knowledge_graph.json"

# Relations that indicate strong prerequisite (hard)
HARD_RELATIONS = {"是", "包含", "部署", "源于", "利用", "使用", "获得", "支持"}
# Relations that indicate weak prerequisite (soft)
SOFT_RELATIONS = {"提供", "运行", "旨在", "简单", "选择", "方便", "合称"}


def load_keywords(path: Path) -> List[str]:
    """Load keywords from newwords.txt."""
    logger.info(f"Loading keywords from {path}")
    with open(path, "r", encoding="utf-8") as f:
        keywords = [line.strip() for line in f if line.strip()]
    logger.info(f"Loaded {len(keywords)} keywords")
    return keywords


def load_triples(path: Path) -> List[Tuple[str, str, str]]:
    """Load subject-relation-object triples from CSV."""
    logger.info(f"Loading triples from {path}")
    triples = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 3:
                subject, relation, obj = row[0].strip(), row[1].strip(), row[2].strip()
                if subject and relation and obj:
                    triples.append((subject, relation, obj))
    logger.info(f"Loaded {len(triples)} triples")
    return triples


def load_pagerank(path: Path) -> Dict[str, float]:
    """Load PageRank scores: rank,concept,score."""
    logger.info(f"Loading PageRank scores from {path}")
    scores = {}
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 3:
                concept = row[1].strip()
                try:
                    score = float(row[2].strip())
                    scores[concept] = score
                except ValueError:
                    continue
    logger.info(f"Loaded {len(scores)} PageRank scores")
    return scores


def load_local_descriptions(path: Path, keywords: Set[str]) -> Dict[str, str]:
    """Load concept descriptions from localData CSV.

    Format: concept, BaiduCARD, description_text
    """
    logger.info(f"Loading local descriptions from {path}")
    descriptions = {}
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 3 and row[1].strip() == "BaiduCARD":
                concept = row[0].strip()
                desc = row[2].strip()
                if concept in keywords and desc and len(desc) > 20:
                    if concept not in descriptions or len(desc) > len(descriptions[concept]):
                        descriptions[concept] = desc
    logger.info(f"Loaded {len(descriptions)} descriptions")
    return descriptions


def build_graph(
    keywords: List[str],
    triples: List[Tuple[str, str, str]],
    pagerank: Dict[str, float],
    descriptions: Dict[str, str]
) -> Dict:
    """Build structured knowledge graph from reference data."""
    logger.info("Building knowledge graph...")

    keyword_set = set(keywords)

    # Create node ID mapping: keyword -> N01, N02, ...
    node_id_map = {}
    for i, kw in enumerate(keywords, 1):
        node_id_map[kw] = f"N{i:02d}"

    # Difficulty: derived from inverse PageRank (higher rank = more fundamental = lower difficulty)
    max_score = max(pagerank.values()) if pagerank else 1.0
    min_score = min(pagerank.values()) if pagerank else 0.0
    score_range = max_score - min_score if max_score > min_score else 1.0

    def calc_difficulty(concept: str) -> float:
        score = pagerank.get(concept, min_score)
        normalized = (score - min_score) / score_range if score_range > 0 else 0.5
        difficulty = 1.0 - normalized
        return round(difficulty, 2)

    # Build prerequisite relationships from triples
    hard_prereqs: Dict[str, Set[str]] = defaultdict(set)
    soft_prereqs: Dict[str, Set[str]] = defaultdict(set)
    related: Dict[str, Set[str]] = defaultdict(set)

    for subject, relation, obj in triples:
        if subject not in keyword_set or obj not in keyword_set:
            continue

        subj_id = node_id_map[subject]
        obj_id = node_id_map[obj]

        if relation in HARD_RELATIONS:
            hard_prereqs[subj_id].add(obj_id)
        elif relation in SOFT_RELATIONS:
            soft_prereqs[subj_id].add(obj_id)
        else:
            related[subj_id].add(obj_id)

    # Detect and remove cycles in hard prerequisites (keep DAG property)
    def has_cycle_util(node: str, visited: Set[str], rec_stack: Set[str]) -> bool:
        visited.add(node)
        rec_stack.add(node)
        for neighbor in hard_prereqs.get(node, set()):
            if neighbor not in visited:
                if has_cycle_util(neighbor, visited, rec_stack):
                    return True
            elif neighbor in rec_stack:
                return True
        rec_stack.remove(node)
        return False

    def remove_cycles():
        visited = set()
        for node in list(node_id_map.values()):
            if node not in visited:
                has_cycle_util(node, visited, set())

    remove_cycles()

    # Build nodes
    nodes = []
    for kw in keywords:
        node_id = node_id_map[kw]
        difficulty = calc_difficulty(kw)

        # Estimated minutes based on difficulty
        if difficulty < 0.3:
            est_minutes = 20
        elif difficulty < 0.6:
            est_minutes = 30
        else:
            est_minutes = 45

        # Topic tags based on related concepts
        tags = set()
        for rel in related.get(node_id, set()):
            tags.add(rel)

        # Content types based on concept type
        content_types = ["text", "diagram"]
        if "服务" in kw or "Service" in kw or "SaaS" in kw or "PaaS" in kw or "IaaS" in kw:
            content_types.append("interactive")
        if any(t in kw for t in ["Docker", "Kubernetes", "K8s", "DevOps", "代码", "Code"]):
            content_types.append("code")

        node = {
            "node_id": node_id,
            "title": kw,
            "difficulty": difficulty,
            "est_minutes": est_minutes,
            "hard_prerequisites": sorted(hard_prereqs.get(node_id, set())),
            "soft_prerequisites": sorted(soft_prereqs.get(node_id, set())),
            "topic_tags": sorted(tags)[:5],
            "content_types": sorted(set(content_types)),
            "description": descriptions.get(kw, f"学习云计算课程中的重要概念：{kw}"),
            "pagerank_score": round(pagerank.get(kw, 0.0), 4),
            "is_active": True
        }
        nodes.append(node)

    # Build edges list
    edges = []
    edge_set = set()
    for subject, relation, obj in triples:
        if subject not in keyword_set or obj not in keyword_set:
            continue
        subj_id = node_id_map[subject]
        obj_id = node_id_map[obj]
        edge_key = (subj_id, obj_id, relation)
        if edge_key not in edge_set:
            edge_set.add(edge_key)
            edges.append({
                "source": subj_id,
                "target": obj_id,
                "relation": relation,
                "type": "hard" if relation in HARD_RELATIONS else "soft"
            })

    graph = {
        "course_id": "cloud-computing",
        "course_name": "Cloud Computing Fundamentals",
        "description": "Comprehensive cloud computing course covering virtualization, containers, orchestration, and cloud services",
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "nodes": nodes,
        "edges": edges
    }

    logger.info(f"Built graph with {len(nodes)} nodes and {len(edges)} edges")
    return graph


def save_graph(graph: Dict, path: Path):
    """Save knowledge graph to JSON file."""
    logger.info(f"Saving knowledge graph to {path}")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)
    logger.info("Knowledge graph saved successfully")


async def load_into_database(graph: Dict):
    """Load knowledge graph nodes into the PostgreSQL database."""
    import asyncio

    from sqlalchemy.ext.asyncio import AsyncSession

    from core.database_init import init_database
    from models.database import DatabaseManager, KnowledgeNode, db_manager

    logger.info("Loading knowledge graph into database...")

    db_manager.initialize()

    async with db_manager.async_engine.begin() as conn:
        from models.database import Base
        await conn.run_sync(Base.metadata.create_all)

    async with await db_manager.get_async_session() as session:
        for node_data in graph["nodes"]:
            existing = await session.get(KnowledgeNode, node_data["node_id"])
            if existing:
                logger.debug(f"Node {node_data['node_id']} already exists, skipping")
                continue

            node = KnowledgeNode(
                node_id=node_data["node_id"],
                course_id=graph["course_id"],
                title=node_data["title"],
                difficulty=node_data["difficulty"],
                est_minutes=node_data["est_minutes"],
                hard_prerequisites=node_data["hard_prerequisites"],
                soft_prerequisites=node_data["soft_prerequisites"],
                topic_tags=node_data["topic_tags"],
                content_types=node_data["content_types"],
                description=node_data["description"],
                is_active=True
            )
            session.add(node)

        await session.commit()

    logger.info(f"Loaded {len(graph['nodes'])} nodes into database")


def main():
    """Main entry point for knowledge graph loading."""
    if not NEWWORDS_PATH.exists():
        logger.error(f"Keywords file not found: {NEWWORDS_PATH}")
        return

    if not TRIPLES_PATH.exists():
        logger.error(f"Triples file not found: {TRIPLES_PATH}")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    keywords = load_keywords(NEWWORDS_PATH)
    triples = load_triples(TRIPLES_PATH)
    pagerank = load_pagerank(PAGERANK_PATH)
    descriptions = load_local_descriptions(LOCALDATA_PATH, set(keywords))

    graph = build_graph(keywords, triples, pagerank, descriptions)
    save_graph(graph, OUTPUT_PATH)

    print(f"Knowledge graph generated: {OUTPUT_PATH}")
    print(f"  Nodes: {graph['total_nodes']}")
    print(f"  Edges: {graph['total_edges']}")

    # Optionally load into database
    if "--load-db" in sys.argv:
        import asyncio
        asyncio.run(load_into_database(graph))
        print("Loaded into database successfully")


if __name__ == "__main__":
    main()
