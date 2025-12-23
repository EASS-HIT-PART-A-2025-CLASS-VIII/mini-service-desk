from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class TicketComment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="ticket.id", index=True)
    author_id: int = Field(foreign_key="user.id", index=True)

    body: str
    created_at: datetime = Field(default_factory=now_utc)


class TicketCommentCreate(SQLModel):
    body: str


class TicketCommentRead(SQLModel):
    id: int
    ticket_id: int
    author_id: int
    author_name: Optional[str] = None
    body: str
    created_at: datetime
