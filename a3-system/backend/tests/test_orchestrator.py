"""Unit tests for Orchestrator.decide_agents — pure routing logic."""

from agents.orchestrator import Orchestrator


def _orch():
    return Orchestrator()


def test_default_agents_for_neutral_profile():
    agents = _orch().decide_agents(
        {"cognitive_style": "mixed", "weak_points": [], "content_preferences": []},
        "Algebra basics",
    )
    assert "content" in agents
    assert "quiz" in agents
    assert "mindmap" in agents
    assert "code" not in agents
    assert "media" not in agents


def test_visual_style_adds_and_promotes_media_and_mindmap():
    agents = _orch().decide_agents(
        {"cognitive_style": "visual", "weak_points": [], "content_preferences": []},
        "Algebra basics",
    )
    assert "media" in agents
    # Visual learners get mindmap promoted to front
    assert agents.index("mindmap") < agents.index("content")
    # Media should be promoted near the front for visual learners
    assert agents.index("media") <= agents.index("content")


def test_video_preference_adds_media():
    agents = _orch().decide_agents(
        {"cognitive_style": "mixed", "weak_points": [], "content_preferences": ["video"]},
        "Algebra basics",
    )
    assert "media" in agents


def test_programming_topic_triggers_code_agent():
    for topic in ["Docker basics", "Kubernetes networking", "Python decorators",
                  "REST API design", "Serverless functions"]:
        agents = _orch().decide_agents(
            {"cognitive_style": "mixed", "weak_points": [], "content_preferences": []},
            topic,
        )
        assert "code" in agents, f"code agent missing for topic={topic!r}"


def test_non_programming_topic_no_code_agent():
    agents = _orch().decide_agents(
        {"cognitive_style": "mixed", "weak_points": [], "content_preferences": []},
        "World history overview",
    )
    assert "code" not in agents


def test_kinesthetic_style_promotes_quiz_and_code():
    agents = _orch().decide_agents(
        {"cognitive_style": "kinesthetic", "weak_points": [], "content_preferences": []},
        "Docker containers",
    )
    # quiz must be first
    assert agents[0] == "quiz"
    # code must be second
    assert "code" in agents
    assert agents.index("code") == 1


def test_many_weak_points_promote_quiz_first():
    agents = _orch().decide_agents(
        {
            "cognitive_style": "mixed",
            "weak_points": ["a", "b", "c"],
            "content_preferences": [],
        },
        "Algebra",
    )
    assert agents[0] == "quiz"


def test_fast_learner_keeps_default_agents():
    # learning_pace > 0.8 should retain core agents and any added ones,
    # but should not silently drop content/quiz/mindmap.
    agents = _orch().decide_agents(
        {
            "cognitive_style": "mixed",
            "weak_points": [],
            "content_preferences": [],
            "learning_pace": 0.95,
        },
        "Algebra",
    )
    for must in ("content", "quiz", "mindmap"):
        assert must in agents


def test_decide_agents_is_pure_function():
    """Calling twice with same inputs returns equal lists (no hidden state)."""
    profile = {"cognitive_style": "visual", "weak_points": [], "content_preferences": []}
    o = _orch()
    first = o.decide_agents(profile, "Docker")
    second = o.decide_agents(profile, "Docker")
    assert first == second
