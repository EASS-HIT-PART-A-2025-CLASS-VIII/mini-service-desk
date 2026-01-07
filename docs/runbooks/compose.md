# Docker Compose Runbook

## Quick Start

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

---

## Service Health Checks

### Backend API
```bash
curl http://localhost:8000/api/health
# Expected: {"status": "healthy"}
```

### Redis
```bash
docker compose exec redis redis-cli ping
# Expected: PONG
```

### Ollama
```bash
curl http://localhost:11434/api/tags
# Expected: JSON with available models
```

---

## Verify Security Headers

```bash
curl -I http://localhost:8000/

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'...
```

---

## Verify Rate Limiting

```bash
# Attempt 6 rapid logins (5th should succeed, 6th should fail)
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:8000/api/users/login \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=test@test.com&password=wrong"
done

# Expected: 401 401 401 401 401 429
```

---

## Running Tests

### All Tests
```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests
pytest tests/ -v
```

### Async Tests Only
```bash
pytest tests/test_refresh.py -v
```

### Security Tests Only
```bash
pytest tests/test_security.py -v
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | dev-key | JWT signing key (REQUIRED in prod) |
| `ENV` | dev | Set to `prod` for production |
| `DATABASE_URL` | sqlite:///database.db | Database connection |
| `REDIS_URL` | redis://redis:6379/0 | Redis connection |
| `OLLAMA_HOST` | http://ollama:11434 | Ollama API endpoint |
| `OLLAMA_MODEL` | llama3.2:1b | AI model to use |

---

## Production Checklist

1. **Set SECRET_KEY:**
   ```bash
   export SECRET_KEY=$(openssl rand -hex 32)
   ```

2. **Set ENV=prod:**
   ```bash
   export ENV=prod
   ```

3. **Create admin user:**
   ```bash
   python scripts/seed_admin.py
   ```

4. **Start stack:**
   ```bash
   docker compose up -d
   ```

---

## Troubleshooting

### Backend won't start
```bash
docker compose logs backend
```

### Redis connection failed
```bash
docker compose exec redis redis-cli ping
```

### Ollama model not loading
```bash
docker compose exec ollama ollama pull llama3.2:1b
```
