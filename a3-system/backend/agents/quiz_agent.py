"""
Quiz Agent for generating adaptive assessment questions.

Generates personalized quizzes that adapt based on:
- Complexity level (beginner, standard, complex, advanced)
- Student's knowledge mastery
- Attempt number (different questions on retry)
- Question type distribution per spec
"""

import json
import random
from typing import Any, Dict, List, Optional

from agents.base_agent import BaseAgent
from core.faithfulness_checker import faithfulness_checker
from core.llm_client import llm_client
from core.logging import get_logger
from rag.vector_store import get_vector_store

logger = get_logger(__name__)

# Complexity level to question count mapping
COMPLEXITY_QUESTION_COUNT = {
    "beginner": 5,
    "standard": 8,
    "complex": 10,
    "advanced": 12,
}

# Question type distribution by complexity
# ALL distributions include exactly 2 short_answer questions
QUESTION_DISTRIBUTION = {
    5: {   # Beginner: 2 MCQ + 1 True/False + 2 Short Answer
        "multiple_choice": 2,
        "true_false": 1,
        "scenario_based": 0,
        "short_answer": 2,
        "coding": 0,
    },
    8: {   # Standard: 3 MCQ + 1 True/False + 1 Scenario + 2 Short Answer + 1 Coding (replaces scenario if no coding)
        "multiple_choice": 3,
        "true_false": 1,
        "scenario_based": 1,
        "short_answer": 2,
        "coding": 1,
    },
    10: {  # Complex: 4 MCQ + 1 True/False + 1 Scenario + 2 Short Answer + 2 Coding
        "multiple_choice": 4,
        "true_false": 1,
        "scenario_based": 1,
        "short_answer": 2,
        "coding": 2,
    },
    12: {  # Advanced: 5 MCQ + 1 True/False + 1 Scenario + 2 Short Answer + 3 Coding
        "multiple_choice": 5,
        "true_false": 1,
        "scenario_based": 1,
        "short_answer": 2,
        "coding": 3,
    },
}

QUIZ_SYSTEM_PROMPT = """You are an expert assessment designer for adaptive learning systems.

Your task is to generate a milestone quiz with EXACTLY the specified number and types of questions.

CRITICAL RULES:
1. Generate EXACTLY the requested number of questions
2. Follow the exact question type distribution provided
3. Each question must match its specified type exactly
4. Never skip any mandatory fields

QUESTION TYPE DEFINITIONS AND RULES:

**multiple_choice**: Standard 4-option multiple choice
- "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
- "correct_answer": must match one option exactly
- Difficulty: mix of easy, medium, hard

**true_false**: True/False with justification requirement
- "options": ["True", "False"]
- "correct_answer": "True" or "False"
- "requires_justification": true
- "justification_prompt": "Explain your reasoning (1-2 sentences)"
- Frame as common misconception questions

**scenario_based**: Real-world application scenario
- Present a realistic situation a developer/student would face
- Ask student to apply knowledge to solve the problem
- Same options structure as multiple_choice
- Include practical context

**short_answer**: Written response (CRITICAL - EXACTLY 2 PER QUIZ)
- "type": "short_answer"
- "options": [] (empty array)
- "correct_answer": null
- "expected_response_guide": "Specific concepts a good answer should include"
- Frame as: "In 2-4 sentences, explain...", "In your own words, describe...", "Compare X and Y — when would you choose one over the other?"
- Must test DIFFERENT concepts (never duplicate concepts)
- Medium difficulty minimum
- Require EXPLAINING, COMPARING, or JUSTIFYING — not just naming
- Must be answerable from the milestone resources

SHORT ANSWER TEMPLATES BY TOPIC:
- Conceptual: "In 2-3 sentences, explain [concept] and why it matters in [context]."
- Process: "Walk through the steps of [process]. What would happen if you skipped [step]?"
- Security: "Why is [security concept] important? What could go wrong if ignored?"
- Comparison: "What is the difference between [A] and [B]? Give a real-world example of when to use each."

CITATION RULES:
When referencing information from the source material in questions or explanations, include inline citations using the format [Source: chunk_id].

Output Format:
Return ONLY a valid JSON object with this structure:
{
    "questions": [
        {
            "id": "q1",
            "type": "multiple_choice",
            "question": "Clear question text",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "correct_answer": "A. ...",
            "explanation": "Why correct (50-80 words)",
            "difficulty": "easy|medium|hard",
            "difficulty_score": 0.5,
            "topic_tested": "specific concept",
            "is_critical": false,
            "weight": 1.0,
            "hints": ["hint1", "hint2", "hint3"]
        }
    ],
    "estimated_time_minutes": 15,
    "total_points": 100,
    "focus_areas": ["topic1"]
}

MANDATORY RULES:
1. Generate EXACTLY the number of questions requested with EXACT types
2. Each multiple_choice must have EXACTLY 4 options
3. Each question must have 3 progressive hints
4. Explanations must be 50-80 words explaining WHY
5. short_answer questions: frame as "In your own words..." or "Explain why..."
6. true_false: Always include justification requirement
7. Mark is_critical: true for prerequisite concepts
8. Difficulty labels: "easy", "medium", or "hard" only
9. Use double quotes for ALL strings - valid JSON only
10. Never generate the same quiz twice - vary wording"""


class QuizAgent(BaseAgent):
    """Generates adaptive quizzes per Phase 1 specification."""

    def __init__(self, llm=None):
        super().__init__("Quiz", llm)
        self.vector_store = get_vector_store()
        self.max_rag_chunks = 3

    async def _retrieve_chunks(self, topic: str, node_id: str = "") -> List[Dict[str, Any]]:
        """Retrieve relevant RAG chunks for the topic."""
        results = []

        # Try embedding-based search first
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

        # Fallback to keyword search if no results or embeddings failed
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
        Generate an adaptive quiz for a topic.

        Args:
            topic: Topic to assess
            profile: Student profile dict with knowledge_base, weak_points, etc.
            node_id: Optional node ID to retrieve RAG chunks from
            **kwargs: complexity_level, attempt_number, num_questions, difficulty_override

        Returns:
            Dict with 'questions', 'metadata', 'faithfulness', 'sources'
        """
        # Retrieve RAG chunks for grounding
        rag_chunks = await self._retrieve_chunks(topic, node_id)
        rag_context = self._format_rag_context(rag_chunks)

        # Extract parameters
        complexity_level = kwargs.get("complexity_level", "standard")
        attempt_number = kwargs.get("attempt_number", 1)
        has_coding = kwargs.get("has_coding", False)
        previous_wrong_concepts = kwargs.get("previous_wrong_concepts", [])

        # Determine question count from complexity
        num_questions = kwargs.get("num_questions")
        if num_questions is None:
            num_questions = COMPLEXITY_QUESTION_COUNT.get(complexity_level, 8)

        # Get student mastery and profile
        knowledge_base = profile.get("knowledge_base", {})
        if not isinstance(knowledge_base, dict):
            knowledge_base = {}
        mastery = self._get_topic_mastery(topic, knowledge_base)
        weak_points = profile.get("weak_points", [])

        # Calculate difficulty distribution based on mastery
        difficulty_distribution = self._calculate_difficulty_distribution(mastery, num_questions)

        # Calculate question type distribution
        question_types = self._get_question_distribution(num_questions, has_coding)

        # Adjust for attempt number (make slightly easier on retries)
        if attempt_number > 1:
            difficulty_distribution = self._adjust_for_retry(difficulty_distribution, attempt_number)

        system_prompt = self._build_system_prompt(QUIZ_SYSTEM_PROMPT, profile)

        user_prompt = self._build_user_prompt(
            topic=topic,
            complexity_level=complexity_level,
            num_questions=num_questions,
            question_types=question_types,
            difficulty_distribution=difficulty_distribution,
            mastery=mastery,
            weak_points=weak_points,
            previous_wrong_concepts=previous_wrong_concepts,
            attempt_number=attempt_number,
            context=rag_context,
        )

        try:
            response = await self.llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7 if attempt_number > 1 else 0.5,  # More variation on retries
                max_tokens=2000
            )

            content = response["choices"][0]["message"].get("content")

            if not content:
                logger.warning(f"LLM returned empty content")
                raise ValueError("LLM returned empty content")

            # Parse JSON
            try:
                quiz_data = json.loads(content)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"JSON parse error: {e}")
                # Try to extract JSON from markdown
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        quiz_data = json.loads(json_match.group())
                    except (json.JSONDecodeError, TypeError) as e2:
                        logger.warning(f"Regex JSON parse also failed: {e2}")
                        raise ValueError("Could not parse quiz JSON")
                else:
                    raise ValueError("Could not parse quiz JSON")

            questions = quiz_data.get("questions", [])

            # Validate and normalize questions
            questions = self._validate_questions(questions, num_questions, question_types)

            # Calculate metadata
            estimated_time = self._calculate_time_limit(num_questions, has_coding)

            # Run faithfulness check on generated quiz content
            quiz_text = json.dumps(questions, indent=2)
            faithfulness_result = await faithfulness_checker.check_faithfulness(
                generated_text=quiz_text,
                source_chunks=[{"id": c["chunk_id"], "text": c["text"], "source": c["source"]} for c in rag_chunks],
                context=topic,
            )

            # Add warning if low faithfulness
            if faithfulness_result.warning_message:
                logger.warning(f"Quiz faithfulness warning: {faithfulness_result.warning_message}")

            return {
                "questions": questions,
                "format": "quiz",
                "metadata": {
                    "topic": topic,
                    "agent": "quiz",
                    "complexity_level": complexity_level,
                    "attempt_number": attempt_number,
                    "num_questions": len(questions),
                    "mastery_at_generation": mastery,
                    "difficulty_distribution": difficulty_distribution,
                    "question_types_used": question_types,
                    "estimated_time_minutes": estimated_time,
                    "focus_areas": weak_points or previous_wrong_concepts,
                    "has_coding": has_coding,
                    "time_limit_seconds": estimated_time * 60,
                    "rag_chunks_used": len(rag_chunks),
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
            logger.error(f"Quiz generation failed for {topic}: {e}. Using fallback quiz.")
            questions = self._generate_fallback_questions(topic, num_questions, question_types)
            return {
                "questions": questions,
                "format": "quiz",
                "metadata": {
                    "topic": topic,
                    "agent": "quiz",
                    "complexity_level": complexity_level,
                    "attempt_number": attempt_number,
                    "num_questions": len(questions),
                    "fallback": True,
                    "error": str(e),
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

    def _get_topic_mastery(self, topic: str, knowledge_base: Dict) -> float:
        """Get student's mastery level for a topic."""
        if not knowledge_base:
            return 0.0
        topic_lower = topic.lower().replace(" ", "_")
        # Try exact match first (handles Dict[str, float] schema)
        if topic_lower in knowledge_base:
            val = knowledge_base[topic_lower]
            if isinstance(val, (int, float)):
                return float(val)
            if isinstance(val, dict):
                return val.get("mastery", 0.0)
        # Fall back to substring matching
        for key, score in knowledge_base.items():
            key_lower = key.lower()
            if topic_lower in key_lower or key_lower in topic_lower:
                if isinstance(score, (int, float)):
                    return float(score)
                if isinstance(score, dict):
                    return score.get("mastery", 0.0)
        return 0.0

    def _calculate_difficulty_distribution(self, mastery: float, num_questions: int) -> Dict[str, int]:
        """
        Calculate how many easy/medium/hard questions based on mastery.

        Mastery 0.0-0.3: 60% easy, 30% medium, 10% hard
        Mastery 0.4-0.6: 20% easy, 50% medium, 30% hard
        Mastery 0.7-1.0: 0% easy, 40% medium, 60% hard
        """
        if mastery <= 0.3:
            easy_pct, medium_pct, hard_pct = 0.6, 0.3, 0.1
        elif mastery <= 0.6:
            easy_pct, medium_pct, hard_pct = 0.2, 0.5, 0.3
        else:
            easy_pct, medium_pct, hard_pct = 0.0, 0.4, 0.6

        # Calculate counts
        easy = max(0, int(num_questions * easy_pct))
        hard = max(1 if mastery > 0.5 else 0, int(num_questions * hard_pct))
        medium = num_questions - easy - hard

        # Ensure at least 2 medium questions
        if medium < 2:
            medium = 2
            # Adjust others
            if easy > 0:
                easy = max(0, num_questions - medium - hard)
            else:
                hard = max(0, num_questions - medium)

        return {
            "easy": easy,
            "medium": medium,
            "hard": hard,
        }

    def _get_question_distribution(self, num_questions: int, has_coding: bool) -> Dict[str, int]:
        """Get the question type distribution for this quiz."""
        distribution = QUESTION_DISTRIBUTION.get(num_questions, QUESTION_DISTRIBUTION[8]).copy()

        # If no coding component, redistribute coding questions to MCQ
        if not has_coding:
            coding_count = distribution.get("coding", 0)
            distribution["multiple_choice"] += coding_count
            distribution["coding"] = 0

        return distribution

    def _adjust_for_retry(self, difficulty_dist: Dict[str, int], attempt_number: int) -> Dict[str, int]:
        """Make quiz slightly easier on retries."""
        if attempt_number == 1:
            return difficulty_dist

        # Move one hard to medium, one medium to easy
        if difficulty_dist["hard"] > 1:
            difficulty_dist["hard"] -= 1
            difficulty_dist["medium"] += 1
        if difficulty_dist["medium"] > 2:
            difficulty_dist["medium"] -= 1
            difficulty_dist["easy"] += 1

        return difficulty_dist

    def _build_user_prompt(
        self,
        topic: str,
        complexity_level: str,
        num_questions: int,
        question_types: Dict[str, int],
        difficulty_distribution: Dict[str, int],
        mastery: float,
        weak_points: List[str],
        previous_wrong_concepts: List[str],
        attempt_number: int,
        context: str,
    ) -> str:
        """Build the user prompt for quiz generation."""

        # Build question type requirements section
        type_requirements = []
        for qtype, count in question_types.items():
            if count > 0:
                type_requirements.append(f"- {count} x {qtype}")

        # Build difficulty requirements
        difficulty_reqs = []
        for diff, count in difficulty_distribution.items():
            if count > 0:
                difficulty_reqs.append(f"- {count} questions at '{diff}' difficulty")

        focus_concepts = weak_points or previous_wrong_concepts

        prompt = f"""Generate a milestone quiz on: **{topic}**

QUIZ CONFIGURATION:
- Complexity Level: {complexity_level}
- Total Questions: {num_questions}
- Attempt Number: {attempt_number}
- Student Mastery: {mastery:.0%}

QUESTION TYPE DISTRIBUTION (MUST FOLLOW EXACTLY):
{chr(10).join(type_requirements)}

CRITICAL: There must be EXACTLY 2 short_answer questions, testing DIFFERENT concepts.

DIFFICULTY DISTRIBUTION:
{chr(10).join(difficulty_reqs)}

FOCUS AREAS:
- Target concepts: {', '.join(focus_concepts) if focus_concepts else 'balanced coverage'}
- Previous wrong concepts: {', '.join(previous_wrong_concepts) if previous_wrong_concepts else 'none'}

QUESTION TYPE RULES:
**multiple_choice**: 4 options, standard format
**true_false**: Must include "requires_justification": true and "justification_prompt" fields
**scenario_based**: Present real-world situation, ask application question
**short_answer**: CRITICAL RULES:
  - Exactly 2 per quiz, testing DIFFERENT concepts
  - Frame as "In 2-4 sentences, explain..." or "In your own words..."
  - Must require EXPLAINING, COMPARING, or JUSTIFYING
  - Include "expected_response_guide" listing what concepts to cover
  - Medium or Hard difficulty only
  - Both questions must test different concepts from the topic

CRITICAL REQUIREMENTS:
1. EXACTLY {num_questions} questions total
2. EXACTLY 2 short_answer questions testing DIFFERENT concepts
3. Short answers: One testing conceptual understanding, one testing application/analysis
4. Follow the question type distribution exactly
5. True/False: Always require 1-2 sentence justification
6. Include at least 1 question targeting: {', '.join(focus_concepts[:2]) if focus_concepts else 'core concepts'}
7. All questions must be answerable from the provided content
8. Never repeat concepts between the two short answer questions

SHORT ANSWER QUESTION EXAMPLES:
Good: "In 2-4 sentences, explain why you would use an IAM role instead of an IAM user for an EC2 instance that needs access to S3."
Good: "Compare horizontal and vertical scaling. When would you choose one over the other? Give a real-world example."
Bad: "What does IAM stand for?" (too simple, requires no explanation)
Bad: "Describe cloud computing." (too vague)

Content to base questions on:
{context if context else f'Generate questions from general knowledge of {topic}.'}

Return ONLY valid JSON with all questions."""

        return prompt

    def _validate_questions(
        self,
        questions: List[Dict],
        expected_count: int,
        question_types: Dict[str, int]
    ) -> List[Dict]:
        """Validate and normalize generated questions."""
        validated = []

        for i, q in enumerate(questions[:expected_count]):
            # Ensure ID
            if "id" not in q:
                q["id"] = f"q{i+1}"

            # Ensure type
            if "type" not in q:
                q["type"] = "multiple_choice"

            # Ensure options for MCQ
            if q["type"] == "multiple_choice":
                if not q.get("options") or len(q.get("options", [])) != 4:
                    q["options"] = ["A", "B", "C", "D"]
                if not q.get("correct_answer"):
                    q["correct_answer"] = q["options"][0]

            # Ensure True/False has justification fields
            if q["type"] == "true_false":
                q["options"] = ["True", "False"]
                q["requires_justification"] = True
                q["justification_prompt"] = q.get(
                    "justification_prompt",
                    "Explain your reasoning (1-2 sentences)"
                )
                if not q.get("correct_answer"):
                    q["correct_answer"] = "True"

            # Ensure short_answer has expected_response_guide
            if q["type"] == "short_answer":
                q["options"] = []
                q["correct_answer"] = None
                if "expected_response_guide" not in q:
                    q["expected_response_guide"] = "A good answer should explain the concept clearly in 2-4 sentences"

            # Ensure hints
            if len(q.get("hints", [])) < 3:
                default_hints = [
                    "Think about the key concepts",
                    "Consider what you've learned about this topic",
                    "Focus on the main principles"
                ]
                q["hints"] = q.get("hints", []) + default_hints
                q["hints"] = q["hints"][:3]

            # Ensure difficulty fields
            if "difficulty" not in q:
                q["difficulty"] = "medium"
            if "difficulty_score" not in q:
                score_map = {"easy": 0.3, "medium": 0.6, "hard": 0.9}
                q["difficulty_score"] = score_map.get(q["difficulty"], 0.6)

            # Ensure weight
            if "weight" not in q:
                q["weight"] = 1.5 if q.get("is_critical") else 1.0

            # Ensure explanation
            if "explanation" not in q:
                q["explanation"] = f"This question tests understanding of {q.get('topic_tested', 'the topic')}"

            validated.append(q)

        # If we don't have enough questions, generate fallbacks respecting type distribution
        current_types: Dict[str, int] = {}
        for q in validated:
            current_types[q.get("type", "multiple_choice")] = current_types.get(q.get("type", "multiple_choice"), 0) + 1

        while len(validated) < expected_count:
            # Find a question type that is still needed
            needed_type = "multiple_choice"
            for qtype, needed_count in question_types.items():
                if needed_count > current_types.get(qtype, 0):
                    needed_type = qtype
                    break

            fallback_q = self._create_fallback_question(len(validated) + 1, needed_type)
            validated.append(fallback_q)
            current_types[needed_type] = current_types.get(needed_type, 0) + 1

        return validated[:expected_count]

    def _create_fallback_question(self, q_num: int, q_type: str = "multiple_choice") -> Dict[str, Any]:
        """Create a single fallback question of the specified type."""
        if q_type == "true_false":
            return {
                "id": f"q{q_num}",
                "type": "true_false",
                "question": f"Question {q_num}: This statement about the topic is true.",
                "options": ["True", "False"],
                "correct_answer": "True",
                "requires_justification": True,
                "justification_prompt": "Explain your reasoning (1-2 sentences)",
                "explanation": "This is a fundamental concept that is correct.",
                "difficulty": "easy",
                "difficulty_score": 0.3,
                "topic_tested": "core concepts",
                "is_critical": False,
                "weight": 1.0,
                "hints": [
                    "Think about the definition",
                    "Consider the basic properties",
                    "What is always true?"
                ],
            }
        elif q_type == "short_answer":
            return {
                "id": f"q{q_num}",
                "type": "short_answer",
                "question": f"Question {q_num}: In 2-4 sentences, explain what this concept is and why it matters.",
                "options": [],
                "correct_answer": None,
                "expected_response_guide": "A good answer should define the concept and explain its importance",
                "explanation": "This concept is fundamental to understanding the topic.",
                "difficulty": "medium",
                "difficulty_score": 0.6,
                "topic_tested": "core concepts",
                "is_critical": False,
                "weight": 1.0,
                "hints": [
                    "Define it simply",
                    "Give a use case",
                    "Explain the benefit"
                ],
            }

        # Default multiple_choice
        return {
            "id": f"q{q_num}",
            "type": "multiple_choice",
            "question": f"Question {q_num}: Select the best description of this concept.",
            "options": [
                "A. A fundamental principle of the topic",
                "B. An advanced technique rarely used",
                "C. A deprecated approach from older systems",
                "D. A hardware-specific implementation"
            ],
            "correct_answer": "A. A fundamental principle of the topic",
            "explanation": "This is a core concept that forms the foundation of understanding in this topic.",
            "difficulty": "medium",
            "difficulty_score": 0.6,
            "topic_tested": "core concepts",
            "is_critical": False,
            "weight": 1.0,
            "hints": [
                "Think about what is most fundamental",
                "Consider what you would learn first",
                "Focus on the essential principles"
            ],
        }

    def _calculate_time_limit(self, num_questions: int, has_coding: bool) -> int:
        """Calculate suggested time limit in minutes."""
        # Base time: ~2 minutes per question
        base_time = num_questions * 2

        # Add time for complexity
        if num_questions >= 10:
            base_time += 5
        if num_questions >= 12:
            base_time += 5

        # Add time for coding if present
        if has_coding:
            base_time += 5

        return min(base_time, 40)  # Cap at 40 minutes

    def _generate_fallback_questions(
        self,
        topic: str,
        num_questions: int,
        question_types: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """Generate basic fallback questions when LLM fails."""
        questions = []

        # Generate based on question type distribution
        q_num = 1
        for qtype, count in question_types.items():
            for _ in range(count):
                if qtype == "multiple_choice":
                    questions.append({
                        "id": f"q{q_num}",
                        "type": "multiple_choice",
                        "question": f"Question {q_num}: Which of the following best describes {topic}?",
                        "options": [
                            f"A. A core concept in {topic}",
                            "B. An unrelated technology",
                            "C. A hardware component",
                            "D. A deprecated approach"
                        ],
                        "correct_answer": f"A. A core concept in {topic}",
                        "explanation": f"{topic} is a fundamental concept that students must understand.",
                        "difficulty": "medium",
                        "difficulty_score": 0.6,
                        "topic_tested": topic,
                        "hints": ["Think about the basics", "Consider the definition", "What is it used for?"],
                    })
                elif qtype == "true_false":
                    questions.append({
                        "id": f"q{q_num}",
                        "type": "true_false",
                        "question": f"Question {q_num}: {topic} is essential for modern cloud computing.",
                        "options": ["True", "False"],
                        "correct_answer": "True",
                        "requires_justification": True,
                        "justification_prompt": "Explain your reasoning (1-2 sentences)",
                        "explanation": f"{topic} is indeed essential for modern cloud computing implementations.",
                        "difficulty": "easy",
                        "difficulty_score": 0.3,
                        "topic_tested": topic,
                        "hints": ["Think about modern requirements", "Is it widely used?", "Consider industry standards"],
                    })
                elif qtype == "short_answer":
                    questions.append({
                        "id": f"q{q_num}",
                        "type": "short_answer",
                        "question": f"Question {q_num}: In 2-4 sentences, explain what {topic} is and why it matters.",
                        "options": [],
                        "correct_answer": None,
                        "expected_response_guide": "A good answer should define the concept and explain its importance",
                        "explanation": f"{topic} is a fundamental concept that enables scalable and efficient systems.",
                        "difficulty": "medium",
                        "difficulty_score": 0.6,
                        "topic_tested": topic,
                        "hints": ["Define it simply", "Give a use case", "Explain the benefit"],
                    })

                q_num += 1
                if q_num > num_questions:
                    break
            if q_num > num_questions:
                break

        return questions[:num_questions]
