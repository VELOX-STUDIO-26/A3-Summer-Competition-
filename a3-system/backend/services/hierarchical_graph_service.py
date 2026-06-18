"""
Hierarchical Graph Service (v2.1)

Handles:
- Graph creation and storage
- Subtopic progress tracking
- Resource caching
- Background generation queue
"""

import asyncio
import uuid
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select, update, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from agents.hierarchical_graph_generator import (
    HierarchicalGraphGenerator,
    HierarchicalGraphValidator,
    HierarchicalGraph,
    MainTopicNode,
    SubtopicNode,
    normalize_subject,
)
from core.logging import get_logger
from models.database import (
    HierarchicalKnowledgeGraph,
    MainTopic,
    Subtopic,
    CachedResource,
    ResourceGenerationQueue,
    StudentSubtopicProgress,
    StudentProfile,
    GenerationQuota,
    PathRating,
    PathAnalytics,
)

logger = get_logger(__name__)

MAX_FREE_GENERATIONS = 50  # Increased for development/testing


class HierarchicalGraphService:
    """Service for managing hierarchical knowledge graphs."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.generator = HierarchicalGraphGenerator()
        self.validator = HierarchicalGraphValidator()

    # ========================================================================
    # Graph Generation & Storage
    # ========================================================================

    async def generate_graph(
        self,
        subject: str,
        student_id: str,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        cognitive_style: str = "mixed",
        learning_pace: float = 0.5,
        is_premium: bool = False,
        use_template: bool = True,
        validate_quality: bool = True,
        lazy_subtopics: bool = True,
        materialize_first_milestone: bool = False,
    ) -> Tuple[HierarchicalKnowledgeGraph, bool]:
        """
        Generate a new hierarchical knowledge graph.

        Args:
            subject: Subject to learn
            student_id: Student identifier
            goals: Learning goals
            knowledge_base: Current knowledge levels
            cognitive_style: Learning style preference
            learning_pace: Pace preference (0-1)
            is_premium: Premium user flag
            use_template: If True, try to use highly-rated paths as templates
            validate_quality: If True, run quality validation on generated graph
            lazy_subtopics: If True, use two-pass generation -- plan the main
                topics (milestones) first. The milestone subtopics are then
                generated in parallel (up to 3 at a time). This is faster than
                full eager generation because each subtopic call is independent.
                If False, generate the full graph in a single LLM call.
            materialize_first_milestone: Kept for backwards compatibility. No
                longer needed since all milestones' subtopics are generated in
                parallel when lazy_subtopics=True.

        Returns:
            Tuple of (graph, is_new) where is_new indicates if a new graph was created
        """
        # Check quota
        service_start = time.perf_counter()
        can_generate, remaining = await self.can_generate(student_id, subject, is_premium)
        if not can_generate:
            raise ValueError(f"Generation quota exceeded. {remaining} generations remaining.")

        subject_normalized = normalize_subject(subject)

        # Check for existing high-quality graph first
        existing = await self.find_best_match(subject, goals)
        if existing:
            logger.info(f"Found existing graph for '{subject}': {existing.id}")
            logger.info(f"generate_graph for '{subject}' completed in {time.perf_counter() - service_start:.2f}s (existing)")
            return existing, False

        # Try to find a highly-rated template path
        template_path = None
        if use_template:
            template_path = await self._get_template_path(subject_normalized)
            if template_path:
                logger.info(f"Using template path {template_path.id} (rating: {template_path.avg_rating})")

        template_structure = self._extract_template_structure(template_path) if template_path else None

        # Generate new graph
        logger.info(f"Generating new graph for subject: '{subject}' (lazy_subtopics={lazy_subtopics})")
        try:
            if lazy_subtopics:
                # Pass 1: plan the milestones only (small, fast).
                generated = await self.generator.generate_main_topics(
                    subject=subject,
                    goals=goals,
                    knowledge_base=knowledge_base,
                    cognitive_style=cognitive_style,
                    learning_pace=learning_pace,
                    template_structure=template_structure,
                )
            else:
                generated = await self.generator.generate(
                    subject=subject,
                    goals=goals,
                    knowledge_base=knowledge_base,
                    cognitive_style=cognitive_style,
                    learning_pace=learning_pace,
                    template_structure=template_structure,
                )
        except Exception as e:
            logger.error(f"Graph generation failed with exception: {e}")
            raise ValueError(f"Graph generation failed: {str(e)}")

        if not generated.is_valid:
            logger.error(f"Generated graph is invalid. Errors: {generated.validation_errors}")
            if generated.raw_response:
                logger.debug(f"Raw LLM response (first 500 chars): {generated.raw_response[:500]}")
            raise ValueError(f"Generated graph is invalid: {', '.join(generated.validation_errors)}")

        # Run quality validation (skipped for lazy plans -- there are no
        # subtopics to validate yet, and the validator expects them).
        if validate_quality and not lazy_subtopics:
            validation_result = await self.validator.validate(generated, quick_mode=True)
            logger.info(f"Validation result: quality_score={validation_result.get('quality_score', 'N/A')}, "
                       f"overall_quality={validation_result.get('overall_quality', 'N/A')}")
            
            # Log any issues or suggestions
            for issue in validation_result.get('issues', []):
                logger.warning(f"Validation issue: [{issue['severity']}] {issue['description']}")
            for suggestion in validation_result.get('suggestions', []):
                logger.info(f"Validation suggestion: {suggestion}")

        # Store in database
        graph = await self.create_graph(generated, student_id)

        # Update quota
        await self.increment_quota(student_id, subject)

        # In lazy mode, materialize ALL milestones' subtopics in parallel.
        # This avoids N sequential LLM calls when the student clicks each
        # milestone. Uses a semaphore of 3 to avoid overwhelming the API.
        # Each subtopic generation gets its own DB session to avoid SQLAlchemy
        # async concurrency issues.
        if lazy_subtopics and graph.main_topics:
            from models.database import db_manager

            semaphore = asyncio.Semaphore(5)

            async def _materialize_one(main_topic: MainTopic) -> Tuple[str, Optional[str]]:
                async with semaphore:
                    session = await db_manager.get_async_session()
                    try:
                        parallel_service = HierarchicalGraphService(session)
                        await parallel_service.ensure_subtopics_for_topic(
                            graph_id=graph.id,
                            main_topic_node_id=main_topic.node_id,
                            student_id=None,
                            goals=goals,
                            knowledge_base=knowledge_base,
                            cognitive_style=cognitive_style,
                            learning_pace=learning_pace,
                        )
                        return main_topic.node_id, None
                    except Exception as e:
                        logger.error(f"Failed to materialize subtopics for '{main_topic.title}': {e}")
                        return main_topic.node_id, str(e)
                    finally:
                        await session.close()

            sorted_milestones = sorted(graph.main_topics, key=lambda mt: mt.order_index)
            tasks = [_materialize_one(mt) for mt in sorted_milestones]
            results = await asyncio.gather(*tasks)

            # Re-fetch so the returned graph includes all subtopics
            graph = await self.get_graph(graph.id)

            ok = sum(1 for _, err in results if err is None)
            nok = sum(1 for _, err in results if err is not None)
            logger.info(f"Parallel subtopic materialization for '{subject}': {ok}/{len(results)} milestones done, {nok} failed")

        logger.info(f"generate_graph for '{subject}' completed in {time.perf_counter() - service_start:.2f}s (new)")
        return graph, True

    async def generate_graph_stream(
        self,
        subject: str,
        student_id: str,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        cognitive_style: str = "mixed",
        learning_pace: float = 0.5,
        is_premium: bool = False,
    ):
        """
        Streaming graph generation: yields events as generation progresses.

        Yields dicts with:
        - {"event": "graph", "graph": {...}, "is_new": bool, "remaining_generations": int}
          Emitted as soon as milestones are planned (no subtopics yet).
        - {"event": "subtopics_ready", "main_topic_id": str, "main_topic_node_id": str, "subtopics": [...]}
          Emitted each time a milestone's subtopics finish generating.
        - {"event": "complete", "total_time": float}
          Emitted when all subtopics are done.
        - {"event": "error", "error": str}
          Emitted on failure.
        """
        from models.database import db_manager

        service_start = time.perf_counter()

        # Check quota
        can_generate, remaining = await self.can_generate(student_id, subject, is_premium)
        if not can_generate:
            yield {"event": "error", "error": f"Generation quota exceeded. {remaining} generations remaining."}
            return

        subject_normalized = normalize_subject(subject)

        # Check for existing graph
        existing = await self.find_best_match(subject, goals)
        if existing:
            structure = await self.get_graph_structure(existing.id)
            yield {
                "event": "graph",
                "graph": structure,
                "is_new": False,
                "remaining_generations": remaining if not is_premium else -1,
            }
            yield {"event": "complete", "total_time": time.perf_counter() - service_start}
            return

        # Try template
        template_path = await self._get_template_path(subject_normalized)
        template_structure = self._extract_template_structure(template_path) if template_path else None

        # Pass 1: Generate milestones only
        try:
            generated = await self.generator.generate_main_topics(
                subject=subject,
                goals=goals,
                knowledge_base=knowledge_base,
                cognitive_style=cognitive_style,
                learning_pace=learning_pace,
                template_structure=template_structure,
            )
        except Exception as e:
            yield {"event": "error", "error": f"Graph generation failed: {str(e)}"}
            return

        if not generated.is_valid:
            yield {"event": "error", "error": f"Generated graph is invalid: {', '.join(generated.validation_errors)}"}
            return

        # Store graph with milestones (no subtopics yet)
        graph = await self.create_graph(generated, student_id)
        await self.increment_quota(student_id, subject)

        # Update remaining
        if remaining > 0:
            remaining -= 1

        # Yield the graph immediately (milestones only, no subtopics)
        structure = await self.get_graph_structure(graph.id)
        yield {
            "event": "graph",
            "graph": structure,
            "is_new": True,
            "remaining_generations": remaining if not is_premium else -1,
        }

        # Pass 2: Generate subtopics in parallel (semaphore=5), yield each as it completes
        if graph.main_topics:
            semaphore = asyncio.Semaphore(5)
            result_queue: asyncio.Queue = asyncio.Queue()

            async def _materialize_and_enqueue(main_topic: MainTopic):
                async with semaphore:
                    session = await db_manager.get_async_session()
                    try:
                        parallel_service = HierarchicalGraphService(session)
                        refreshed = await parallel_service.ensure_subtopics_for_topic(
                            graph_id=graph.id,
                            main_topic_node_id=main_topic.node_id,
                            student_id=None,
                            goals=goals,
                            knowledge_base=knowledge_base,
                            cognitive_style=cognitive_style,
                            learning_pace=learning_pace,
                        )
                        subtopics_data = [
                            {
                                "id": str(st.id),
                                "node_id": st.node_id,
                                "title": st.title,
                                "description": st.description,
                                "order_index": st.order_index,
                                "difficulty": st.difficulty,
                                "estimated_minutes": st.estimated_minutes,
                                "learning_points": st.learning_points,
                                "topic_tags": st.topic_tags,
                                "content_types": st.content_types,
                                "prerequisites": st.prerequisites,
                            }
                            for st in (refreshed.subtopics if refreshed else [])
                        ]
                        await result_queue.put({
                            "event": "subtopics_ready",
                            "main_topic_id": str(main_topic.id),
                            "main_topic_node_id": main_topic.node_id,
                            "subtopics": subtopics_data,
                        })
                    except Exception as e:
                        logger.error(f"Stream: Failed subtopics for '{main_topic.title}': {e}")
                        await result_queue.put({
                            "event": "subtopics_ready",
                            "main_topic_id": str(main_topic.id),
                            "main_topic_node_id": main_topic.node_id,
                            "subtopics": [],
                            "error": str(e),
                        })
                    finally:
                        await session.close()

            sorted_milestones = sorted(graph.main_topics, key=lambda mt: mt.order_index)
            tasks = [asyncio.create_task(_materialize_and_enqueue(mt)) for mt in sorted_milestones]

            # Yield results as they arrive
            completed = 0
            total = len(sorted_milestones)
            while completed < total:
                result = await result_queue.get()
                yield result
                completed += 1

            # Ensure all tasks are done (they should be by now)
            await asyncio.gather(*tasks, return_exceptions=True)

        total_time = time.perf_counter() - service_start
        logger.info(f"generate_graph_stream for '{subject}' completed in {total_time:.2f}s")
        yield {"event": "complete", "total_time": total_time}

    async def _get_template_path(
        self,
        subject_normalized: str,
        min_rating: float = 4.0,
    ) -> Optional[HierarchicalKnowledgeGraph]:
        """Get a highly-rated path to use as a template."""
        query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.subject_normalized == subject_normalized,
            HierarchicalKnowledgeGraph.avg_rating >= min_rating,
            HierarchicalKnowledgeGraph.verified_by_count >= 3,
            HierarchicalKnowledgeGraph.status.in_(["popular", "curated", "user_verified"]),
        ).options(
            selectinload(HierarchicalKnowledgeGraph.main_topics).selectinload(MainTopic.subtopics)
        ).order_by(
            HierarchicalKnowledgeGraph.avg_rating.desc(),
        ).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    def _extract_template_structure(
        self,
        template: HierarchicalKnowledgeGraph,
    ) -> Optional[Dict[str, Any]]:
        """Extract structure from a template path for guiding generation."""
        if not template or not template.main_topics:
            return None

        return {
            "main_topic_titles": [mt.title for mt in template.main_topics],
            "main_topic_count": len(template.main_topics),
            "subtopics_per_topic": [len(mt.subtopics) for mt in template.main_topics],
            "difficulty_progression": [mt.difficulty for mt in template.main_topics],
            "total_estimated_minutes": template.total_estimated_minutes,
        }

    async def create_graph(
        self,
        generated: HierarchicalGraph,
        created_by: str,
    ) -> HierarchicalKnowledgeGraph:
        """Store a generated hierarchical graph in the database."""

        # For two-pass (lazy) plans the milestones carry no subtopics yet, only
        # a planned count -- surface that as the graph's expected total so the
        # UI shows a meaningful lesson count before subtopics are materialized.
        planned_total_subtopics = generated.total_subtopic_count or sum(
            getattr(m, "planned_subtopic_count", 0) for m in generated.main_topics
        )

        # Create the main graph record
        graph = HierarchicalKnowledgeGraph(
            id=uuid.uuid4(),
            subject=generated.subject,
            subject_normalized=generated.subject_normalized,
            tags=generated.tags,
            goals=[],
            difficulty_level=generated.difficulty_level,
            estimated_duration_weeks=generated.estimated_weeks,
            main_topic_count=len(generated.main_topics),
            total_subtopic_count=planned_total_subtopics,
            total_estimated_minutes=generated.total_estimated_minutes,
            times_used=0,
            times_accepted=0,
            acceptance_rate=0.0,
            avg_completion_rate=0.0,
            avg_rating=0.0,
            verified_by_count=0,
            source="llm_generated",
            status="draft",
            version=1,
            created_by=created_by,
        )
        self.db.add(graph)
        await self.db.flush()  # Get the graph ID

        # Create main topics and subtopics
        for main_node in generated.main_topics:
            main_topic = MainTopic(
                id=uuid.uuid4(),
                graph_id=graph.id,
                node_id=main_node.node_id,
                title=main_node.title,
                description=main_node.description,
                order_index=main_node.order_index,
                difficulty=main_node.difficulty,
                estimated_minutes=main_node.estimated_minutes,
                subtopic_count=len(main_node.subtopics) or getattr(main_node, "planned_subtopic_count", 0),
                prerequisites=main_node.prerequisites,
                topic_tags=main_node.topic_tags,
            )
            self.db.add(main_topic)
            await self.db.flush()

            # Create subtopics
            for sub_node in main_node.subtopics:
                subtopic = Subtopic(
                    id=uuid.uuid4(),
                    main_topic_id=main_topic.id,
                    node_id=sub_node.node_id,
                    title=sub_node.title,
                    description=sub_node.description,
                    order_index=sub_node.order_index,
                    difficulty=sub_node.difficulty,
                    estimated_minutes=sub_node.estimated_minutes,
                    learning_points=sub_node.learning_points,
                    topic_tags=sub_node.topic_tags,
                    content_types=sub_node.content_types,
                    prerequisites=sub_node.prerequisites,
                )
                self.db.add(subtopic)

        await self.db.commit()
        
        # Re-fetch the graph with all relationships loaded to ensure consistency
        query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.id == graph.id
        ).options(
            selectinload(HierarchicalKnowledgeGraph.main_topics).selectinload(MainTopic.subtopics)
        )
        result = await self.db.execute(query)
        graph = result.scalar_one()

        logger.info(f"Created hierarchical graph {graph.id} for '{generated.subject}' with {len(graph.main_topics)} main topics")
        return graph

    async def ensure_subtopics_for_topic(
        self,
        graph_id: uuid.UUID,
        main_topic_node_id: str,
        student_id: Optional[str] = None,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        cognitive_style: str = "mixed",
        learning_pace: float = 0.5,
    ) -> Optional[MainTopic]:
        """
        Pass 2 of two-pass generation: materialize a milestone's subtopics.

        Idempotent -- if the milestone already has subtopics this is a no-op and
        returns the existing main topic. Otherwise the subtopics are generated
        via the LLM, persisted, and the milestone/graph counts are updated. When
        ``student_id`` is given and the student already has progress for this
        graph, locked progress rows are created for the new subtopics so the
        existing progression logic keeps working.
        """
        ensure_start = time.perf_counter()
        graph = await self.get_graph(graph_id)
        if not graph:
            raise ValueError(f"Graph {graph_id} not found")

        main_topic = next(
            (mt for mt in graph.main_topics if mt.node_id == main_topic_node_id),
            None,
        )
        if not main_topic:
            raise ValueError(f"Main topic '{main_topic_node_id}' not found in graph {graph_id}")

        # Already materialized -> nothing to do.
        if main_topic.subtopics:
            logger.info(f"ensure_subtopics_for_topic '{main_topic.title}' no-op (already materialized) in {time.perf_counter() - ensure_start:.2f}s")
            return main_topic

        # Personalization context: prefer explicit args, fall back to the graph's
        # stored goals.
        goals = goals if goals is not None else (graph.goals or [])
        knowledge_base = knowledge_base or {}

        target_count = main_topic.subtopic_count or 5
        subnodes = await self.generator.generate_subtopics(
            subject=graph.subject,
            main_title=main_topic.title,
            main_description=main_topic.description or "",
            target_count=target_count,
            goals=goals,
            knowledge_base=knowledge_base,
            cognitive_style=cognitive_style,
            learning_pace=learning_pace,
        )

        if not subnodes:
            raise ValueError(f"No subtopics generated for milestone '{main_topic.title}'")

        new_subtopics: List[Subtopic] = []
        main_minutes = 0
        difficulty_sum = 0.0
        for sub_node in subnodes:
            subtopic = Subtopic(
                id=uuid.uuid4(),
                main_topic_id=main_topic.id,
                node_id=sub_node.node_id,
                title=sub_node.title,
                description=sub_node.description,
                order_index=sub_node.order_index,
                difficulty=sub_node.difficulty,
                estimated_minutes=sub_node.estimated_minutes,
                learning_points=sub_node.learning_points,
                topic_tags=sub_node.topic_tags,
                content_types=sub_node.content_types,
                prerequisites=sub_node.prerequisites,
            )
            self.db.add(subtopic)
            new_subtopics.append(subtopic)
            main_minutes += sub_node.estimated_minutes
            difficulty_sum += sub_node.difficulty

        # Update milestone + graph aggregates. subtopic_count previously held the
        # planned estimate; replace it with the actual count.
        delta_count = len(new_subtopics) - (main_topic.subtopic_count or 0)
        delta_minutes = main_minutes - (main_topic.estimated_minutes or 0)
        main_topic.subtopic_count = len(new_subtopics)
        main_topic.estimated_minutes = main_minutes
        main_topic.difficulty = difficulty_sum / len(new_subtopics)
        graph.total_subtopic_count = (graph.total_subtopic_count or 0) + delta_count
        graph.total_estimated_minutes = (graph.total_estimated_minutes or 0) + delta_minutes

        await self.db.flush()

        # If the student has already accepted this graph, create locked progress
        # rows for the freshly materialized subtopics.
        if student_id:
            await self._materialize_progress_for_subtopics(
                student_id, graph_id, main_topic.id, new_subtopics
            )

        await self.db.commit()
        logger.info(
            f"Materialized {len(new_subtopics)} subtopics for milestone "
            f"'{main_topic.title}' in graph {graph_id}"
        )

        # Re-fetch with relationships for a consistent return value. The commit
        # expires the original object, so load the specific milestone with its
        # subtopics to avoid returning stale (empty) collections to the UI.
        self.db.expire(main_topic)
        refreshed_topic_result = await self.db.execute(
            select(MainTopic)
            .where(MainTopic.id == main_topic.id)
            .options(selectinload(MainTopic.subtopics))
        )
        refreshed_topic = refreshed_topic_result.scalar_one()
        logger.info(f"ensure_subtopics_for_topic '{main_topic.title}' completed in {time.perf_counter() - ensure_start:.2f}s")
        return refreshed_topic

    async def _materialize_progress_for_subtopics(
        self,
        student_id: str,
        graph_id: uuid.UUID,
        main_topic_id: uuid.UUID,
        subtopics: List[Subtopic],
    ) -> None:
        """Create progress rows for lazily-generated subtopics.

        Runs whenever ``ensure_subtopics_for_topic`` is called with a
        ``student_id``. If the student already has progress for this graph, the
        new subtopics start locked and the existing unlock logic promotes them.
        If this is the very first materialization for the student, the first
        subtopic is unlocked so they can start learning immediately.
        """
        existing = await self.db.execute(
            select(StudentSubtopicProgress.subtopic_id).where(
                StudentSubtopicProgress.student_id == student_id,
                StudentSubtopicProgress.graph_id == graph_id,
            )
        )
        existing_ids = {row[0] for row in existing.all()}
        is_first_materialization = not existing_ids

        sorted_subtopics = sorted(subtopics, key=lambda s: s.order_index)
        for idx, subtopic in enumerate(sorted_subtopics):
            if subtopic.id in existing_ids:
                continue
            # First subtopic ever for this student starts unlocked so they can
            # begin learning; all others (and all subsequent materializations)
            # start locked.
            status = "unlocked" if is_first_materialization and idx == 0 else "locked"
            self.db.add(StudentSubtopicProgress(
                id=uuid.uuid4(),
                student_id=student_id,
                graph_id=graph_id,
                main_topic_id=main_topic_id,
                subtopic_id=subtopic.id,
                status=status,
                gate_score=0.0,
                quiz_unlocked=False,
                quiz_passed=False,
                bypass_mode=False,
            ))

    async def find_best_match(
        self,
        subject: str,
        goals: List[str] = None,
        min_status: str = "user_verified",
    ) -> Optional[HierarchicalKnowledgeGraph]:
        """Find an existing graph that matches the subject and goals."""
        subject_normalized = normalize_subject(subject)
        
        # Query for matching graphs with relationships loaded
        query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.subject_normalized == subject_normalized,
            HierarchicalKnowledgeGraph.status.in_(["user_verified", "popular", "curated"]),
        ).options(
            selectinload(HierarchicalKnowledgeGraph.main_topics).selectinload(MainTopic.subtopics)
        ).order_by(
            HierarchicalKnowledgeGraph.verified_by_count.desc(),
            HierarchicalKnowledgeGraph.avg_rating.desc(),
        ).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    # ========================================================================
    # Graph Retrieval
    # ========================================================================

    async def get_graph(self, graph_id: uuid.UUID) -> Optional[HierarchicalKnowledgeGraph]:
        """Get a graph by ID with main topics and subtopics loaded."""
        query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.id == graph_id
        ).options(
            selectinload(HierarchicalKnowledgeGraph.main_topics).selectinload(MainTopic.subtopics)
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_graph_structure(self, graph_id: uuid.UUID) -> Dict[str, Any]:
        """Get the full graph structure as a dictionary."""
        graph = await self.get_graph(graph_id)
        if not graph:
            return None

        return {
            "id": str(graph.id),
            "subject": graph.subject,
            "subject_normalized": graph.subject_normalized,
            "difficulty_level": graph.difficulty_level,
            "estimated_duration_weeks": graph.estimated_duration_weeks,
            "main_topic_count": graph.main_topic_count,
            "total_subtopic_count": graph.total_subtopic_count,
            "total_estimated_minutes": graph.total_estimated_minutes,
            "tags": graph.tags,
            "status": graph.status,
            "verified_by_count": graph.verified_by_count,
            "avg_rating": graph.avg_rating,
            "main_topics": [
                {
                    "id": str(mt.id),
                    "node_id": mt.node_id,
                    "title": mt.title,
                    "description": mt.description,
                    "order_index": mt.order_index,
                    "difficulty": mt.difficulty,
                    "estimated_minutes": mt.estimated_minutes,
                    "subtopic_count": mt.subtopic_count,
                    "prerequisites": mt.prerequisites,
                    "topic_tags": mt.topic_tags,
                    "subtopics": [
                        {
                            "id": str(st.id),
                            "node_id": st.node_id,
                            "title": st.title,
                            "description": st.description,
                            "order_index": st.order_index,
                            "difficulty": st.difficulty,
                            "estimated_minutes": st.estimated_minutes,
                            "learning_points": st.learning_points,
                            "topic_tags": st.topic_tags,
                            "content_types": st.content_types,
                            "prerequisites": st.prerequisites,
                        }
                        for st in sorted(mt.subtopics, key=lambda x: x.order_index)
                    ]
                }
                for mt in sorted(graph.main_topics, key=lambda x: x.order_index)
            ]
        }

    # ========================================================================
    # Student Progress
    # ========================================================================

    async def initialize_student_progress(
        self,
        student_id: str,
        graph_id: uuid.UUID,
    ) -> List[StudentSubtopicProgress]:
        """Initialize progress records for a student starting a graph."""
        graph = await self.get_graph(graph_id)
        if not graph:
            raise ValueError(f"Graph {graph_id} not found")

        progress_records = []
        first_subtopic = True

        for main_topic in sorted(graph.main_topics, key=lambda x: x.order_index):
            for subtopic in sorted(main_topic.subtopics, key=lambda x: x.order_index):
                # First subtopic is unlocked, rest are locked
                status = "unlocked" if first_subtopic else "locked"
                first_subtopic = False

                progress = StudentSubtopicProgress(
                    id=uuid.uuid4(),
                    student_id=student_id,
                    graph_id=graph_id,
                    main_topic_id=main_topic.id,
                    subtopic_id=subtopic.id,
                    status=status,
                    gate_score=0.0,
                    quiz_unlocked=False,
                    quiz_passed=False,
                    bypass_mode=False,
                )
                self.db.add(progress)
                progress_records.append(progress)

        # Update graph usage count
        graph.times_used += 1
        
        await self.db.commit()
        logger.info(f"Initialized {len(progress_records)} progress records for student {student_id}")
        
        return progress_records

    async def get_student_progress(
        self,
        student_id: str,
        graph_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """Get student's progress through a graph."""
        query = select(StudentSubtopicProgress).where(
            StudentSubtopicProgress.student_id == student_id,
            StudentSubtopicProgress.graph_id == graph_id,
        )
        
        result = await self.db.execute(query)
        records = result.scalars().all()

        return [
            {
                "subtopic_id": str(r.subtopic_id),
                "main_topic_id": str(r.main_topic_id),
                "status": r.status,
                "gate_score": r.gate_score,
                "quiz_unlocked": r.quiz_unlocked,
                "quiz_score": r.quiz_score,
                "quiz_passed": r.quiz_passed,
                "bypass_mode": r.bypass_mode,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in records
        ]

    async def start_subtopic(
        self,
        student_id: str,
        subtopic_id: uuid.UUID,
    ) -> StudentSubtopicProgress:
        """Mark a subtopic as started."""
        query = select(StudentSubtopicProgress).where(
            StudentSubtopicProgress.student_id == student_id,
            StudentSubtopicProgress.subtopic_id == subtopic_id,
        )
        
        result = await self.db.execute(query)
        progress = result.scalar_one_or_none()

        if not progress:
            raise ValueError(f"Progress record not found for subtopic {subtopic_id}")

        if progress.status == "locked":
            raise ValueError("Cannot start a locked subtopic")

        progress.status = "in_progress"
        progress.started_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(progress)
        
        return progress

    async def complete_subtopic(
        self,
        student_id: str,
        subtopic_id: uuid.UUID,
        quiz_score: float,
        bypass_mode: bool = False,
    ) -> Tuple[StudentSubtopicProgress, Optional[uuid.UUID]]:
        """
        Complete a subtopic and unlock the next one.

        Returns:
            Tuple of (progress, next_subtopic_id)
        """
        query = select(StudentSubtopicProgress).where(
            StudentSubtopicProgress.student_id == student_id,
            StudentSubtopicProgress.subtopic_id == subtopic_id,
        )
        
        result = await self.db.execute(query)
        progress = result.scalar_one_or_none()

        if not progress:
            raise ValueError(f"Progress record not found")

        # Check if quiz passed
        passing_score = 0.85 if bypass_mode else 0.60
        quiz_passed = quiz_score >= passing_score

        if not quiz_passed:
            progress.quiz_score = quiz_score
            progress.quiz_passed = False
            await self.db.commit()
            return progress, None

        # Mark as completed
        progress.status = "completed"
        progress.quiz_score = quiz_score
        progress.quiz_passed = True
        progress.bypass_mode = bypass_mode
        progress.completed_at = datetime.utcnow()

        # Find and unlock next subtopic
        next_subtopic_id = await self._unlock_next_subtopic(
            student_id,
            progress.graph_id,
            progress.main_topic_id,
            subtopic_id,
        )

        await self.db.commit()
        await self.db.refresh(progress)

        return progress, next_subtopic_id

    async def _unlock_next_subtopic(
        self,
        student_id: str,
        graph_id: uuid.UUID,
        current_main_topic_id: uuid.UUID,
        current_subtopic_id: uuid.UUID,
    ) -> Optional[uuid.UUID]:
        """Find and unlock the next subtopic in sequence."""
        # Get current subtopic to find its order
        subtopic_query = select(Subtopic).where(Subtopic.id == current_subtopic_id)
        result = await self.db.execute(subtopic_query)
        current_subtopic = result.scalar_one_or_none()
        
        if not current_subtopic:
            return None

        # Try to find next subtopic in same main topic
        next_in_main = select(Subtopic).where(
            Subtopic.main_topic_id == current_main_topic_id,
            Subtopic.order_index == current_subtopic.order_index + 1,
        )
        result = await self.db.execute(next_in_main)
        next_subtopic = result.scalar_one_or_none()

        if next_subtopic:
            # Unlock it
            await self._unlock_subtopic(student_id, next_subtopic.id)
            return next_subtopic.id

        # No more subtopics in this main topic, check if we need to unlock next main topic
        main_topic_query = select(MainTopic).where(MainTopic.id == current_main_topic_id)
        result = await self.db.execute(main_topic_query)
        current_main = result.scalar_one_or_none()

        if not current_main:
            return None

        # Find next main topic
        next_main_query = select(MainTopic).where(
            MainTopic.graph_id == current_main.graph_id,
            MainTopic.order_index == current_main.order_index + 1,
        )
        result = await self.db.execute(next_main_query)
        next_main = result.scalar_one_or_none()

        if not next_main:
            return None  # Learning path complete!

        # Two-pass (lazy) generation: the next milestone may not have its
        # subtopics materialized yet. Generate them on demand before unlocking.
        next_subtopic_count_q = select(Subtopic).where(Subtopic.main_topic_id == next_main.id)
        has_subs = (await self.db.execute(next_subtopic_count_q)).first() is not None
        if not has_subs:
            try:
                await self.ensure_subtopics_for_topic(
                    graph_id=next_main.graph_id,
                    main_topic_node_id=next_main.node_id,
                    student_id=student_id,
                )
            except Exception as e:
                logger.error(f"Failed to lazily materialize next milestone '{next_main.node_id}': {e}")
                return None

        # Get first subtopic of next main topic
        first_subtopic_query = select(Subtopic).where(
            Subtopic.main_topic_id == next_main.id,
            Subtopic.order_index == 0,
        )
        result = await self.db.execute(first_subtopic_query)
        first_subtopic = result.scalar_one_or_none()

        if first_subtopic:
            await self._unlock_subtopic(student_id, first_subtopic.id)
            return first_subtopic.id

        return None

    async def _unlock_subtopic(self, student_id: str, subtopic_id: uuid.UUID):
        """Unlock a specific subtopic for a student."""
        query = update(StudentSubtopicProgress).where(
            StudentSubtopicProgress.student_id == student_id,
            StudentSubtopicProgress.subtopic_id == subtopic_id,
        ).values(status="unlocked")
        
        await self.db.execute(query)

    # ========================================================================
    # Skip/Bypass
    # ========================================================================

    async def bypass_subtopic(
        self,
        student_id: str,
        subtopic_id: uuid.UUID,
    ) -> StudentSubtopicProgress:
        """Enable bypass mode for a subtopic (skip resources, take quiz directly)."""
        query = select(StudentSubtopicProgress).where(
            StudentSubtopicProgress.student_id == student_id,
            StudentSubtopicProgress.subtopic_id == subtopic_id,
        )
        
        result = await self.db.execute(query)
        progress = result.scalar_one_or_none()

        if not progress:
            raise ValueError("Progress record not found")

        progress.bypass_mode = True
        progress.quiz_unlocked = True
        progress.gate_score = 1.0

        await self.db.commit()
        await self.db.refresh(progress)

        return progress

    # ========================================================================
    # Quota Management
    # ========================================================================

    async def can_generate(
        self,
        student_id: str,
        subject: str,
        is_premium: bool = False,
    ) -> Tuple[bool, int]:
        """Check if student can generate a new graph."""
        if is_premium:
            return True, -1  # Unlimited

        subject_normalized = normalize_subject(subject)
        
        query = select(GenerationQuota).where(
            GenerationQuota.student_id == student_id,
            GenerationQuota.subject_normalized == subject_normalized,
        )
        
        result = await self.db.execute(query)
        quota = result.scalar_one_or_none()

        if not quota:
            return True, MAX_FREE_GENERATIONS

        remaining = MAX_FREE_GENERATIONS - quota.generations_used
        return remaining > 0, remaining

    async def increment_quota(self, student_id: str, subject: str):
        """Increment the generation quota for a student."""
        subject_normalized = normalize_subject(subject)
        
        query = select(GenerationQuota).where(
            GenerationQuota.student_id == student_id,
            GenerationQuota.subject_normalized == subject_normalized,
        )
        
        result = await self.db.execute(query)
        quota = result.scalar_one_or_none()

        if quota:
            quota.generations_used += 1
            quota.last_generation_at = datetime.utcnow()
        else:
            # Ensure student profile exists
            await self._ensure_student_profile(student_id)
            
            quota = GenerationQuota(
                id=uuid.uuid4(),
                student_id=student_id,
                subject_normalized=subject_normalized,
                generations_used=1,
                last_generation_at=datetime.utcnow(),
            )
            self.db.add(quota)

        await self.db.commit()

    async def _ensure_student_profile(self, student_id: str):
        """Ensure a student profile exists."""
        query = select(StudentProfile).where(StudentProfile.student_id == student_id)
        result = await self.db.execute(query)
        profile = result.scalar_one_or_none()

        if not profile:
            profile = StudentProfile(
                student_id=student_id,
                cognitive_style="mixed",
                learning_pace=0.5,
                knowledge_base={},
                weak_points=[],
                goals=[],
            )
            self.db.add(profile)
            await self.db.flush()

    # ========================================================================
    # Graph Acceptance
    # ========================================================================

    async def accept_graph(
        self,
        graph_id: uuid.UUID,
        student_id: str,
    ) -> HierarchicalKnowledgeGraph:
        """Mark a graph as accepted by a student."""
        graph = await self.get_graph(graph_id)
        if not graph:
            raise ValueError(f"Graph {graph_id} not found")

        graph.times_accepted += 1
        graph.verified_by_count += 1
        
        if graph.times_used > 0:
            graph.acceptance_rate = graph.times_accepted / graph.times_used

        if graph.status == "draft":
            graph.status = "user_verified"
            graph.first_verified_by = student_id

        await self.db.commit()
        await self.db.refresh(graph)

        return graph

    # ========================================================================
    # Resource Caching
    # ========================================================================

    def _build_cache_key(
        self,
        subtopic_id: str,
        difficulty_bucket: str,
        cognitive_style: str,
    ) -> str:
        """Build a cache key for resource lookup."""
        return f"{subtopic_id}:{difficulty_bucket}:{cognitive_style}"

    def _get_difficulty_bucket(self, difficulty: float) -> str:
        """Convert difficulty score to bucket for caching."""
        if difficulty < 0.33:
            return "beginner"
        elif difficulty < 0.66:
            return "intermediate"
        else:
            return "advanced"

    async def get_cached_resources(
        self,
        subtopic_id: str,
        difficulty: float,
        cognitive_style: str,
    ) -> Optional[Dict[str, Any]]:
        """Get cached resources for a subtopic if available."""
        difficulty_bucket = self._get_difficulty_bucket(difficulty)
        cache_key = self._build_cache_key(subtopic_id, difficulty_bucket, cognitive_style)

        query = select(CachedResource).where(CachedResource.cache_key == cache_key)
        result = await self.db.execute(query)
        cached = result.scalar_one_or_none()

        if cached:
            # Update usage stats
            cached.use_count += 1
            cached.last_used_at = datetime.utcnow()
            await self.db.commit()
            
            logger.info(f"Cache hit for {cache_key} (use_count: {cached.use_count})")
            return cached.resources

        logger.info(f"Cache miss for {cache_key}")
        return None

    async def cache_resources(
        self,
        subtopic_id: str,
        difficulty: float,
        cognitive_style: str,
        resources: Dict[str, Any],
        generation_config: Dict[str, Any] = None,
    ) -> CachedResource:
        """Cache generated resources for future reuse."""
        difficulty_bucket = self._get_difficulty_bucket(difficulty)
        cache_key = self._build_cache_key(subtopic_id, difficulty_bucket, cognitive_style)

        # Check if already cached
        query = select(CachedResource).where(CachedResource.cache_key == cache_key)
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing cache
            existing.resources = resources
            existing.generation_config = generation_config or {}
            existing.use_count += 1
            existing.last_used_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        # Create new cache entry
        cached = CachedResource(
            id=uuid.uuid4(),
            subtopic_id=subtopic_id,
            cache_key=cache_key,
            resources=resources,
            generation_config=generation_config or {},
            use_count=1,
            last_used_at=datetime.utcnow(),
        )
        self.db.add(cached)
        await self.db.commit()
        await self.db.refresh(cached)

        logger.info(f"Cached resources for {cache_key}")
        return cached

    async def get_or_generate_resources(
        self,
        subtopic_id: str,
        student_id: str,
        difficulty: float = 0.5,
        cognitive_style: str = "mixed",
        force_regenerate: bool = False,
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Get resources from cache or generate new ones.

        Returns:
            Tuple of (resources, from_cache)
        """
        if not force_regenerate:
            cached = await self.get_cached_resources(subtopic_id, difficulty, cognitive_style)
            if cached:
                return cached, True

        # Generate new resources using orchestrator
        # For now, return placeholder - actual generation will use Orchestrator
        resources = await self._generate_subtopic_resources(
            subtopic_id=subtopic_id,
            student_id=student_id,
            difficulty=difficulty,
            cognitive_style=cognitive_style,
        )

        # Cache the generated resources
        await self.cache_resources(
            subtopic_id=subtopic_id,
            difficulty=difficulty,
            cognitive_style=cognitive_style,
            resources=resources,
            generation_config={
                "difficulty": difficulty,
                "cognitive_style": cognitive_style,
                "student_id": student_id,
            },
        )

        return resources, False

    async def _generate_subtopic_resources(
        self,
        subtopic_id: str,
        student_id: str,
        difficulty: float,
        cognitive_style: str,
    ) -> Dict[str, Any]:
        """
        Generate resources for a subtopic.
        
        This is a placeholder - actual implementation will use Orchestrator agent.
        """
        # TODO: Integrate with Orchestrator agent for actual resource generation
        # For now, return a structure that matches expected format
        return {
            "subtopic_id": subtopic_id,
            "generated_at": datetime.utcnow().isoformat(),
            "difficulty": difficulty,
            "cognitive_style": cognitive_style,
            "content": {
                "type": "placeholder",
                "message": "Resource generation pending - integrate with Orchestrator",
            },
            "quiz": {
                "type": "placeholder",
                "questions": [],
            },
            "mindmap": {
                "type": "placeholder",
                "nodes": [],
            },
        }

    # ========================================================================
    # Resource Generation Queue
    # ========================================================================

    async def queue_resource_generation(
        self,
        subtopic_id: str,
        student_id: str,
        priority: int = 2,
        config: Dict[str, Any] = None,
    ) -> ResourceGenerationQueue:
        """Add a resource generation job to the queue."""
        # Check if already queued
        query = select(ResourceGenerationQueue).where(
            ResourceGenerationQueue.subtopic_id == subtopic_id,
            ResourceGenerationQueue.student_id == student_id,
            ResourceGenerationQueue.status.in_(["pending", "generating"]),
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            # Update priority if higher
            if priority < existing.priority:
                existing.priority = priority
                await self.db.commit()
            return existing

        # Create new queue entry
        queue_item = ResourceGenerationQueue(
            id=uuid.uuid4(),
            subtopic_id=subtopic_id,
            student_id=student_id,
            config=config or {},
            priority=priority,
            status="pending",
        )
        self.db.add(queue_item)
        await self.db.commit()
        await self.db.refresh(queue_item)

        logger.info(f"Queued resource generation for {subtopic_id} (priority: {priority})")
        return queue_item

    async def get_pending_queue_items(
        self,
        limit: int = 10,
    ) -> List[ResourceGenerationQueue]:
        """Get pending items from the queue, ordered by priority."""
        query = select(ResourceGenerationQueue).where(
            ResourceGenerationQueue.status == "pending"
        ).order_by(
            ResourceGenerationQueue.priority,
            ResourceGenerationQueue.created_at,
        ).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def process_queue_item(
        self,
        item_id: uuid.UUID,
    ) -> Tuple[ResourceGenerationQueue, Optional[Dict[str, Any]]]:
        """Process a queue item and generate resources."""
        query = select(ResourceGenerationQueue).where(ResourceGenerationQueue.id == item_id)
        result = await self.db.execute(query)
        item = result.scalar_one_or_none()

        if not item:
            raise ValueError(f"Queue item {item_id} not found")

        if item.status != "pending":
            raise ValueError(f"Queue item {item_id} is not pending (status: {item.status})")

        # Mark as generating
        item.status = "generating"
        item.started_at = datetime.utcnow()
        await self.db.commit()

        try:
            # Get config
            config = item.config or {}
            difficulty = config.get("difficulty", 0.5)
            cognitive_style = config.get("cognitive_style", "mixed")

            # Generate resources
            resources, from_cache = await self.get_or_generate_resources(
                subtopic_id=item.subtopic_id,
                student_id=item.student_id,
                difficulty=difficulty,
                cognitive_style=cognitive_style,
            )

            # Mark as complete
            item.status = "complete"
            item.completed_at = datetime.utcnow()
            item.result_cache_key = self._build_cache_key(
                item.subtopic_id,
                self._get_difficulty_bucket(difficulty),
                cognitive_style,
            )
            await self.db.commit()

            logger.info(f"Processed queue item {item_id}")
            return item, resources

        except Exception as e:
            # Mark as failed
            item.status = "failed"
            item.error_message = str(e)
            item.completed_at = datetime.utcnow()
            await self.db.commit()

            logger.error(f"Failed to process queue item {item_id}: {e}")
            return item, None

    async def prefetch_next_subtopics(
        self,
        student_id: str,
        current_subtopic_id: uuid.UUID,
        count: int = 2,
    ) -> List[ResourceGenerationQueue]:
        """Queue resource generation for upcoming subtopics."""
        # Get current subtopic
        query = select(Subtopic).where(Subtopic.id == current_subtopic_id)
        result = await self.db.execute(query)
        current = result.scalar_one_or_none()

        if not current:
            return []

        queued = []

        # Get next subtopics in same main topic
        next_in_main = select(Subtopic).where(
            Subtopic.main_topic_id == current.main_topic_id,
            Subtopic.order_index > current.order_index,
        ).order_by(Subtopic.order_index).limit(count)

        result = await self.db.execute(next_in_main)
        next_subtopics = list(result.scalars().all())

        # Queue them with prefetch priority
        for i, subtopic in enumerate(next_subtopics):
            item = await self.queue_resource_generation(
                subtopic_id=subtopic.node_id,
                student_id=student_id,
                priority=3,  # Prefetch priority
                config={"difficulty": subtopic.difficulty},
            )
            queued.append(item)

        # If we need more, get from next main topic
        remaining = count - len(next_subtopics)
        if remaining > 0:
            # Get main topic
            main_query = select(MainTopic).where(MainTopic.id == current.main_topic_id)
            result = await self.db.execute(main_query)
            main_topic = result.scalar_one_or_none()

            if main_topic:
                # Get next main topic
                next_main_query = select(MainTopic).where(
                    MainTopic.graph_id == main_topic.graph_id,
                    MainTopic.order_index == main_topic.order_index + 1,
                )
                result = await self.db.execute(next_main_query)
                next_main = result.scalar_one_or_none()

                if next_main:
                    # Get first subtopics of next main
                    first_subs_query = select(Subtopic).where(
                        Subtopic.main_topic_id == next_main.id,
                    ).order_by(Subtopic.order_index).limit(remaining)

                    result = await self.db.execute(first_subs_query)
                    first_subs = list(result.scalars().all())

                    for subtopic in first_subs:
                        item = await self.queue_resource_generation(
                            subtopic_id=subtopic.node_id,
                            student_id=student_id,
                            priority=3,
                            config={"difficulty": subtopic.difficulty},
                        )
                        queued.append(item)

        logger.info(f"Prefetched {len(queued)} subtopics for student {student_id}")
        return queued
