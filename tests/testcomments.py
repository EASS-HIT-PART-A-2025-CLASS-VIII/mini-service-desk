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
    r = client.post(
        "/api/users/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def create_ticket(client, token: str, description="D", request_type="software") -> int:
    r = client.post(
        f"{BASE_TICKETS}/",
        json={"description": description, "request_type": request_type},
        headers=auth_header(token),
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_user_can_add_and_list_comments_on_own_ticket(client):
    create_user(client, "U1", "u1@example.com", "pass1234", is_admin=False)
    token = login(client, "u1@example.com", "pass1234")

    tid = create_ticket(
        client, token, description="Printer Broken", request_type="hardware"
    )

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
    assert data["author_name"] == "U1"

    # List comments
    r = client.get(f"{BASE_TICKETS}/{tid}/comments", headers=auth_header(token))
    assert r.status_code == 200, r.text
    comments = r.json()
    assert len(comments) == 1
    assert comments[0]["body"] == "first comment"
    assert comments[0]["ticket_id"] == tid
    assert comments[0]["author_name"] == "U1"


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
    admin_comment = r.json()
    assert admin_comment["body"] == "admin note"
    assert admin_comment["author_name"] == "Admin"

    # Admin lists comments (should include admin note)
    r = client.get(f"{BASE_TICKETS}/{tid}/comments", headers=auth_header(admin_token))
    assert r.status_code == 200, r.text
    comments = r.json()
    bodies = [c["body"] for c in comments]
    assert "admin note" in bodies
    assert any(c["author_name"] == "Admin" for c in comments)


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
    assert all(c["author_name"] == "U1" for c in comments)


def test_comment_list_includes_author_names_for_multiple_users(client):
    create_user(client, "Owner", "owner@example.com", "pass1234", is_admin=False)
    owner_token = login(client, "owner@example.com", "pass1234")
    ticket_id = create_ticket(client, owner_token)

    create_user(client, "Helper", "helper@example.com", "pass1234", is_admin=True)
    helper_token = login(client, "helper@example.com", "pass1234")

    # Owner leaves comment
    client.post(
        f"{BASE_TICKETS}/{ticket_id}/comments",
        json={"body": "from owner"},
        headers=auth_header(owner_token),
    )
    # Helper leaves comment
    client.post(
        f"{BASE_TICKETS}/{ticket_id}/comments",
        json={"body": "from helper"},
        headers=auth_header(helper_token),
    )

    r = client.get(f"{BASE_TICKETS}/{ticket_id}/comments", headers=auth_header(helper_token))
    assert r.status_code == 200, r.text
    comments = r.json()
    assert [c["body"] for c in comments] == ["from owner", "from helper"]
    assert [c["author_name"] for c in comments] == ["Owner", "Helper"]
