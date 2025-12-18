# tests/test_tickets.py
def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

def login(client, email, password) -> str:
    r = client.post(
        "/api/users/login",
        data={"username": email, "password": password},  # <-- form fields
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

def create_user(client, name, email, password):
    r = client.post("/api/users", json={"name": name, "email": email, "password": password})
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]

def test_user_can_create_and_see_own_tickets(client):
    create_user(client, "Ben", "ben@example.com", "pass1234")
    token = login(client, "ben@example.com", "pass1234")

    payload = {"subject": "Printer", "body": "broken", "request_type": "hardware"}
    r = client.post("/api/tickets/", json=payload, headers=auth_header(token))
    assert r.status_code == 201, r.text
    tid = r.json()["id"]

    r = client.get("/api/tickets/", headers=auth_header(token))
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert tid in ids

def test_patch_restrictions_for_user(client):
    create_user(client, "U1", "u1@example.com", "pass1234")
    token = login(client, "u1@example.com", "pass1234")

    r = client.post("/api/tickets/", json={"subject":"A","body":"B","request_type":"it"}, headers=auth_header(token))
    tid = r.json()["id"]

    # user tries to change status (should be ignored / unchanged)
    r = client.patch(f"/api/tickets/{tid}", json={"status": "closed", "subject": "New"}, headers=auth_header(token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["subject"] == "New"
    assert data["status"] == "new"  # unchanged