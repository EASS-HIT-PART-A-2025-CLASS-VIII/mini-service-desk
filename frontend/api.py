import requests

BASE_URL = "http://localhost:8000/api"

def list_tickets():
    response = requests.get(f"{BASE_URL}/tickets/")
    response.raise_for_status()
    return response.json()

def create_ticket(data: dict):
    response = requests.post(f"{BASE_URL}/tickets/",json=data)
    response.raise_for_status()
    return response.json()

