"""Chat Router - AI chat endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from app.database import get_session
from app.models.ticket import (
    Ticket,
    TicketRead,
    TicketStatus,
    TicketRequestType,
    TicketUrgency,
    now_utc,
)
from app.models.user import User
from app.services.security import get_current_user
from app.services.chat_service import (
    chat_with_ollama,
    check_ollama_status,
    pull_model,
    extract_ticket_json,
    clean_response_for_display,
)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = []
    message: str


class ChatResponse(BaseModel):
    response: str
    ticket_data: dict | None = None


class CreateTicketRequest(BaseModel):
    description: str
    urgency: str = "normal"
    request_type: str = "other"


@router.get("/status")
async def chat_status():
    """Check Ollama availability."""
    return await check_ollama_status()


@router.post("/pull-model")
async def trigger_pull(current_user: User = Depends(get_current_user)):
    """Download the AI model."""
    if await pull_model():
        return {"status": "ok"}
    raise HTTPException(status_code=500, detail="Failed to pull model")


@router.post("/message", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Send chat message and get AI response."""
    ollama_status = await check_ollama_status()

    if not ollama_status.get("available"):
        raise HTTPException(
            status_code=503, detail="Ollama not available. Starting up..."
        )

    if not ollama_status.get("model_ready"):
        await pull_model()
        raise HTTPException(
            status_code=503, detail="Model downloading. Please wait 1-2 minutes..."
        )

    history = [{"role": m.role, "content": m.content} for m in payload.messages]

    try:
        raw_response = await chat_with_ollama(history, payload.message)
        ticket_data = extract_ticket_json(raw_response)
        # Clean the response to hide JSON from user
        clean_response = clean_response_for_display(raw_response)
        return ChatResponse(response=clean_response, ticket_data=ticket_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-ticket", response_model=TicketRead, status_code=201)
async def create_ticket(
    payload: CreateTicketRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create ticket from chat data."""
    try:
        urgency = TicketUrgency(payload.urgency)
    except ValueError:
        urgency = TicketUrgency.normal

    try:
        request_type = TicketRequestType(payload.request_type)
    except ValueError:
        request_type = TicketRequestType.other

    ticket = Ticket(
        description=payload.description,
        request_type=request_type,
        urgency=urgency,
        status=TicketStatus.new,
        operator_id=None,
        created_by_id=current_user.id,
        created_at=now_utc(),
        updated_at=now_utc(),
    )

    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket
