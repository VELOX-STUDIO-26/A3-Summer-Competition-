# A3 Learning System - Getting Started Tutorial

**Difficulty**: Beginner  
**Time**: 30 minutes  
**Prerequisites**: Basic command line knowledge, Docker Desktop installed

---

## Overview

In this tutorial, you'll:
1. Set up the A3 Learning System on your local machine
2. Create an account and complete your learner profile
3. Generate personalized learning resources
4. Explore the AI tutor and take an adaptive quiz
5. View your learning analytics

By the end, you'll understand how A3's 15+ AI agents work together to create a personalized learning experience.

---

## Step 1: Installation (10 minutes)

### 1.1 Clone the Repository

```bash
git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git
cd "A3-Summer-Competition-"
```

### 1.2 Configure Environment Variables

```bash
cd a3-system
copy .env.template .env
```

Open `.env` in your favorite text editor and set at minimum:

```ini
OPENROUTER_API_KEY=sk-or-v1-your-real-key-here
SECRET_KEY=any-long-random-string-for-jwt
```

> **Tip**: Get a free OpenRouter API key at [openrouter.ai/keys](https://openrouter.ai/keys)

### 1.3 Start Data Services

```bash
docker-compose up -d postgres redis weaviate
```

Verify all services are healthy:

```bash
docker-compose ps
```

You should see all three services with status `healthy`.

---

## Step 2: Start the Backend (5 minutes)

### 2.1 Create Python Virtual Environment

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate   # Mac/Linux
```

### 2.2 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.3 Launch Backend

```bash
cd backend
python main.py
```

You should see:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

> **Note**: The first launch runs database migrations, seeds the knowledge graph, and indexes RAG chunks. This may take 1-2 minutes.

Verify the backend is running:
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

## Step 3: Start the Frontend (5 minutes)

Open a **new terminal** (keep the backend running):

```bash
cd "a3-system/frontend/web"
npm install
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

Open your browser to [http://localhost:3000](http://localhost:3000).

---

## Step 4: Create Your Account (2 minutes)

### 4.1 Register

1. Click **"Get Started"** or **"Sign Up"**
2. Enter your email address
3. Create a username
4. Set a secure password
5. Click **"Create Account"**

### 4.2 Verify Setup

You should be redirected to the **profiling chat**. If you see the chat interface with a welcome message, everything is working!

---

## Step 5: Complete Your Learner Profile (5 minutes)

This is where A3's magic begins. Instead of filling out forms, you'll have a natural conversation.

### 5.1 Chat with the Profile Bot

The bot will ask about:
- Your learning goals (e.g., "I want to learn cloud computing")
- Your prior experience (e.g., "I know basic Linux but not containers")
- Your learning preferences (e.g., "I prefer diagrams over long text")
- Your timeline (e.g., "I have 3 months before my exam")

**Example conversation:**

> **Bot**: Hi! I'm here to understand how you learn best. What brings you to A3 today?
>
> **You**: I want to learn Docker and Kubernetes for my DevOps role
>
> **Bot**: Great choice! How much experience do you have with containers?
>
> **You**: I know what Docker is but I've never actually used it
>
> **Bot**: Noted! Do you prefer learning from videos, reading documentation, or hands-on exercises?
>
> **You**: I learn best by doing practical exercises

### 5.2 Profile Generated

After 5-8 messages, the system automatically generates your profile:

```json
{
  "knowledge_base": {
    "docker": 0.2,
    "kubernetes": 0.0,
    "linux": 0.6
  },
  "cognitive_style": "kinesthetic",
  "weak_points": ["containerization", "orchestration"],
  "goals": ["Learn Docker", "Learn Kubernetes", "DevOps preparation"],
  "learning_pace": 0.7,
  "content_preferences": ["interactive", "video"]
}
```

Click **"Continue to Dashboard"** when ready.

---

## Step 6: Generate Your First Learning Resources (5 minutes)

### 6.1 Select a Topic

On the dashboard (notebook page):
1. You'll see a **cloud of topics** from the knowledge graph
2. Click on **"Docker"** (or any topic that interests you)
3. Click **"Generate Resources"**

### 6.2 Watch the Agents Work

You'll see a live progress panel showing:

```
Orchestrator: Analyzing profile and planning generation...
Scholar:      Generating lecture notes...           [████░░░░░░] 40%
Mapper:       Creating mind map...                  [██████░░░░] 60%
Sage:         Building quiz...                      [███░░░░░░░] 30%
Director:     Scripting video...                    [██░░░░░░░░] 20%
Architect:    Preparing coding exercise...          [░░░░░░░░░░] 0%
```

Wait 30-60 seconds for all agents to complete.

### 6.3 Explore Generated Content

Once complete, you'll see:

**Lecture Notes**
Markdown-formatted explanation tailored to your beginner level with practical examples.

**Mind Map**
Interactive SVG showing Docker concepts and their relationships.

**Quiz**
5 questions adapted to your knowledge level (not too easy, not too hard).

**Video Script**
Script with narration for a visual explanation.

**Coding Exercise**
A hands-on Docker task with starter code and test cases.

---

## Step 7: Take an Adaptive Quiz (3 minutes)

### 7.1 Start the Quiz

1. Click on the **Quiz** card
2. Read the first question carefully
3. Select your answer or type it (for open-ended questions)
4. Click **"Next"**

### 7.2 Adaptive Difficulty

Notice how the questions adapt:
- If you answer correctly -> Next question is slightly harder
- If you answer incorrectly -> System provides a hint, next question is easier

### 7.3 Submit and View Results

After completing all questions:
1. Click **"Submit Quiz"**
2. View your score and detailed feedback
3. See which topics need more practice

---

## Step 8: Chat with the AI Tutor (5 minutes)

### 8.1 Open the Tutor Panel

Click the **"AI Tutor"** button (usually in the sidebar or floating button).

### 8.2 Ask a Question

Try asking something specific:

> "Why do containers need a base image?"

The tutor will:
1. Retrieve relevant context from the knowledge base (RAG)
2. Generate a response grounded in your current topic
3. Stream the response word-by-word
4. Suggest follow-up questions

### 8.3 Try Voice Input

Click the **microphone icon** and ask:

> "Explain the difference between Docker images and containers"

The system will:
1. Convert your speech to text (ASR)
2. Process the question
3. Generate a response
4. Optionally read it aloud (TTS)

### 8.4 Upload an Image

Try uploading a screenshot or diagram:

1. Click the **attachment icon**
2. Select an image
3. Ask: "Can you explain this architecture diagram?"

The Vision LLM agent will analyze the image and provide an explanation.

---

## Step 9: View Your Learning Path (2 minutes)

### 9.1 Navigate to Learning Path

Click **"My Path"** in the navigation.

### 9.2 Explore the Graph

You'll see:
- **Completed nodes** (green)
- **Current milestone** (blue, pulsing)
- **Locked nodes** (gray)
- **Recommended next steps** (highlighted)

### 9.3 Path Adaptation

Based on your quiz performance, the path may have adapted:
- Added prerequisite topics if you struggled
- Unlocked advanced topics if you excelled
- Suggested tutoring sessions for weak areas

---

## Step 10: Check Your Analytics (2 minutes)

### 10.1 Open Analytics Dashboard

Click **"Analytics"** in the navigation or profile menu.

### 10.2 Review Metrics

You'll see:
- **Topic Mastery**: Scores for each topic (0.0-1.0)
- **Learning Velocity**: How quickly you're progressing
- **Engagement**: Time spent, resources consumed
- **Weak Points**: Topics needing attention
- **Predictions**: Estimated completion dates

### 10.3 Profile Evolution

Notice how your profile has evolved since onboarding:
- Knowledge base scores updated based on quiz performance
- Weak points refined
- Learning pace calibrated

---

## Next Steps

Now that you've completed the tutorial, explore these advanced features:

### Generate More Resources
- Try different topics (Kubernetes, AWS, System Design)
- Notice how content adapts to your evolving profile

### Deep Dive into Coding
- Complete the Docker coding exercise
- Submit your solution to the Judge0 sandbox
- Get automated feedback from the Coding Grader

### Customize Your Experience
- Update your profile preferences
- Set new learning goals
- Explore different cognitive style settings

### Contribute
- Report bugs or suggest features: [GitHub Issues](https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-/issues)
- Read the [Developer Documentation](DOCUMENTATION.md)
- Join our community discussions

---

## Troubleshooting Common Issues

### "Connection Refused" Error
```bash
# Ensure Docker services are running
docker-compose ps
docker-compose restart
```

### "401 Unauthorized" on LLM Calls
- Verify your `OPENROUTER_API_KEY` is correct
- Check if you have available API credits
- Restart the backend after updating `.env`

### Frontend Shows Network Errors
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in frontend environment
- Try refreshing the page

### Quiz Shows "No Questions"
- This usually means the LLM response was truncated
- Try regenerating the quiz
- Check backend logs for errors

---

## Quick Reference Commands

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reset database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d postgres redis weaviate

# Re-index knowledge base
cd backend
python -c "from rag.indexer import reindex_all; import asyncio; asyncio.run(reindex_all())"

# Run tests
cd backend && pytest
cd frontend/web && npm test
```

---

## Congratulations!

You've successfully:
- Set up the A3 Learning System
- Created your learner profile
- Generated personalized resources
- Taken an adaptive quiz
- Used the AI tutor
- Explored your learning path
- Viewed your analytics

You now understand how 15+ AI agents work together to create a personalized learning experience. The system will continue adapting to your progress as you learn.

**Happy Learning!**

---

## Resources

- [Full Documentation](DOCUMENTATION.md)
- [API Reference](http://localhost:8000/docs)
- [Project README](../README.md)
- [Changelog](CHANGELOG.md)
- [GitHub Repository](https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-)

**Need Help?**
Email: [theveloxstudio@gmail.com](mailto:theveloxstudio@gmail.com)
Website: [veloxstudio.tech](https://veloxstudio.tech)

---

*Copyright © 2026 VELOX Studio. All rights reserved.*
