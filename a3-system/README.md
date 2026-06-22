# A3 Learning System - Quick Start Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git (to clone the repository)

## Quick Start (One Command)

```bash
# Clone the repository
git clone <your-repo-url>
cd a3-system

# Copy environment template
cp .env.template .env

# Start all services
docker-compose up -d
```

That's it! The following services will be available:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3003 | Next.js web app |
| Backend API | http://localhost:8000 | FastAPI server |
| pgAdmin | http://localhost:5050 | PostgreSQL management (optional) |

## Environment Variables

Copy `.env.template` to `.env` and fill in your API keys:

```bash
cp .env.template .env
# Edit .env with your keys
```

Required variables:
- `OPENROUTER_API_KEY` - For LLM fallback
- `OPENROUTER_KIMI_API_KEY` - For primary LLM (Kimi)

## Useful Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove volumes (clears database data)
docker-compose down -v

# Restart a specific service
docker-compose restart backend

# Check service health
docker-compose ps
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  PostgreSQL │
│  (Next.js)  │     │  (FastAPI)  │     │   (Data)    │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │    Redis    │
                    │   (Cache)   │
                    └─────────────┘
                    ┌─────────────┐
                    │  Weaviate   │
                    │ (Vector DB) │
                    └─────────────┘
```

## Troubleshooting

### Port conflicts
If ports 3003, 8000, 5432, 6379, or 8080 are already in use, either:
- Stop the conflicting services, or
- Change the ports in `.env` file

### Docker build fails
Make sure Docker Desktop is running and you have internet access (for pulling images).

### Backend shows "unhealthy"
Wait a few moments for the database to initialize. The backend depends on PostgreSQL, Redis, and Weaviate being healthy first.

## Development

### Running locally (without Docker)
If you prefer to run services locally for development:

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend/web
npm install
npm run dev
```

### Hot Reload
Both frontend and backend support hot reload when running via `docker-compose`.
