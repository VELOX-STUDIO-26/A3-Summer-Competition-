"""Test script to debug the 500 error on /api/quiz/generate"""
import sys
import os
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from models.database import get_db, db_manager

# Ensure DB is initialized
db_manager.initialize()

client = TestClient(app)

print("Testing POST /api/quiz/generate...")
try:
    response = client.post(
        "/api/quiz/generate",
        json={
            "student_id": "test_student_123",
            "topic": "Cloud Computing",
            "node_id": "N01",
            "num_questions": 5,
            "difficulty": 0.5
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:2000]}")
except Exception as e:
    print(f"EXCEPTION: {type(e).__name__}: {e}")
    traceback.print_exc()
