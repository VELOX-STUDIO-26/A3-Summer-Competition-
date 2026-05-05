"""
Code Agent for generating programming exercises and examples.

Creates scaffolded coding lessons with 3-tier progression:
- Guided: Step-by-step with detailed hints
- Practice: Apply what you learned
- Challenge: Real-world scenario problem

Supports: Python, Java, C++, Go, JavaScript
"""

import json
import re
from typing import Any, Dict, List

from agents.base_agent import BaseAgent
from core.faithfulness_checker import faithfulness_checker
from core.llm_client import llm_client
from core.logging import get_logger
from rag.vector_store import get_vector_store

logger = get_logger(__name__)

CODE_SYSTEM_PROMPT = """You are an expert programming instructor and curriculum designer.

Your task is to create a COMPLETE 3-tier scaffolded coding lesson with guided, practice, and challenge exercises.

CRITICAL: You MUST include ALL required fields with substantial content.

Required JSON structure:
{
    "language": "python",
    "difficulty": "intermediate",
    "real_world_scenario": "Brief real-world context explaining why this skill matters (30-40 words)",
    "learning_objectives": ["Objective 1", "Objective 2", "Objective 3"],
    "exercises": [
        {
            "tier": "guided",
            "name": "Guided Walkthrough",
            "problem": "Clear problem description with scaffolding (40-60 words)",
            "starter_code": "def function_name(param):\\n    '''Docstring'''\\n    # TODO: Implement step 1\\n    pass",
            "solution": "Complete working solution with comments explaining each step",
            "pseudocode": "1. Initialize variable\\n2. Loop through items\\n3. Return result",
            "visual_steps": [
                "Step 1: [visual description of what happens]",
                "Step 2: [visual description]",
                "Step 3: [visual description]"
            ],
            "test_cases": [
                {"input": "test_input", "expected": "expected_output", "description": "Test description"}
            ],
            "hints": [
                "Hint 1: General direction to start",
                "Hint 2: More specific guidance on the algorithm",
                "Hint 3: Nearly gives away the solution with specific code structure"
            ],
            "time_complexity": "O(n) - explanation of why",
            "space_complexity": "O(1) - explanation of why"
        },
        {
            "tier": "practice",
            "name": "Practice Exercise",
            "problem": "Similar problem to guided but with less scaffolding (40-60 words)",
            "starter_code": "def practice_function(param):\\n    '''Docstring'''\\n    # TODO: Implement\\n    pass",
            "solution": "Complete working solution",
            "pseudocode": "High-level steps",
            "visual_steps": ["Visual step 1", "Visual step 2"],
            "test_cases": [
                {"input": "test_input", "expected": "expected_output", "description": "Basic test"},
                {"input": "edge_input", "expected": "edge_output", "description": "Edge case"}
            ],
            "hints": ["Hint 1", "Hint 2", "Hint 3"],
            "time_complexity": "O(n)",
            "space_complexity": "O(1)"
        },
        {
            "tier": "challenge",
            "name": "Challenge Problem",
            "problem": "Complex real-world scenario requiring creative application (60-80 words)",
            "starter_code": "def challenge_function(params):\\n    '''Complex docstring'''\\n    # TODO: Implement full solution\\n    pass",
            "solution": "Complete working solution with advanced techniques",
            "pseudocode": "High-level algorithm steps",
            "visual_steps": ["Visual step 1", "Visual step 2", "Visual step 3"],
            "test_cases": [
                {"input": "complex_input", "expected": "complex_output", "description": "Complex scenario"},
                {"input": "edge_input", "expected": "edge_output", "description": "Edge case"},
                {"input": "large_input", "expected": "large_output", "description": "Performance test"}
            ],
            "hints": ["Hint 1 - strategic", "Hint 2 - tactical", "Hint 3 - implementation detail"],
            "time_complexity": "O(n log n)",
            "space_complexity": "O(n)"
        }
    ],
    "common_bugs": [
        {
            "bug_name": "Name of the bug",
            "buggy_code": "Code showing the mistake",
            "explanation": "Why this fails (20-30 words)",
            "fix": "Corrected code",
            "prevention_tip": "How to avoid this in the future"
        },
        {
            "bug_name": "Second common bug",
            "buggy_code": "...",
            "explanation": "...",
            "fix": "...",
            "prevention_tip": "..."
        }
    ],
    "complexity_analysis": {
        "time_complexity": "O(n) - detailed explanation of why",
        "space_complexity": "O(1) - detailed explanation",
        "why_it_matters": "Why understanding complexity matters for this problem (20-30 words)"
    },
    "key_takeaways": [
        "Takeaway 1: Core concept learned",
        "Takeaway 2: Best practice",
        "Takeaway 3: When to apply this"
    ]
}

MANDATORY RULES (MUST FOLLOW):
1. EXACTLY 3 exercises: guided → practice → challenge (increasing difficulty)
2. Each exercise MUST have EXACTLY 3 hints (progressive disclosure)
3. Each exercise MUST have visual_steps array with 2-3 steps
4. Each exercise MUST include pseudocode field
5. common_bugs MUST have EXACTLY 2 bugs with bug_name, buggy_code, explanation, fix, prevention_tip
6. complexity_analysis MUST explain WHY the complexity matters
7. key_takeaways MUST have EXACTLY 3 items
8. real_world_scenario MUST be 30-40 words explaining practical relevance
9. guided tier: 1 test case, practice: 2 test cases, challenge: 3 test cases
10. All code MUST be valid, runnable, and properly escaped for JSON
11. Use double quotes for ALL strings, valid JSON only

FAILURE TO INCLUDE ALL REQUIRED FIELDS WITH PROPER STRUCTURE IS UNACCEPTABLE."""


class CodeAgent(BaseAgent):
    """Generates scaffolded programming exercises with 3-tier progression."""

    def __init__(self, llm=None):
        super().__init__("Code", llm)
        self.vector_store = get_vector_store()
        self.max_rag_chunks = 3

    async def _retrieve_chunks(self, topic: str, node_id: str = "") -> List[Dict[str, Any]]:
        """Retrieve relevant RAG chunks for the topic."""
        results = []

        try:
            embeddings = await llm_client.get_embeddings([topic])
            query_embedding = embeddings[0]
            results = self.vector_store.search(
                query_embedding=query_embedding,
                top_k=self.max_rag_chunks,
                node_id=node_id if node_id else None
            )
        except Exception as e:
            logger.debug(f"Embedding search failed: {e}")

        if not results and hasattr(self.vector_store, "search_by_text"):
            try:
                results = self.vector_store.search_by_text(
                    query=topic,
                    top_k=self.max_rag_chunks,
                    node_id=node_id if node_id else None
                )
            except Exception as e:
                logger.debug(f"Keyword search failed: {e}")

        chunks = []
        for item in results:
            chunks.append({
                "chunk_id": item.get("chunk_id", ""),
                "node_id": item.get("node_id", ""),
                "text": item.get("text", ""),
                "source": item.get("source", ""),
            })
        return chunks

    def _format_rag_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format RAG chunks for inclusion in the prompt."""
        if not chunks:
            return ""
        return "\n\n".join(
            f"[Source: {c['chunk_id']}]\n{c['text']}" for c in chunks
        )

    async def run(
        self,
        topic: str,
        profile: Dict[str, Any],
        node_id: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a 3-tier scaffolded coding exercise for a topic.

        Args:
            topic: Topic to create code for (e.g., "Docker Containerization")
            profile: Student profile dict
            node_id: Optional node ID for RAG retrieval
            **kwargs: language, difficulty

        Returns:
            Dict with exercises, common_bugs, complexity_analysis, metadata
        """
        # Ensure knowledge_base is a dict
        knowledge_base = profile.get("knowledge_base", {})
        if not isinstance(knowledge_base, dict):
            knowledge_base = {}
        mastery = self._get_topic_mastery(topic, knowledge_base)
        learning_pace = profile.get("learning_pace", 0.5)
        weak_points = profile.get("weak_points", [])

        # Determine language
        language = kwargs.get("language", "python")

        # Determine difficulty based on mastery and pace
        if mastery < 0.3:
            difficulty = "beginner"
        elif mastery < 0.7:
            difficulty = "intermediate"
        else:
            difficulty = "advanced"

        # Adjust difficulty based on pace
        if learning_pace > 0.8 and difficulty != "advanced":
            difficulty = "intermediate" if difficulty == "beginner" else "advanced"

        # Check if topic is a weak point for extra scaffolding
        is_weak_point = topic.lower() in [wp.lower() for wp in weak_points]

        # Retrieve RAG chunks for grounding
        rag_chunks = await self._retrieve_chunks(topic, node_id)
        rag_context = self._format_rag_context(rag_chunks)

        system_prompt = self._build_system_prompt(CODE_SYSTEM_PROMPT, profile)

        user_prompt = f"""Create a 3-tier scaffolded coding exercise for: **{topic}**

Requirements:
- Programming language: {language}
- Base difficulty: {difficulty}
- Student mastery: {mastery:.0%}
- Is weak point: {is_weak_point}

3-TIER STRUCTURE:
1. GUIDED (Tier 1): Step-by-step walkthrough with detailed hints - for students to learn the pattern
2. PRACTICE (Tier 2): Similar problem with less scaffolding - for students to apply what they learned
3. CHALLENGE (Tier 3): Complex real-world scenario - for students to demonstrate mastery

WEAK POINT ADAPTATION:
{'- Add EXTRA detailed hints in guided tier' if is_weak_point else ''}
{'- Include more visual step-by-step breakdown' if is_weak_point else ''}
{'- Make practice tier easier to bridge gap' if is_weak_point else ''}

Context:
{rag_context if rag_context else 'Create a practical exercise related to this topic.'}

Generate the complete 3-tier exercise with all mandatory fields including common_bugs and complexity_analysis.
Return ONLY valid JSON."""

        try:
            response = await self.llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.4,
                max_tokens=4000
            )

            content = response["choices"][0]["message"]["content"]

            # Parse JSON
            try:
                code_data = json.loads(content)
            except json.JSONDecodeError:
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    code_data = json.loads(json_match.group())
                else:
                    raise ValueError("Could not parse code JSON")

            # Ensure exercises array exists with proper structure
            exercises = code_data.get("exercises", [])
            if len(exercises) < 3:
                # Fill in missing exercises with fallback structure
                exercises = self._ensure_three_exercises(exercises, topic, language)

            # Ensure common_bugs exists
            common_bugs = code_data.get("common_bugs", [])
            if len(common_bugs) < 2:
                common_bugs = self._generate_fallback_bugs(topic, language)

            # Ensure complexity_analysis exists
            complexity_analysis = code_data.get("complexity_analysis", {
                "time_complexity": "O(n)",
                "space_complexity": "O(1)",
                "why_it_matters": f"Understanding complexity helps you write efficient {topic} solutions."
            })

            # Ensure key_takeaways exists
            key_takeaways = code_data.get("key_takeaways", [
                f"Master the core concepts of {topic}",
                "Practice debugging common errors",
                "Apply these patterns to real-world problems"
            ])

            # Run faithfulness check
            code_text = json.dumps(code_data, indent=2)
            faithfulness_result = await faithfulness_checker.check_faithfulness(
                generated_text=code_text,
                source_chunks=[{"id": c["chunk_id"], "text": c["text"], "source": c["source"]} for c in rag_chunks],
                context=topic,
            )

            return {
                "language": code_data.get("language", language),
                "difficulty": code_data.get("difficulty", difficulty),
                "real_world_scenario": code_data.get("real_world_scenario", f"Apply {topic} to solve practical problems."),
                "learning_objectives": code_data.get("learning_objectives", [
                    f"Understand {topic} fundamentals",
                    f"Implement {topic} solutions",
                    f"Debug and optimize {topic} code"
                ]),
                "exercises": exercises,
                "common_bugs": common_bugs,
                "complexity_analysis": complexity_analysis,
                "key_takeaways": key_takeaways,
                "format": "code_exercise",
                "metadata": {
                    "topic": topic,
                    "agent": "code",
                    "language": language,
                    "difficulty": difficulty,
                    "mastery_level": mastery,
                    "is_weak_point": is_weak_point,
                    "num_exercises": len(exercises),
                    "has_common_bugs": len(common_bugs) > 0,
                    "has_complexity_analysis": bool(complexity_analysis),
                    "tier_structure": [e.get("tier") for e in exercises],
                },
                "faithfulness": {
                    "score": faithfulness_result.score,
                    "verified": faithfulness_result.score >= faithfulness_checker.threshold,
                    "total_claims": faithfulness_result.total_claims,
                    "supported_claims": faithfulness_result.supported_count,
                    "unverifiable_claims": faithfulness_result.unverifiable_count,
                    "citations": faithfulness_result.citations,
                },
                "sources": rag_chunks,
            }

        except Exception as e:
            logger.error(f"Code generation failed for {topic}: {e}")
            return self._generate_fallback_response(topic, language, difficulty, mastery, is_weak_point)

    def _ensure_three_exercises(self, exercises: List[Dict], topic: str, language: str) -> List[Dict]:
        """Ensure we have exactly 3 exercises with proper tier structure."""
        tiers = ["guided", "practice", "challenge"]
        tier_names = ["Guided Walkthrough", "Practice Exercise", "Challenge Problem"]

        result = []
        for i, tier in enumerate(tiers):
            existing = next((e for e in exercises if e.get("tier") == tier), None)
            if existing:
                result.append(existing)
            else:
                result.append(self._generate_fallback_exercise(tier, tier_names[i], topic, language, i))
        return result

    def _generate_fallback_exercise(self, tier: str, name: str, topic: str, language: str, index: int) -> Dict[str, Any]:
        """Generate a fallback exercise for missing tiers."""
        difficulty_multiplier = [1, 2, 3][index]
        test_cases = [
            [{"input": f"test_{topic.lower().replace(' ', '_')}", "expected": "result", "description": "Basic test"}],
            [
                {"input": "basic_input", "expected": "basic_output", "description": "Basic test"},
                {"input": "edge_input", "expected": "edge_output", "description": "Edge case"}
            ],
            [
                {"input": "complex_input", "expected": "complex_output", "description": "Complex scenario"},
                {"input": "edge_input", "expected": "edge_output", "description": "Edge case"},
                {"input": "large_input", "expected": "large_output", "description": "Performance test"}
            ]
        ][index]

        return {
            "tier": tier,
            "name": name,
            "problem": f"{'Follow the guided steps' if tier == 'guided' else 'Apply your knowledge' if tier == 'practice' else 'Solve this complex challenge'} to implement a solution for {topic}.",
            "starter_code": f"# TODO: Implement {tier} solution for {topic}\ndef {tier}_solution(params):\n    '''\n    {name} for {topic}\n    '''\n    pass",
            "solution": f"# Solution for {tier} exercise\ndef {tier}_solution(params):\n    # Implementation here\n    return result",
            "pseudocode": "1. Initialize\n2. Process input\n3. Return result",
            "visual_steps": [
                f"Step 1: Understand the {tier} problem",
                f"Step 2: Implement the solution",
                "Step 3: Test and verify"
            ],
            "test_cases": test_cases,
            "hints": [
                f"Hint 1: Think about the core concept of {topic}",
                f"Hint 2: Consider how to break down the problem",
                f"Hint 3: Look at the test cases for expected behavior"
            ],
            "time_complexity": f"O(n^{difficulty_multiplier})",
            "space_complexity": "O(n)" if tier == "challenge" else "O(1)"
        }

    def _generate_fallback_bugs(self, topic: str, language: str) -> List[Dict[str, Any]]:
        """Generate fallback common bugs."""
        return [
            {
                "bug_name": "Off-by-One Error",
                "buggy_code": "for i in range(len(items)):\n    if items[i] == target:\n        return i\nreturn -1",
                "explanation": "Common indexing mistake that causes missing the first or last element.",
                "fix": "Verify loop bounds match the problem requirements exactly.",
                "prevention_tip": "Always test with minimum and maximum input sizes."
            },
            {
                "bug_name": "Edge Case Handling",
                "buggy_code": "def process(data):\n    return data[0] + data[1]",
                "explanation": "Doesn't handle empty or single-element inputs properly.",
                "fix": "Add guards: if not data or len(data) < 2: return default",
                "prevention_tip": "Always consider what happens with empty/null inputs."
            }
        ]

    def _generate_fallback_response(self, topic: str, language: str, difficulty: str, mastery: float, is_weak_point: bool) -> Dict[str, Any]:
        """Generate complete fallback response when LLM fails."""
        return {
            "language": language,
            "difficulty": difficulty,
            "real_world_scenario": f"Understanding {topic} is essential for building scalable and maintainable software systems in modern development.",
            "learning_objectives": [
                f"Understand core {topic} concepts",
                f"Implement {topic} solutions correctly",
                f"Debug and optimize {topic} implementations"
            ],
            "exercises": [
                {
                    "tier": "guided",
                    "name": "Guided Walkthrough",
                    "problem": f"Follow this step-by-step guide to implement a basic {topic} solution. This exercise will walk you through the core concepts with detailed hints.",
                    "starter_code": f"# Guided Exercise: {topic}\ndef guided_{topic.lower().replace(' ', '_')}(items):\n    '''\n    Process items using {topic} concepts.\n    \n    Args:\n        items: List of items to process\n    \n    Returns:\n        Processed result\n    '''\n    # TODO: Step 1 - Initialize your variables\n    # TODO: Step 2 - Process each item\n    # TODO: Step 3 - Return the result\n    pass",
                    "solution": f"# Guided Solution\ndef guided_{topic.lower().replace(' ', '_')}(items):\n    result = []\n    for item in items:\n        processed = process_item(item)\n        result.append(processed)\n    return result\n\ndef process_item(item):\n    # Apply {topic} transformation\n    return item",
                    "pseudocode": "1. Initialize empty result list\n2. For each item in input:\n   a. Process the item\n   b. Add to result\n3. Return result list",
                    "visual_steps": [
                        "Input items arrive one by one",
                        "Each item gets transformed/processed",
                        "Results are collected and returned"
                    ],
                    "test_cases": [
                        {"input": "[1, 2, 3]", "expected": "[2, 4, 6]", "description": "Basic transformation"}
                    ],
                    "hints": [
                        "Start by initializing an empty list to store results",
                        "Use a for loop to iterate through each item",
                        "Apply the transformation and append to your result list"
                    ],
                    "time_complexity": "O(n) - linear time for single pass through items",
                    "space_complexity": "O(n) - storing results for all items"
                },
                {
                    "tier": "practice",
                    "name": "Practice Exercise",
                    "problem": f"Now apply what you learned! Implement a {topic} solution for a slightly different problem. This time you'll have less guidance.",
                    "starter_code": f"# Practice Exercise: {topic}\ndef practice_{topic.lower().replace(' ', '_')}(data, target):\n    '''\n    Find and process items matching target.\n    \n    Args:\n        data: List of items to search\n        target: Value to match\n    \n    Returns:\n        List of matching items\n    '''\n    # TODO: Implement the solution\n    pass",
                    "solution": f"# Practice Solution\ndef practice_{topic.lower().replace(' ', '_')}(data, target):\n    matches = []\n    for item in data:\n        if matches_target(item, target):\n            matches.append(item)\n    return matches\n\ndef matches_target(item, target):\n    return item == target",
                    "pseudocode": "1. Initialize empty matches list\n2. Loop through data\n3. If item matches target, add to matches\n4. Return matches",
                    "visual_steps": [
                        "Scan through the data collection",
                        "Check each item against target criteria",
                        "Collect and return all matches"
                    ],
                    "test_cases": [
                        {"input": "[1,2,3,2,4], 2", "expected": "[2, 2]", "description": "Find all matches"},
                        {"input": "[], 5", "expected": "[]", "description": "Empty input edge case"}
                    ],
                    "hints": [
                        "You'll need a way to collect matching items",
                        "Consider what condition determines a match",
                        "Don't forget to handle the empty input case"
                    ],
                    "time_complexity": "O(n)",
                    "space_complexity": "O(k) where k is number of matches"
                },
                {
                    "tier": "challenge",
                    "name": "Challenge Problem",
                    "problem": f"Real-world challenge: Design a robust {topic} system that handles multiple scenarios, edge cases, and performance requirements. This simulates a production-level problem.",
                    "starter_code": f"# Challenge: {topic}\nclass {topic.replace(' ', '')}Processor:\n    '''\n    Production-grade processor for {topic}.\n    '''\n    \n    def __init__(self, config):\n        self.config = config\n    \n    def process_batch(self, items, filter_fn=None):\n        '''\n        Process multiple items with optional filtering.\n        \n        Args:\n            items: List of items\n            filter_fn: Optional filter function\n        \n        Returns:\n            Processed results\n        '''\n        # TODO: Implement batch processing\n        pass\n    \n    def validate(self, result):\n        '''Validate result meets requirements.'''\n        # TODO: Add validation\n        pass",
                    "solution": f"# Challenge Solution\nclass {topic.replace(' ', '')}Processor:\n    def __init__(self, config):\n        self.config = config\n        self.cache = {{}}\n    \n    def process_batch(self, items, filter_fn=None):\n        results = []\n        for item in items:\n            if filter_fn is None or filter_fn(item):\n                result = self._process(item)\n                results.append(result)\n        return results\n    \n    def _process(self, item):\n        if item in self.cache:\n            return self.cache[item]\n        result = self._compute(item)\n        self.cache[item] = result\n        return result\n    \n    def validate(self, result):\n        return result is not None and len(result) >= 0",
                    "pseudocode": "1. Initialize processor with config\n2. For batch processing:\n   a. Apply filter if provided\n   b. Process each item (with caching)\n   c. Collect results\n3. Validate output before returning",
                    "visual_steps": [
                        "Processor initialized with configuration",
                        "Batch items flow through filter",
                        "Processing with intelligent caching",
                        "Validation before final output"
                    ],
                    "test_cases": [
                        {"input": "[1,2,3,4,5], filter even", "expected": "[2, 4]", "description": "Batch with filter"},
                        {"input": "[], any", "expected": "[]", "description": "Empty batch"},
                        {"input": "large_dataset, None", "expected": "processed", "description": "Performance test"}
                    ],
                    "hints": [
                        "Think about efficiency - can you avoid reprocessing?",
                        "Consider what validation means for your output",
                        "Design for extensibility with the filter function"
                    ],
                    "time_complexity": "O(n) with O(1) cache lookups",
                    "space_complexity": "O(n) for cache storage"
                }
            ],
            "common_bugs": self._generate_fallback_bugs(topic, language),
            "complexity_analysis": {
                "time_complexity": "O(n) linear - each item processed once",
                "space_complexity": "O(n) - storing results proportional to input",
                "why_it_matters": f"Understanding {topic} complexity helps you scale to large datasets and identify bottlenecks."
            },
            "key_takeaways": [
                f"Mastered the fundamental pattern for {topic} problems",
                "Learned to identify and avoid common implementation bugs",
                "Can apply these concepts to real-world scenarios"
            ],
            "format": "code_exercise",
            "metadata": {
                "topic": topic,
                "agent": "code",
                "language": language,
                "difficulty": difficulty,
                "mastery_level": mastery,
                "is_weak_point": is_weak_point,
                "num_exercises": 3,
                "has_common_bugs": True,
                "has_complexity_analysis": True,
                "tier_structure": ["guided", "practice", "challenge"],
                "fallback": True,
            },
            "faithfulness": {
                "score": 0.0,
                "verified": False,
                "total_claims": 0,
                "supported_claims": 0,
                "unverifiable_claims": 0,
                "citations": [],
            },
            "sources": [],
        }
