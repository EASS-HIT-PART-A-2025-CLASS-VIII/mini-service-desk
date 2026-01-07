# tests/test_tickets_role.py
import uuid

BASE = "/api/tickets"

# Strong test passwords that meet all requirements
TEST_PASSWORD = "TestPass123!"
ADMIN_PASSWORD = "AdminPass123!"


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def unique_email(prefix="user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def create_user(client, name, email=None, password=TEST_PASSWORD, is_admin=False):
    if email is None:
        email = unique_email("admin" if is_admin else "user")

    # Note: is_admin field is now ignored by the backend for security
    payload = {"name": name, "email": email, "password": password}
    r = client.post("/api/users", json=payload)
    assert r.status_code in (200, 201), r.text
    return r.json(), email


def login(client, email, password) -> str:
    r = client.post(
        "/api/users/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_user_cant_patch_status_or_operator(client):
    user, email = create_user(client, "U1", password=TEST_PASSWORD, is_admin=False)
    token = login(client, email, TEST_PASSWORD)

    r = client.post(
        f"{BASE}/",
        json={"description": "Issue A", "request_type": "software"},
        headers=auth_header(token),
    )
    assert r.status_code == 201, r.text
    tid = r.json()["id"]

    r = client.patch(
        f"{BASE}/{tid}",
        json={"status": "pending", "operator_id": 999, "urgency": "high"},
        headers=auth_header(token),
    )
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["status"] == "new"
    assert body["urgency"] == "normal"
    assert body["operator_id"] is None

    r = client.patch(
        f"{BASE}/{tid}",
        json={"description": "Updated description"},
        headers=auth_header(token),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["description"] == "Updated description"


# NOTE: This test requires seeding an admin user since self-registration
# as admin is no longer allowed (privilege escalation fix).
# For now, we skip admin-specific tests that relied on self-registration.
# In a real scenario, you would use a fixture that seeds an admin user directly.
