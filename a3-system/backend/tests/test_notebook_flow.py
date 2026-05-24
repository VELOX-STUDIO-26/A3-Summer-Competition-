"""Test the flow from path generation to notebook page functionality."""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_flow():
    print("=" * 60)
    print("Testing Path → Notebook → Content → Tutor Flow")
    print("=" * 60)
    
    # Use the existing test student ID from previous tests
    student_id = "7ec1c8ecf10f5837"
    
    # 1. Use an existing graph (skip generation to save time)
    print("\n1. Finding existing hierarchical graph...")
    
    # Get top-rated paths to find an existing graph
    top_response = requests.get(
        f"{BASE_URL}/api/analytics/paths/top-rated",
        params={"min_ratings": 0, "limit": 1}
    )
    
    if top_response.status_code != 200 or not top_response.json():
        print("   No existing graphs found, generating new one...")
        gen_response = requests.post(
            f"{BASE_URL}/api/hierarchical/generate",
            params={"student_id": student_id},
            json={
                "subject": "Python Basics",
                "goals": ["Learn Python fundamentals"],
                "knowledge_base": {},
                "cognitive_style": "mixed",
                "learning_pace": 0.5
            },
            timeout=180
        )
        
        if gen_response.status_code != 200:
            print(f"   ✗ Failed to generate graph: {gen_response.status_code}")
            print(f"     {gen_response.text[:200]}")
            return False
        
        graph_data = gen_response.json()
        graph_id = graph_data.get("graph", {}).get("id")
        subject = graph_data.get("graph", {}).get("subject")
        main_topics = graph_data.get("graph", {}).get("main_topics", [])
    else:
        # Use existing graph
        existing = top_response.json()[0]
        graph_id = existing.get("id")
        subject = existing.get("subject")
        print(f"   ✓ Using existing graph: {graph_id}")
        print(f"     Subject: {subject}")
        
        # Fetch full graph details
        get_response = requests.get(f"{BASE_URL}/api/hierarchical/{graph_id}")
        if get_response.status_code != 200:
            print(f"   ✗ Failed to get graph: {get_response.status_code}")
            return False
        main_topics = get_response.json().get("main_topics", [])
    
    print(f"   ✓ Generated graph: {graph_id}")
    print(f"     Subject: {subject}")
    print(f"     Main topics: {len(main_topics)}")
    
    if not main_topics:
        print("   ✗ No main topics generated!")
        return False
    
    # 2. Retrieve the graph (simulating notebook page load)
    print("\n2. Retrieving graph (notebook page load)...")
    get_response = requests.get(f"{BASE_URL}/api/hierarchical/{graph_id}")
    
    if get_response.status_code != 200:
        print(f"   ✗ Failed to get graph: {get_response.status_code}")
        return False
    
    retrieved = get_response.json()
    print(f"   ✓ Retrieved graph: {retrieved.get('subject')}")
    print(f"     Topics: {[t.get('title') for t in retrieved.get('main_topics', [])[:3]]}...")
    
    # Get first topic for content generation
    first_topic = main_topics[0].get("title", "Python Basics")
    print(f"     Current topic for learning: {first_topic}")
    
    # 3. Test resource generation (content agents)
    print(f"\n3. Testing resource generation for '{first_topic}'...")
    resource_response = requests.post(
        f"{BASE_URL}/api/resources/generate",
        json={
            "topic": first_topic,
            "student_id": student_id,
            "profile": {"cognitive_style": "mixed"},
            "agents": ["notes_agent"]  # Just test one agent for speed
        },
        timeout=120
    )
    
    if resource_response.status_code != 200:
        print(f"   ✗ Failed to generate resources: {resource_response.status_code}")
        print(f"     {resource_response.text[:200]}")
    else:
        resources = resource_response.json()
        print(f"   ✓ Resources generated:")
        for r in resources.get("resources", []):
            print(f"     - {r.get('type')}: {r.get('topic')}")
    
    # 4. Test tutor session creation
    print("\n4. Testing tutor session creation...")
    session_response = requests.post(
        f"{BASE_URL}/api/tutor/sessions",
        json={
            "student_id": student_id,
            "current_topic": first_topic
        }
    )
    
    if session_response.status_code not in [200, 201]:
        print(f"   ✗ Failed to create session: {session_response.status_code}")
        print(f"     {session_response.text[:500]}")
        return False
    
    session_data = session_response.json()
    session_id = session_data.get("session_id")
    print(f"   ✓ Session created: {session_id}")
    print(f"     Title: {session_data.get('title')}")
    
    # 5. Test sending a message to tutor
    print("\n5. Testing tutor message...")
    msg_response = requests.post(
        f"{BASE_URL}/api/tutor/sessions/{session_id}/messages",
        json={
            "content": "What is Python?"
        },
        timeout=60
    )
    
    if msg_response.status_code != 200:
        print(f"   ✗ Failed to send message: {msg_response.status_code}")
        print(f"     {msg_response.text[:200]}")
    else:
        msg_data = msg_response.json()
        response_text = msg_data.get("response", "")[:100]
        print(f"   ✓ Tutor responded: {response_text}...")
    
    # 6. Test listing sessions
    print("\n6. Testing session listing...")
    list_response = requests.get(
        f"{BASE_URL}/api/tutor/sessions",
        params={"student_id": student_id}
    )
    
    if list_response.status_code != 200:
        print(f"   ✗ Failed to list sessions: {list_response.status_code}")
    else:
        sessions = list_response.json()
        print(f"   ✓ Found {len(sessions)} session(s)")
    
    print("\n" + "=" * 60)
    print("Flow Test Complete!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    test_flow()
