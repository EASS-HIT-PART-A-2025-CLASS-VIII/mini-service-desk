# tests/test_comments.py

BASE_TICKETS = "/api/tickets"


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def create_user(client, name: str, email: str, password: str, is_admin: bool = False):
    r = client.post(
        "/api/users",
        json={"name": name, "email": email, "password": password, "is_admin": is_admin},
    )
    assert r.status_code in (200, 201), r.text


def login(client, email: str, password: str) -> str:
    # Your backend uses OAuth2PasswordRequestForm => form fields: username/password
    r = client.post("/api/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def create_ticket(client, token: str, subject="S", body="B", request_type="it") -> int:
    r = client.post(
        f"{BASE_TICKETS}/",
        json={"subject": subject, "body": body, "request_type": request_type},
        headers=auth_header(token),
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_user_can_add_and_list_comments_on_own_ticket(client):
    create_user(client, "U1", "u1@example.com", "pass1234", is_admin=False)
    token = login(client, "u1@example.com", "pass1234")

    tid = create_ticket(client, token, subject="Printer", body="Broken", request_type="hardware")

    # Add comment
    r = client.post(
        f"{BASE_TICKETS}/{tid}/comments",
        json={"body": "first comment"},
        headers=auth_header(token),
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["ticket_id"] == tid
    assert data["body"] == "first comment"
    assert data["author_id"] is not None

    # List comments
    r = client.get(f"{BASE_TICKETS}/{tid}/comments", headers=auth_header(token))
    assert r.status_code == 200, r.text
    comments = r.json()
    assert len(comments) == 1
    assert comments[0]["body"] == "first comment"
    assert comments[0]["ticket_id"] == tid


def test_user_cant_list_or_add_comment_on_someone_elses_ticket(client):
    # Owner
    create_user(client, "Owner", "owner@example.com", "pass1234", is_admin=False)
    owner_token = login(client, "owner@example.com", "pass1234")
    tid = create_ticket(client, owner_token)

    # Other user
    create_user(client, "Other", "other@example.com", "pass1234", is_admin=False)
    other_token = login(client, "other@example.com", "pass1234")

    # Other user cannot list comments
    r = client.get(f"{BASE_TICKETS}/{tid}/comments", headers=auth_header(other_token))
    assert r.status_code == 403, r.text

    # Other user cannot add comment
    r = client.post(
        f"{BASE_TICKETS}/{tid}/comments",
        json={"body": "hijack"},
        headers=auth_header(other_token),
    )
    assert r.status_code == 403, r.text


def test_admin_can_add_and_list_comments_on_any_ticket(client):
    # Normal user creates a ticket
    create_user(client, "U1", "u1@example.com", "pass1234", is_admin=False)
    user_token = login(client, "u1@example.com", "pass1234")
    tid = create_ticket(client, user_token)

    # Admin
    create_user(client, "Admin", "admin@example.com", "admin1234", is_admin=True)
    admin_token = login(client, "admin@example.com", "admin1234")

    # Admin adds comment
    r = client.post(
        f"{BASE_TICKETS}/{tid}/comments",
        json={"body": "admin note"},
        headers=auth_header(admin_token),
    )
    assert r.status_code == 201, r.text
    assert r.json()["body"] == "admin note"

    # Admin lists comments (should include admin note)
    r = client.get(f"{BASE_TICKETS}/{tid}/comments", headers=auth_header(admin_token))
    assert r.status_code == 200, r.text
    bodies = [c["body"] for c in r.json()]
    assert "admin note" in bodies


def test_comment_list_is_sorted_by_created_at(client):
    create_user(client, "U1", "u1@example.com", "pass1234", is_admin=False)
    token = login(client, "u1@example.com", "pass1234")
    tid = create_ticket(client, token)

    client.post(
        f"{BASE_TICKETS}/{tid}/comments",
        json={"body": "c1"},
        headers=auth_header(token),
    )
    client.post(
        f"{BASE_TICKETS}/{tid}/comments",
        json={"body": "c2"},
        headers=auth_header(token),
    )

    r = client.get(f"{BASE_TICKETS}/{tid}/comments", headers=auth_header(token))
    assert r.status_code == 200, r.text
    comments = r.json()
    assert [c["body"] for c in comments] == ["c1", "c2"]