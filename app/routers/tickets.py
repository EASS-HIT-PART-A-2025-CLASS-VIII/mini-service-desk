from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.ticket import Ticket, TicketCreate, TicketRead, TicketUpdate, now_utc
from app.models.user import User
from app.services.security import get_current_user

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("/", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    ticket = Ticket(
        subject=payload.subject,
        body=payload.body,
        request_type=payload.request_type,
        urgency=payload.urgency,
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

    return session.exec(
        select(Ticket).where(Ticket.created_by_id == current_user.id)
    ).all()


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

    # user can only edit subject/body; admin can edit everything
    if not current_user.is_admin:
        allowed = {"subject", "body"}
        data = {k: v for k, v in data.items() if k in allowed}

    for k, v in data.items():
        setattr(ticket, k, v)

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