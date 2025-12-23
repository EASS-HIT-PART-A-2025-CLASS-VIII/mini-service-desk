# tests/test_tickets_role.py
import uuid

BASE = "/api/tickets"


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def unique_email(prefix="user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def create_user(client, name, email=None, password="pass1234", is_admin=False):
    if email is None:
        email = unique_email("admin" if is_admin else "user")

    payload = {"name": name, "email": email, "password": password, "is_admin": is_admin}
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
    user, email = create_user(client, "U1", password="pass1234", is_admin=False)
    token = login(client, email, "pass1234")

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


def test_admin_can_list_all_and_patch_any_ticket(client):
    user, user_email = create_user(client, "U1", password="pass1234", is_admin=False)
    user_token = login(client, user_email, "pass1234")

    r = client.post(
        f"{BASE}/",
        json={"description": "Printer broken", "request_type": "hardware"},
        headers=auth_header(user_token),
    )
    assert r.status_code == 201, r.text
    tid = r.json()["id"]

    admin, admin_email = create_user(
        client, "Admin", password="admin1234", is_admin=True
    )
    admin_token = login(client, admin_email, "admin1234")

    r = client.get(f"{BASE}/", headers=auth_header(admin_token))
    assert r.status_code == 200, r.text
    ids = {t["id"] for t in r.json()}
    assert tid in ids

    r = client.patch(
        f"{BASE}/{tid}",
        json={"status": "pending", "urgency": "high", "operator_id": admin["id"]},
        headers=auth_header(admin_token),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "pending"
    assert body["urgency"] == "high"
    assert body["operator_id"] == admin["id"]
