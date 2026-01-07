# 🛠️ Mini Service Desk

A lightweight, high-performance IT Service Desk platform built with **FastAPI**, **React 19**, and **Ollama AI**. Designed for simplicity, security, and developer-friendly extension.

---

## ✨ Key Features

- **🤖 AI Ticket Creation:** Describe your issue in natural language; our integrated Ollama agent extracts details and creates structured tickets automatically.
- **🔐 Security Hardened:** Robust JWT authentication, Argon2 password hashing, strict role-based access (RBAC), and built-in rate limiting to prevent brute-force attacks.
- **📊 CSV Exports:** Instantly export ticket data for external reporting and analysis.
- **🛡️ Security Headers:** Pre-configured with CSP, HSTS, and XSS protection headers.
- **🚀 One-Command Deployment:** Entire stack (Database, Cache, LLM, API, UI) runs via Docker Compose.
- **🧪 Production Ready:** Comprehensive test suite covering security, async operations, and core business logic.

---

## 🚀 Quick Start (The Easiest Way)

The fastest way to get the full platform running is using Docker:

```bash
# Start the entire stack (Frontend, Backend, Redis, Ollama)
docker compose up --build
```

- **Frontend UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs) (Interactive)

---

## 🎬 Interactive Demo

We've included a demo script that automatically sets up a user, logs in, creates a ticket, and tests the export feature:

```bash
./scripts/demo.sh
```

---

## 🛠️ Manual Development Setup

If you prefer to run the services individually without Docker:

### 1. Backend (FastAPI)
```bash
# Setup virtual environment
uv venv
source .venv/bin/activate
uv sync

# Initialize database & seed admin
python scripts/seed_admin.py --email admin@example.com --password "SecurePass123!"

# Run server
uv run uvicorn app.main:app --reload
```

### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Security Configuration

| Feature | Details |
|---------|---------|
| **Auth** | OAuth2 Password Grant + JWT |
| **Hashing** | Argon2id via `pwdlib` |
| **Validation** | 8+ chars, Uppercase, Lowercase, Number, Symbol |
| **Rate Limits** | Login: 5/min, Registration: 3/min |
| **Middleware** | Custom Security Headers (CSP, X-Frame-Options) |

---

## 🧪 Testing

We value stability. All core features are covered by automated tests.

```bash
# Run all tests
pytest

# Test specific areas
pytest tests/test_security.py  # Security & Auth
pytest tests/test_refresh.py   # Async & Idempotency
```

---

## 📂 Project Navigation

- `app/`: The core FastAPI application logic.
- `frontend/`: React components and hooks for the user interface.
- `scripts/`: Dev utilities including the admin seeder and demo script.
- `docs/`: Technical notes on architecture, orchestration, and runbooks.

---

Happy hacking! 🚀

