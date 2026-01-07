# EX3 Notes - Mini Service Desk

## Orchestration Overview

This project consists of four cooperating microservices:

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                          │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   Frontend  │   Backend   │   Ollama    │      Redis       │
│   (React)   │  (FastAPI)  │   (LLM)     │    (Cache)       │
│   :5173     │   :8000     │   :11434    │     :6379        │
├─────────────┴─────────────┴─────────────┴──────────────────┤
│                    SQLite (Persistence)                      │
└─────────────────────────────────────────────────────────────┘
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| **frontend** | 5173 | React UI for ticket management |
| **backend** | 8000 | FastAPI REST API |
| **ollama** | 11434 | LLM for AI-assisted ticket creation |
| **redis** | 6379 | Rate limiting, async job idempotency |

---

## Redis Trace (Async Refresh)

Example output from `scripts/refresh.py`:

```
==================================================
Ticket Refresh Script
Max Concurrency: 5
Max Retries: 3
Dry Run: False
==================================================
Connected to Redis at redis://localhost:6379/0
Found 3 tickets to process

Summary:
  Total: 3
  Processed: 3
  Skipped (idempotent): 0
  Errors: 0
==================================================
```

Running again shows idempotency:

```
Summary:
  Total: 3
  Processed: 0
  Skipped (idempotent): 3
  Errors: 0
```

---

## Key Rotation Steps

### JWT Secret Key Rotation

1. **Generate new secret:**
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ```

2. **Update environment:**
   ```bash
   # In compose.yaml or .env file
   SECRET_KEY=$NEW_SECRET
   ```

3. **Restart backend:**
   ```bash
   docker compose restart backend
   ```

4. **Impact:** All existing tokens become invalid. Users must re-login.

5. **Rollback:** Restore previous SECRET_KEY and restart.

### Best Practices

- Rotate keys every 90 days minimum
- Use different keys for dev/staging/prod
- Never commit secrets to git
- Use environment variables or secrets manager

---

## Security Baseline (Session 11)

| Feature | Implementation |
|---------|---------------|
| Password hashing | Argon2 via `pwdlib` |
| JWT authentication | PyJWT with HS256 |
| Role-based access | `is_admin` flag on User model |
| Rate limiting | 5 login/min, 3 register/min per IP |
| Security headers | X-Frame-Options, CSP, XSS-Protection |
| Token validation | Expiry checked, invalid tokens rejected |

---

## Enhancement: CSV Export

Added `GET /api/export/tickets` endpoint:
- Admin users: exports all tickets
- Regular users: exports only their own tickets
- Returns CSV with headers and timestamp in filename

---

## Test Coverage

```
pytest tests/ -v
```

Tests cover:
- Password validation (6 tests)
- Privilege escalation prevention
- Token expiry/invalid token rejection
- Security headers presence
- CSV export functionality
- Async refresh with Redis idempotency
