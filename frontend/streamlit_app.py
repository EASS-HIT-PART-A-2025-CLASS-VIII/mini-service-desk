import streamlit as st
from api import list_tickets, create_ticket

st.title("🛠 Mini Service Desk")

st.header("Create Ticket")

subject = st.text_input("Subject")
body = st.text_area("Description")
request_type = st.selectbox("Request type", ["IT", "HR", "Access", "Other"])
urgency = st.selectbox("Urgency", ["low", "normal", "high"])

if st.button("Create Ticket"):
    ticket = create_ticket({
        "subject": subject,
        "body": body,
        "request_type": request_type,
        "urgency": urgency,
        "created_by_id": 1  # temporary, EX2 allowed
    })
    st.success(f"Ticket #{ticket['id']} created")

st.divider()
st.header("All Tickets")
status_filter = st.selectbox(
    "Filter by status",
    ["all", "new", "in_progress", "closed"]
)
tickets = list_tickets()

for t in tickets:
    if status_filter != "all" and t["status"] != status_filter:
        continue

    st.write(
        f"#{t['id']} | {t['subject']} | {t['status']} | {t['urgency']}"
    )