# Mini Service Desk

FastAPI + React implementation of a lightweight service desk where employees can open IT requests, collaborate with operators through comments, and track progress via a modern UI. Features AI-powered ticket creation via Ollama, CSV export, and comprehensive security.

## Highlights

- FastAPI backend with OAuth2 password flow, JWT auth, and typed SQLModel models for users, tickets, and ticket comments.
- React 19 + Vite frontend with role-aware routing, ticket creation flow, admin dashboard, ticket detail & comment threads.
- **AI-powered ticket creation** via Ollama LLM integration - describe your issue naturally and let AI create the ticket.
- **CSV export** for tickets - download your ticket data for reporting.
- SQLite by default for frictionless local work, with optional PostgreSQL connection via `DATABASE_URL`.
- **Redis** for rate limiting and async job processing.
- Docker Compose setup builds all services with persistent data volumes.
- Pytest suite with security tests, async tests, and end-to-end coverage.

## Tech stack

- **Backend:** FastAPI, SQLModel, SQLite/PostgreSQL, JWT (PyJWT), Redis
- **Frontend:** React 19, Vite, React Router, custom hooks for auth and API calls
- **AI:** Ollama with Llama 3.2 for conversational ticket creation
- **Tooling:** pytest, uvicorn, npm, Docker/Docker Compose

## Project structure

```
mini-service-desk/
├── app/                # FastAPI application (routers, models, services, middleware)
├── frontend/           # React + Vite single-page app
├── tests/              # Pytest suites for API flows and security
├── scripts/            # Utility scripts (demo, seed_admin, refresh)
├── docs/               # Documentation and runbooks
├── Dockerfile.*        # Docker images for backend & frontend
├── compose.yaml        # One-command full stack (Backend, Frontend, Redis, Ollama)
├── pyproject.toml      # Python project metadata
└── requirements.txt    # Locked backend dependencies
```

## Quick Start

### Docker Compose (Recommended)

```bash
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

### Demo Script

```bash
./scripts/demo.sh
```

This script walks through starting services, creating a user, making tickets, and exporting CSV.

## Getting Started (Local Development)

### 1. Requirements

- Python 3.12+
- Node.js 20+ with npm
- Docker (recommended for full stack)

### 2. Backend (FastAPI)

```bash
# create the virtual environment
uv venv
source .venv/bin/activate

# install dependencies
uv sync

# set environment variables
export DATABASE_URL="sqlite:///./database.db"
export FRONTEND_URL="http://localhost:5173"
export SECRET_KEY="your-secret-key-here"
export ENV="dev"

# run the server
uv run uvicorn app.main:app --reload --port 8000
```

### 3. Create Admin User

```bash
python scripts/seed_admin.py
```

Or with custom credentials:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='SecurePass123!' python scripts/seed_admin.py
```

### 4. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Environment Variables

| Name            | Default                     | Description |
|-----------------|-----------------------------|-------------|
| `DATABASE_URL`  | `sqlite:///database.db`     | Database connection string |
| `ENV`           | `dev`                       | Set to `prod` to disable docs and enable strict security |
| `SECRET_KEY`    | dev fallback                | JWT signing key (REQUIRED in production) |
| `FRONTEND_URL`  | `http://localhost:5173`     | Allowed origin for CORS |
| `REDIS_URL`     | `redis://redis:6379/0`      | Redis connection for rate limiting |
| `OLLAMA_HOST`   | `http://ollama:11434`       | Ollama API endpoint |
| `OLLAMA_MODEL`  | `llama3.2:1b`               | AI model for chat |

## API Overview

| Method & Path | Description | Auth |
|---------------|-------------|------|
| `POST /api/users` | Register a new user | none |
| `POST /api/users/login` | Login (returns bearer token) | form |
| `GET /api/users/me` | Current user profile | Bearer |
| `GET /api/users/operators` | List admins | Bearer, admin |
| `POST /api/tickets/` | Create a ticket | Bearer |
| `GET /api/tickets/` | List tickets | Bearer |
| `PATCH /api/tickets/{id}` | Update ticket | Bearer |
| `DELETE /api/tickets/{id}` | Delete ticket | Bearer, admin |
| `GET /api/export/tickets` | Export tickets as CSV | Bearer |
| `POST /api/chat/message` | Send message to AI | Bearer |
| `POST /api/chat/create-ticket` | Create ticket from AI chat | Bearer |
| `GET /api/tickets/{id}/comments` | List comments | Bearer |
| `POST /api/tickets/{id}/comments` | Add comment | Bearer |

## Security Features

- **Password hashing:** Argon2 via pwdlib
- **JWT authentication:** With expiry validation
- **Role-based access:** Admin vs regular user permissions
- **Rate limiting:** 5 login attempts/min, 3 registrations/min per IP
- **Security headers:** X-Frame-Options, CSP, XSS-Protection
- **Input validation:** Password strength requirements (8+ chars, mixed case, number, symbol)

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run security tests
pytest tests/test_security.py -v

# Run async tests
pytest tests/test_refresh.py -v
```

## Documentation

- [EX3 Notes](docs/EX3-notes.md) - Architecture and key rotation
- [Compose Runbook](docs/runbooks/compose.md) - Health checks and troubleshooting

## Common Workflows

- **Create a ticket:** Use the Tickets page or AI Chat modal
- **Export data:** Click "Export CSV" on the tickets page
- **Admin dashboard:** Log in as admin to view `/admin`, assign operators, close tickets
- **AI ticket creation:** Click "Create with AI" and describe your issue naturally

Happy hacking!
