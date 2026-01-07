"""
Chat Service - Handles conversation with Ollama for AI-powered ticket creation.
Uses mistral:7b model for better quality responses.
"""

import os
import httpx
from typing import Optional

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "mistral:7b")

SYSTEM_PROMPT = """You are a helpful IT support assistant. Help users with their computer problems.

When a user describes a problem:
1. Ask 1-2 short questions to understand it better
2. After they answer, say you'll create a ticket and include the JSON below

When creating a ticket, end your message with:
```json
{"ready": true, "description": "what the problem is", "urgency": "high", "request_type": "hardware"}
```

IMPORTANT - You MUST use ONLY these exact values:
- urgency: "high", "normal", or "low" (pick one)
- request_type: "software", "hardware", "environment", "logistics", or "other" (pick one)

Keep responses short and friendly."""


async def chat_with_ollama(messages: list[dict], user_message: str) -> str:
    """Send message to Ollama and get response."""
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    full_messages.extend(messages)
    full_messages.append({"role": "user", "content": user_message})

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_HOST}/api/chat",
            json={"model": MODEL_NAME, "messages": full_messages, "stream": False},
        )
        if response.status_code != 200:
            raise RuntimeError(f"Ollama error: {response.text}")
        return response.json().get("message", {}).get("content", "")


async def check_ollama_status() -> dict:
    """Check if Ollama and model are available."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_HOST}/api/tags")
            if response.status_code != 200:
                return {"available": False, "error": "Ollama not responding"}

            models = [m.get("name", "") for m in response.json().get("models", [])]
            has_model = any(MODEL_NAME.split(":")[0] in m for m in models)

            return {
                "available": True,
                "model": MODEL_NAME,
                "model_ready": has_model,
                "models": models,
            }
    except Exception as e:
        return {"available": False, "error": str(e)}


async def pull_model() -> bool:
    """Pull the model if not downloaded."""
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(
                f"{OLLAMA_HOST}/api/pull",
                json={"name": MODEL_NAME, "stream": False},
            )
            return response.status_code == 200
    except Exception:
        return False


def extract_ticket_json(text: str) -> Optional[dict]:
    """Extract ticket JSON from AI response."""
    import json
    import re

    match = re.search(r"```json\s*(\{[^`]+\})\s*```", text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            if data.get("ready") and data.get("description"):
                return {
                    "description": data.get("description", ""),
                    "urgency": data.get("urgency", "normal"),
                    "request_type": data.get("request_type", "other"),
                }
        except json.JSONDecodeError:
            pass
    return None


def clean_response_for_display(text: str) -> str:
    """Remove JSON block from response so it's not shown to the user."""
    import re

    # Remove the ```json...``` block
    cleaned = re.sub(r"```json\s*\{[^`]+\}\s*```", "", text, flags=re.DOTALL)
    # Clean up extra whitespace
    cleaned = cleaned.strip()
    return cleaned
