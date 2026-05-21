"""
Orchestrator Agent for coordinating multi-agent resource generation.

Decides which agents to run based on:
- Student profile (cognitive style, weak points)
- Topic characteristics
- Available context
"""

import asyncio
from typing import Any, AsyncIterator, Dict, List, Optional

from agents.code_agent import CodeAgent
from agents.content_agent import ContentAgent
from agents.media_agent import MediaAgent
from agents.mindmap_agent import MindMapAgent
from agents.quiz_agent import QuizAgent
from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)

MAX_CONCURRENT_AGENTS = 5  # all 5 agents run concurrently


class Orchestrator:
    """Coordinates multiple resource generation agents."""

    def __init__(self, llm=None):
        self.llm = llm or llm_client
        self.content_agent = ContentAgent(llm)
        self.quiz_agent = QuizAgent(llm)
        self.mindmap_agent = MindMapAgent(llm)
        self.media_agent = MediaAgent(llm)
        self.code_agent = CodeAgent(llm)
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENT_AGENTS)
        logger.info("Orchestrator initialized with 5 agents")

    def decide_agents(self, profile: Dict[str, Any], topic: str) -> List[str]:
        """
        Decide which agents to run based on student profile and topic.

        Args:
            profile: Student profile
            topic: Topic being studied

        Returns:
            List of agent names to execute
        """
        # Default: run core 3 agents
        agents = ["content", "quiz", "mindmap"]

        cognitive_style = profile.get("cognitive_style", "mixed")
        weak_points = profile.get("weak_points", [])
        content_preferences = profile.get("content_preferences", [])
        learning_pace = profile.get("learning_pace", 0.5)

        # Add media agent for visual learners
        if "visual" in cognitive_style or "video" in content_preferences:
            agents.append("media")

        # Add code agent for programming topics
        programming_topics = ["docker", "kubernetes", "container", "microservice",
                            "devops", "python", "java", "go", "api", "serverless"]
        topic_lower = topic.lower()
        if any(pt in topic_lower for pt in programming_topics):
            agents.append("code")

        # Adjust order based on cognitive style
        if "kinesthetic" in cognitive_style:
            # Hands-on learners: code, quiz first
            if "code" in agents:
                agents.remove("code")
                agents.insert(0, "code")
            agents.remove("quiz")
            agents.insert(0, "quiz")
        elif "visual" in cognitive_style:
            # Visual learners: mindmap, media first
            if "media" in agents:
                agents.remove("media")
                agents.insert(0, "media")
            agents.remove("mindmap")
            agents.insert(0, "mindmap")

        # If student has many weak points, prioritize quiz
        if len(weak_points) >= 2:
            if "quiz" in agents:
                agents.remove("quiz")
                agents.insert(0, "quiz")

        # Fast learners get all agents
        if learning_pace > 0.8:
            all_agents = ["content", "quiz", "mindmap", "media", "code"]
            for a in all_agents:
                if a not in agents:
                    agents.append(a)

        return agents

    async def generate_resources(
        self,
        topic: str,
        profile: Dict[str, Any],
        context: str = "",
        agent_selection: Optional[List[str]] = None,
        agent_kwargs: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a complete resource bundle for a topic.

        Args:
            topic: Topic to generate resources for
            profile: Student profile dict
            context: RAG context or previous materials
            agent_selection: Optional override for which agents to run

        Returns:
            Dict with all generated resources
        """
        agents_to_run = agent_selection or self.decide_agents(profile, topic)

        logger.info(
            f"Generating resources for '{topic}' with agents: {agents_to_run}"
        )

        results = {}

        agent_map = {
            "content": self.content_agent,
            "quiz": self.quiz_agent,
            "mindmap": self.mindmap_agent,
            "media": self.media_agent,
            "code": self.code_agent,
        }

        kwargs = dict(agent_kwargs or {})
        node_id = kwargs.pop("node_id", "")

        # Build coroutines with concurrency limit
        async def _run_with_limit(agent, name):
            async with self._semaphore:
                # Pass context as node_id for RAG retrieval, agents handle empty strings gracefully
                logger.info(f"Orchestrator: Starting {name} agent for topic '{topic}'")
                result = await agent.run(topic, profile, node_id, **kwargs)
                logger.info(f"Orchestrator: {name} agent completed, result keys: {list(result.keys()) if isinstance(result, dict) else 'N/A'}")
                return result

        coros = []
        names = []
        for agent_name in agents_to_run:
            agent = agent_map.get(agent_name)
            if agent:
                coros.append(_run_with_limit(agent, agent_name))
                names.append(agent_name)

        # Execute all agents concurrently (limited by semaphore)
        gathered = await asyncio.gather(*coros, return_exceptions=True)

        for agent_name, result in zip(names, gathered):
            if isinstance(result, Exception):
                err_msg = str(result) or type(result).__name__
                logger.error(f"{agent_name} agent failed: {err_msg}")
                results[agent_name] = {
                    "error": err_msg,
                    "agent": agent_name,
                }
            else:
                results[agent_name] = result
                logger.info(f"{agent_name} agent completed successfully")

        return {
            "topic": topic,
            "resources": results,
            "metadata": {
                "agents_run": agents_to_run,
                "profile_match": self._calculate_profile_match(results, profile),
            }
        }

    async def generate_resources_stream(
        self,
        topic: str,
        profile: Dict[str, Any],
        context: str = "",
        agent_selection: Optional[List[str]] = None,
        agent_kwargs: Optional[Dict[str, Any]] = None,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Run agents concurrently and yield progress events as they finish.

        Event schema:
            {"event": "plan",           "topic": str, "agents": [str, ...]}
            {"event": "agent_started",  "agent": str}
            {"event": "agent_complete", "agent": str, "result": dict}
            {"event": "agent_failed",   "agent": str, "error":  str}
            {"event": "complete",       "topic": str, "resources": dict,
                                        "metadata": {...}}

        Designed to be wrapped by an SSE endpoint so the frontend can show
        per-agent progress instead of waiting for the whole bundle.
        """
        agents_to_run = agent_selection or self.decide_agents(profile, topic)
        agent_map = {
            "content": self.content_agent,
            "quiz": self.quiz_agent,
            "mindmap": self.mindmap_agent,
            "media": self.media_agent,
            "code": self.code_agent,
        }
        valid = [(name, agent_map[name]) for name in agents_to_run if name in agent_map]
        valid_names = [n for n, _ in valid]

        logger.info(
            f"Streaming resource generation for '{topic}' with agents: {valid_names}"
        )

        yield {"event": "plan", "topic": topic, "agents": valid_names}

        if not valid:
            yield {
                "event": "complete",
                "topic": topic,
                "resources": {},
                "metadata": {
                    "agents_run": [],
                    "profile_match": 0.0,
                },
            }
            return

        kwargs = dict(agent_kwargs or {})
        node_id = kwargs.pop("node_id", "")
        queue: asyncio.Queue = asyncio.Queue()
        SENTINEL: Any = object()
        results: Dict[str, Any] = {}

        async def _runner(name: str, agent: Any) -> None:
            await queue.put({"event": "agent_started", "agent": name})
            async with self._semaphore:
                try:
                    result = await agent.run(topic, profile, node_id, **kwargs)
                    results[name] = result
                    await queue.put({
                        "event": "agent_complete",
                        "agent": name,
                        "result": result,
                    })
                except Exception as e:  # noqa: BLE001 — must surface via stream
                    err = str(e) or type(e).__name__
                    logger.error(f"{name} agent failed during stream: {err}")
                    results[name] = {"error": err, "agent": name}
                    await queue.put({
                        "event": "agent_failed",
                        "agent": name,
                        "error": err,
                    })

        async def _driver() -> None:
            try:
                await asyncio.gather(
                    *(_runner(n, a) for n, a in valid),
                    return_exceptions=False,
                )
            finally:
                await queue.put(SENTINEL)

        driver_task = asyncio.create_task(_driver())

        try:
            while True:
                item = await queue.get()
                if item is SENTINEL:
                    break
                yield item
        finally:
            # Ensure the driver always finishes before we yield "complete",
            # even if the consumer disconnects mid-stream.
            try:
                await driver_task
            except Exception as e:  # noqa: BLE001
                logger.error(f"Stream driver task failed: {e}")

        yield {
            "event": "complete",
            "topic": topic,
            "resources": results,
            "metadata": {
                "agents_run": valid_names,
                "profile_match": self._calculate_profile_match(results, profile),
            },
        }

    def _calculate_profile_match(
        self,
        results: Dict[str, Any],
        profile: Dict[str, Any]
    ) -> float:
        """Calculate how well resources match student profile."""
        if not results:
            return 0.0

        success_count = sum(
            1 for r in results.values()
            if "error" not in r
        )

        return success_count / len(results) if results else 0.0
