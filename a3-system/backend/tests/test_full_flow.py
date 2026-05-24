"""
Integration test for the full learning path flow.
Tests: Generation -> Validation -> Rating -> Analytics
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"
TEST_STUDENT_ID = "test_integration_student"


def test_health():
    """Test API is running."""
    print("\n1. Testing API health...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print(f"   ✓ API is healthy: {r.json()['status']}")
    return True


def test_generate_path():
    """Test generating a learning path."""
    print("\n2. Testing path generation...")
    
    payload = {
        "subject": "Python Programming Basics",
        "goals": ["Learn fundamentals", "Build simple projects"],
        "knowledge_base": {},
        "cognitive_style": "mixed",
        "learning_pace": 0.5
    }
    
    r = requests.post(
        f"{BASE_URL}/api/hierarchical/generate",
        params={"student_id": TEST_STUDENT_ID, "is_premium": "false"},
        json=payload
    )
    
    if r.status_code != 200:
        print(f"   ✗ Generation failed: {r.status_code} - {r.text[:200]}")
        return None
    
    data = r.json()
    graph = data["graph"]
    
    print(f"   ✓ Generated path: {graph['subject']}")
    print(f"     - ID: {graph['id']}")
    print(f"     - Main topics: {graph['main_topic_count']}")
    print(f"     - Total subtopics: {graph['total_subtopic_count']}")
    print(f"     - Estimated time: {graph['total_estimated_minutes']} minutes")
    print(f"     - Is new: {data['is_new']}")
    
    return graph["id"]


def test_get_path(graph_id):
    """Test retrieving a path."""
    print("\n3. Testing path retrieval...")
    
    r = requests.get(f"{BASE_URL}/api/hierarchical/{graph_id}")
    
    if r.status_code != 200:
        print(f"   ✗ Retrieval failed: {r.status_code} - {r.text[:200]}")
        return False
    
    graph = r.json()
    print(f"   ✓ Retrieved path: {graph['subject']}")
    print(f"     - Topics: {[t['title'] for t in graph['main_topics'][:3]]}...")
    
    return True


def test_submit_rating(graph_id):
    """Test submitting a rating."""
    print("\n4. Testing rating submission...")
    
    payload = {
        "overall_rating": 4,
        "content_quality": 4,
        "difficulty_appropriateness": 5,
        "structure_clarity": 4,
        "feedback_text": "Great learning path! Well structured.",
        "would_recommend": True
    }
    
    r = requests.post(
        f"{BASE_URL}/api/analytics/paths/{graph_id}/rate",
        params={"student_id": TEST_STUDENT_ID},
        json=payload
    )
    
    if r.status_code != 200:
        print(f"   ✗ Rating failed: {r.status_code} - {r.text[:200]}")
        return False
    
    data = r.json()
    print(f"   ✓ Rating submitted: {data['message']}")
    print(f"     - Rating ID: {data['rating_id']}")
    
    return True


def test_get_ratings(graph_id):
    """Test getting ratings for a path."""
    print("\n5. Testing ratings retrieval...")
    
    r = requests.get(f"{BASE_URL}/api/analytics/paths/{graph_id}/ratings")
    
    if r.status_code != 200:
        print(f"   ✗ Get ratings failed: {r.status_code} - {r.text[:200]}")
        return False
    
    data = r.json()
    print(f"   ✓ Ratings retrieved:")
    print(f"     - Total ratings: {data['total_ratings']}")
    print(f"     - Average rating: {data['average_rating']}")
    print(f"     - Would recommend: {data['would_recommend_percentage']}%")
    
    return True


def test_start_session(graph_id):
    """Test starting a learning session."""
    print("\n6. Testing session start...")
    
    payload = {
        "graph_id": graph_id,
        "device_type": "desktop"
    }
    
    r = requests.post(
        f"{BASE_URL}/api/analytics/sessions/start",
        params={"student_id": TEST_STUDENT_ID},
        json=payload
    )
    
    if r.status_code != 200:
        print(f"   ✗ Session start failed: {r.status_code} - {r.text[:200]}")
        return None
    
    data = r.json()
    print(f"   ✓ Session started: {data['session_id']}")
    
    return data["session_id"]


def test_end_session(session_id):
    """Test ending a learning session."""
    print("\n7. Testing session end...")
    
    # Simulate some learning time
    time.sleep(1)
    
    payload = {
        "resources_viewed": 5,
        "interactions_count": 20,
        "quiz_attempts": 1
    }
    
    r = requests.post(
        f"{BASE_URL}/api/analytics/sessions/{session_id}/end",
        json=payload
    )
    
    if r.status_code != 200:
        print(f"   ✗ Session end failed: {r.status_code} - {r.text[:200]}")
        return False
    
    data = r.json()
    print(f"   ✓ Session ended:")
    print(f"     - Duration: {data['duration_seconds']} seconds")
    
    return True


def test_path_analytics(graph_id):
    """Test getting path analytics."""
    print("\n8. Testing path analytics...")
    
    r = requests.get(f"{BASE_URL}/api/analytics/paths/{graph_id}/analytics")
    
    if r.status_code != 200:
        print(f"   ✗ Analytics failed: {r.status_code} - {r.text[:200]}")
        return False
    
    data = r.json()
    print(f"   ✓ Analytics computed:")
    print(f"     - Total students: {data['total_students']}")
    print(f"     - Quality score: {data['quality_score']}")
    print(f"     - Completion rate: {data['completion_rate']}")
    
    return True


def test_top_rated_paths():
    """Test getting top-rated paths."""
    print("\n9. Testing top-rated paths...")
    
    r = requests.get(
        f"{BASE_URL}/api/analytics/paths/top-rated",
        params={"min_ratings": 1, "limit": 5}
    )
    
    if r.status_code != 200:
        print(f"   ✗ Top rated failed: {r.status_code} - {r.text[:200]}")
        return False
    
    data = r.json()
    print(f"   ✓ Top-rated paths: {len(data)} found")
    for path in data[:3]:
        print(f"     - {path['subject']}: {path['avg_rating']}★ ({path['rating_count']} ratings)")
    
    return True


def run_full_flow():
    """Run the complete integration test."""
    print("\n" + "="*60)
    print("Full Flow Integration Test")
    print("="*60)
    
    results = []
    
    # 1. Health check
    results.append(("Health Check", test_health()))
    
    # 2. Generate path
    graph_id = test_generate_path()
    results.append(("Generate Path", graph_id is not None))
    
    if not graph_id:
        print("\n✗ Cannot continue without a generated path")
        return False
    
    # 3. Get path
    results.append(("Get Path", test_get_path(graph_id)))
    
    # 4. Submit rating
    results.append(("Submit Rating", test_submit_rating(graph_id)))
    
    # 5. Get ratings
    results.append(("Get Ratings", test_get_ratings(graph_id)))
    
    # 6. Start session
    session_id = test_start_session(graph_id)
    results.append(("Start Session", session_id is not None))
    
    if session_id:
        # 7. End session
        results.append(("End Session", test_end_session(session_id)))
    
    # 8. Path analytics
    results.append(("Path Analytics", test_path_analytics(graph_id)))
    
    # 9. Top rated paths
    results.append(("Top Rated Paths", test_top_rated_paths()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Results Summary")
    print("="*60)
    
    passed = 0
    failed = 0
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_full_flow()
    exit(0 if success else 1)
