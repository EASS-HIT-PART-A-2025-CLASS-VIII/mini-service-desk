from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


# ---------- DB MODEL ----------
class Ticket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    subject: str
    body: str
    status: str = Field(default="new")
    urgency: str = Field(default="normal")
    request_type: str

    created_by_id: int = Field(foreign_key="user.id")
    operator_id: int | None = Field(default=None, foreign_key="user.id")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ---------- INPUT MODEL ----------
class TicketCreate(SQLModel):
    subject: str
    body: str
    urgency: str = "normal"
    request_type: str
    created_by_id: int

#---------- UPDATE MODEL ----------
class TicketUpdate(SQLModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    urgency: Optional[str] = None
    request_type: Optional[str] = None
    operator_id: Optional[int] = None

# ---------- OUTPUT MODEL ----------
class TicketRead(SQLModel):
    id: int
    subject: str
    body: str
    status: str
    urgency: str
    request_type: str
    created_by_id: int
    operator_id: int | None
    created_at: datetime
    updated_at: datetime