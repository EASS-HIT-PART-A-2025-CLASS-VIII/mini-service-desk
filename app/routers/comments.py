from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.ticket import Ticket
from app.models.comment import (
    TicketComment,
    TicketCommentCreate,
    TicketCommentRead,
    now_utc,
)
from app.models.user import User
from app.services.security import get_current_user

router = APIRouter(prefix="/tickets", tags=["comments"])


def _get_ticket_or_404(session: Session, ticket_id: int) -> Ticket:
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


def _must_have_access(current_user: User, ticket: Ticket):
    if current_user.is_admin:
        return
    if ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")


def _serialize_comment(
    comment: TicketComment, author_name: Optional[str] = None
) -> TicketCommentRead:
    return TicketCommentRead(
        id=comment.id,
        ticket_id=comment.ticket_id,
        author_id=comment.author_id,
        author_name=author_name,
        body=comment.body,
        created_at=comment.created_at,
    )


@router.get("/{ticket_id}/comments", response_model=list[TicketCommentRead])
def list_comments(
    ticket_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    ticket = _get_ticket_or_404(session, ticket_id)
    _must_have_access(current_user, ticket)

    comment_rows = session.exec(
        select(TicketComment, User)
        .join(User, TicketComment.author_id == User.id)
        .where(TicketComment.ticket_id == ticket_id)
        .order_by(TicketComment.created_at.asc())
    ).all()

    return [
        _serialize_comment(comment, author_name=user.name)
        for comment, user in comment_rows
    ]


@router.post(
    "/{ticket_id}/comments",
    response_model=TicketCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def add_comment(
    ticket_id: int,
    payload: TicketCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    ticket = _get_ticket_or_404(session, ticket_id)
    _must_have_access(current_user, ticket)

    comment = TicketComment(
        ticket_id=ticket_id,
        author_id=current_user.id,
        body=payload.body,
        created_at=now_utc(),
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return _serialize_comment(comment, author_name=current_user.name)
