from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class TicketStatus(str, Enum):
    new = "new"
    assigned = "assigned"
    pending = "pending"
    closed = "closed"


class TicketUrgency(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"


class TicketRequestType(str, Enum):
    software = "software"
    hardware = "hardware"
    environment = "environment"
    logistics = "logistics"
    other = "other"


# ---------- DB MODEL ----------
class Ticket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    description: str
    status: TicketStatus = Field(default=TicketStatus.new)
    urgency: TicketUrgency = Field(default=TicketUrgency.normal)
    request_type: TicketRequestType

    created_by_id: int = Field(foreign_key="user.id")
    operator_id: Optional[int] = Field(default=None, foreign_key="user.id")

    # IMPORTANT: default_factory should be the function, not now_utc()
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


# ---------- INPUT MODEL ----------
class TicketCreate(SQLModel):
    description: str
    urgency: TicketUrgency = TicketUrgency.normal
    request_type: TicketRequestType


# ---------- UPDATE MODEL ----------
class TicketUpdate(SQLModel):
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    urgency: Optional[TicketUrgency] = None
    request_type: Optional[TicketRequestType] = None
    operator_id: Optional[int] = None


# ---------- OUTPUT MODEL ----------
class TicketRead(SQLModel):
    id: int
    description: str
    status: TicketStatus
    urgency: TicketUrgency
    request_type: TicketRequestType
    created_by_id: int
    operator_id: int | None
    created_at: datetime
    updated_at: datetime
