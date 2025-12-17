# tests/test_tickets.py
from datetime import datetime

BASE = "/api/tickets"


def test_create_ticket(client):
    payload = {
        "subject": "Printer is broken",
        "body": "It prints blank pages",
        "request_type": "hardware",
        "created_by_id": 1,
        "operator_id": None,
        # status/urgency should default if your model sets defaults
    }

    r = client.post(f"{BASE}/", json=payload)
    assert r.status_code == 201, r.text

    data = r.json()
    assert "id" in data
    assert data["subject"] == payload["subject"]
    assert data["body"] == payload["body"]
    assert data["request_type"] == payload["request_type"]
    assert data["created_by_id"] == payload["created_by_id"]
    assert data["operator_id"] is None

    # if you return timestamps:
    assert "created_at" in data
    assert "updated_at" in data


def test_list_tickets(client):
    # create two tickets
    for i in range(2):
        client.post(
            f"{BASE}/",
            json={
                "subject": f"Ticket {i}",
                "body": "Hello",
                "request_type": "general",
                "created_by_id": 1,
            },
        )

    r = client.get(f"{BASE}/")
    assert r.status_code == 200, r.text

    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 2


def test_get_ticket_by_id(client):
    created = client.post(
        f"{BASE}/",
        json={
            "subject": "Network down",
            "body": "No internet",
            "request_type": "network",
            "created_by_id": 1,
        },
    ).json()

    ticket_id = created["id"]

    r = client.get(f"{BASE}/{ticket_id}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["id"] == ticket_id
    assert data["subject"] == "Network down"


def test_patch_ticket_partial_update(client):
    created = client.post(
        f"{BASE}/",
        json={
            "subject": "Laptop slow",
            "body": "Takes 10 minutes to boot",
            "request_type": "hardware",
            "created_by_id": 1,
        },
    ).json()

    ticket_id = created["id"]
    old_updated_at = created.get("updated_at")

    patch_payload = {
        "status": "in_progress",
        "operator_id": 99,
        "urgency": "high",
    }

    r = client.patch(f"{BASE}/{ticket_id}", json=patch_payload)
    assert r.status_code == 200, r.text

    data = r.json()
    assert data["id"] == ticket_id
    assert data["status"] == "in_progress"
    assert data["operator_id"] == 99
    assert data["urgency"] == "high"

    # unchanged fields stay
    assert data["subject"] == "Laptop slow"
    assert data["request_type"] == "hardware"

    # updated_at should change (if your endpoint sets it)
    if old_updated_at and data.get("updated_at"):
        assert data["updated_at"] != old_updated_at


def test_delete_ticket(client):
    created = client.post(
        f"{BASE}/",
        json={
            "subject": "Delete me",
            "body": "please",
            "request_type": "general",
            "created_by_id": 1,
        },
    ).json()
    ticket_id = created["id"]

    r = client.delete(f"{BASE}/{ticket_id}")
    assert r.status_code in (204, 200), r.text

    # now it should be gone
    r2 = client.get(f"{BASE}/{ticket_id}")
    assert r2.status_code == 404, r2.text