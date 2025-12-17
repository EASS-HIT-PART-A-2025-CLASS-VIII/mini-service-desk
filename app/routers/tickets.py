from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime , timezone

from app.database import get_session
from app.models.ticket import Ticket, TicketCreate, TicketRead , TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])


#Create Ticket endpoint
@router.post("/", response_model=TicketRead, status_code=201)
def create_ticket(
    data: TicketCreate,
    session: Session = Depends(get_session),
    ):
    ticket = Ticket(
        subject=data.subject,
        body=data.body,
        urgency=data.urgency,
        request_type=data.request_type,
        created_by_id=data.created_by_id,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket

#get list for tickets endpoint
@router.get("/", response_model=list[TicketRead])
def list_tickets(
    session: Session = Depends(get_session),
    ):
    tickets = session.exec(select(Ticket)).all()
    return tickets

#get ticket by id endpoint
@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: int,
    session: Session = Depends(get_session),
    ):
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


#partial update ticket endpoint
@router.patch("/{ticket_id}", response_model=TicketRead)
def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    session: Session = Depends(get_session),
):
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(ticket, key, value)

    ticket.updated_at = datetime.now(timezone.utc)

    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket

#delete ticket endpoint
@router.delete("/{ticket_id}" , status_code=204)
def delete_ticket(
    ticket_id: int,
    session: Session = Depends(get_session),
    ):
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    session.delete(ticket)
    session.commit()
    
