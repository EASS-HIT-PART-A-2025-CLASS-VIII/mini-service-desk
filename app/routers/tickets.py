from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.ticket import (
    Ticket,
    TicketCreate,
    TicketRead,
    TicketUpdate,
    TicketStatus,
    now_utc,
)
from app.models.user import User
from app.services.security import get_current_user

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("/", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Always start as NEW and unassigned
    ticket = Ticket(
        description=payload.description,
        request_type=payload.request_type,
        urgency=payload.urgency,
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


@router.get("/", response_model=list[TicketRead])
def list_tickets(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        return session.exec(select(Ticket)).all()

    return session.exec(select(Ticket).where(Ticket.created_by_id == current_user.id)).all()


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if (not current_user.is_admin) and (ticket.created_by_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not allowed")

    return ticket


@router.patch("/{ticket_id}", response_model=TicketRead)
def patch_ticket(
    ticket_id: int,
    patch: TicketUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if (not current_user.is_admin) and (ticket.created_by_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not allowed")

    data = patch.model_dump(exclude_unset=True)

    # user can only edit description; admin can edit everything
    if not current_user.is_admin:
        allowed = {"description"}
        data = {k: v for k, v in data.items() if k in allowed}

    prev_operator_id = ticket.operator_id

    for k, v in data.items():
        setattr(ticket, k, v)

    # ---- Backend rules to align with UI ----
    # 1) assigned requires operator_id
    if ticket.status == TicketStatus.assigned and ticket.operator_id is None:
        raise HTTPException(status_code=400, detail="Assigned status requires an operator")

    # 2) new cannot have operator_id
    if ticket.status == TicketStatus.new and ticket.operator_id is not None:
        raise HTTPException(status_code=400, detail="New status cannot have an operator assigned")

    # 3) Auto-status: when operator becomes set, new -> assigned (unless admin explicitly set pending/closed)
    operator_became_set = prev_operator_id is None and ticket.operator_id is not None
    status_was_explicitly_set = "status" in data

    if operator_became_set and not status_was_explicitly_set:
        if ticket.status == TicketStatus.new:
            ticket.status = TicketStatus.assigned

    ticket.updated_at = now_utc()

    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Operation not permitted")

    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    session.delete(ticket)
    session.commit()
    return None
