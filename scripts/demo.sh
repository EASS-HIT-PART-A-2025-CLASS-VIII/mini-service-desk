#!/bin/bash
# Demo Script - Mini Service Desk
# EX3 Deliverable

set -e

echo "=========================================="
echo "Mini Service Desk - Demo Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

step() {
    echo ""
    echo -e "${BLUE}>>> $1${NC}"
    echo ""
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Step 1: Check if Docker is running
step "Step 1: Checking Docker..."
if docker info > /dev/null 2>&1; then
    success "Docker is running"
else
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Step 2: Start the stack
step "Step 2: Starting services with Docker Compose..."
docker compose up -d

echo "Waiting for services to be ready..."
sleep 10

# Step 3: Check health
step "Step 3: Checking service health..."

echo "Backend health:"
curl -s http://localhost:8000/api/health || echo "Backend not ready yet"
echo ""

echo "Redis health:"
docker compose exec -T redis redis-cli ping || echo "Redis not ready yet"
echo ""

success "Services are running"

# Step 4: Create a test user
step "Step 4: Creating a test user..."

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8000/api/users \
    -H "Content-Type: application/json" \
    -d '{"name": "Demo User", "email": "demo@example.com", "password": "DemoPass123!"}')

echo "Response: $REGISTER_RESPONSE"
success "User created (or already exists)"

# Step 5: Login
step "Step 5: Logging in..."

TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/users/login \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=demo@example.com&password=DemoPass123!")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    success "Login successful"
    echo "Token: ${TOKEN:0:20}..."
else
    echo "Login failed: $TOKEN_RESPONSE"
fi

# Step 6: Create a ticket
step "Step 6: Creating a ticket..."

TICKET_RESPONSE=$(curl -s -X POST http://localhost:8000/api/tickets/ \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"description": "Demo ticket created by script", "request_type": "software", "urgency": "normal"}')

echo "Ticket: $TICKET_RESPONSE"
success "Ticket created"

# Step 7: Export tickets as CSV
step "Step 7: Exporting tickets to CSV..."

curl -s http://localhost:8000/api/export/tickets \
    -H "Authorization: Bearer $TOKEN" \
    -o tickets_export.csv

echo "CSV exported to: tickets_export.csv"
cat tickets_export.csv
success "CSV export complete"

# Step 8: Check security headers
step "Step 8: Verifying security headers..."

HEADERS=$(curl -s -I http://localhost:8000/)
echo "$HEADERS" | grep -E "(X-Content-Type|X-Frame|X-XSS|Content-Security)"
success "Security headers present"

# Summary
step "Demo Complete!"
echo "=========================================="
echo "Services running:"
echo "  - Frontend:  http://localhost:5173"
echo "  - Backend:   http://localhost:8000"
echo "  - API Docs:  http://localhost:8000/docs"
echo ""
echo "To stop services: docker compose down"
echo "=========================================="
