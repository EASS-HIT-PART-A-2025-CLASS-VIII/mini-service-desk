"""CSV Export Router - Enhancement for EX3."""

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.database import get_session
from app.models.ticket import Ticket
from app.models.user import User
from app.services.security import get_current_user

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/tickets")
def export_tickets_csv(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Export tickets to CSV format.

    - Admin users: exports all tickets
    - Regular users: exports only their own tickets
    """
    # Get tickets based on user role
    if current_user.is_admin:
        tickets = session.exec(select(Ticket)).all()
    else:
        tickets = session.exec(
            select(Ticket).where(Ticket.created_by_id == current_user.id)
        ).all()

    if not tickets:
        raise HTTPException(status_code=404, detail="No tickets found to export")

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    writer.writerow(
        [
            "ID",
            "Description",
            "Status",
            "Urgency",
            "Request Type",
            "Created By",
            "Operator ID",
            "Created At",
            "Updated At",
        ]
    )

    # Data rows
    for ticket in tickets:
        writer.writerow(
            [
                ticket.id,
                ticket.description,
                ticket.status.value if ticket.status else "",
                ticket.urgency.value if ticket.urgency else "",
                ticket.request_type.value if ticket.request_type else "",
                ticket.created_by_id,
                ticket.operator_id or "",
                ticket.created_at.isoformat() if ticket.created_at else "",
                ticket.updated_at.isoformat() if ticket.updated_at else "",
            ]
        )

    output.seek(0)

    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"tickets_export_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
