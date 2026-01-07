import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import Shell from "../components/shell.jsx";
import ChatModal from "../components/ChatModal.jsx";
import CreateTicketModal from "../components/CreateTicketModal.jsx";

function truncateText(text, max = 40) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function getUrgencyColor(urgency) {
  switch (urgency) {
    case "high": return "#ef4444";
    case "normal": return "#f59e0b";
    case "low": return "#22c55e";
    default: return "#7c5cff";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "new": return "#00d4ff";
    case "assigned": return "#7c5cff";
    case "pending": return "#f59e0b";
    case "closed": return "#22c55e";
    default: return "#7c5cff";
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "new": return "🆕";
    case "assigned": return "👤";
    case "pending": return "⏳";
    case "closed": return "✅";
    default: return "📋";
  }
}

export default function TicketsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // Split tickets into active and closed
  const { activeTickets, closedTickets } = useMemo(() => {
    const active = tickets.filter(t => t.status !== "closed").sort((a, b) => b.id - a.id);
    const closed = tickets.filter(t => t.status === "closed").sort((a, b) => b.id - a.id);
    return { activeTickets: active, closedTickets: closed };
  }, [tickets]);

  async function loadTickets() {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch("/api/tickets/", { token });
      setTickets(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function TicketRow({ ticket, index }) {
    return (
      <li
        className="listItem"
        style={{ animationDelay: `${index * 0.03}s` }}
      >
        <Link className="link" to={`/tickets/${ticket.id}`} title={ticket.description ?? ""}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
              <span style={{ fontSize: "18px" }}>{getStatusIcon(ticket.status)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <b style={{ color: "#7c5cff" }}>#{ticket.id}</b>
                  <span style={{ color: "var(--text-primary)" }}>
                    {truncateText(ticket.description, 35)}
                  </span>
                </div>
                <div className="meta" style={{ marginTop: "4px" }}>
                  <span style={{ color: getUrgencyColor(ticket.urgency), fontWeight: 500 }}>
                    {ticket.urgency}
                  </span>
                  <span>•</span>
                  <span>{ticket.request_type}</span>
                </div>
              </div>
            </div>
            <span
              className="badge"
              style={{
                borderColor: getStatusColor(ticket.status),
                color: getStatusColor(ticket.status),
              }}
            >
              {ticket.status}
            </span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <>
      <Shell title="My Tickets" subtitle="Create and track your support requests">
        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button 
            className="btn primary" 
            onClick={() => setManualOpen(true)}
            style={{ flex: 1, padding: "16px", fontSize: "15px" }}
          >
            📝 Create Ticket
          </button>
          <button 
            className="btn ghost" 
            onClick={() => setChatOpen(true)}
            style={{ 
              flex: 1, 
              padding: "16px", 
              fontSize: "15px",
              background: "rgba(0, 212, 255, 0.1)",
              borderColor: "rgba(0, 212, 255, 0.3)",
            }}
          >
            🤖 Create with AI
          </button>
        </div>

        {err && <div className="error">{err}</div>}

        {/* Active Tickets Section */}
        <section className="card" style={{ marginBottom: "24px" }}>
          <div className="spread" style={{ marginBottom: "16px" }}>
            <h3 className="cardTitle" style={{ margin: 0 }}>
              📥 Active Tickets
            </h3>
            <span className="badge" style={{ borderColor: "#00d4ff", color: "#00d4ff" }}>
              {activeTickets.length}
            </span>
          </div>

          {loading ? (
            <div className="meta loading" style={{ padding: "32px 0", textAlign: "center" }}>
              Loading your tickets...
            </div>
          ) : activeTickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px", opacity: 0.5 }}>🎉</div>
              <p className="meta">No active tickets</p>
              <p className="meta" style={{ fontSize: "12px" }}>All caught up! Create a new ticket if you need help.</p>
            </div>
          ) : (
            <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "8px", marginRight: "-8px" }}>
              <ul className="list">
                {activeTickets.map((t, i) => (
                  <TicketRow key={t.id} ticket={t} index={i} />
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Ticket History Section */}
        <section className="card">
          <div className="spread" style={{ marginBottom: "16px" }}>
            <h3 className="cardTitle" style={{ margin: 0 }}>
              📜 Ticket History
            </h3>
            <span className="badge" style={{ borderColor: "#22c55e", color: "#22c55e" }}>
              {closedTickets.length} closed
            </span>
          </div>

          {loading ? (
            <div className="meta loading" style={{ padding: "32px 0", textAlign: "center" }}>
              Loading history...
            </div>
          ) : closedTickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px", opacity: 0.5 }}>📭</div>
              <p className="meta">No closed tickets yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "8px", marginRight: "-8px" }}>
              <ul className="list">
                {closedTickets.map((t, i) => (
                  <TicketRow key={t.id} ticket={t} index={i} />
                ))}
              </ul>
            </div>
          )}
        </section>
      </Shell>

      {/* Modals */}
      <ChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onTicketCreated={() => loadTickets()}
      />
      <CreateTicketModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onTicketCreated={() => loadTickets()}
      />
    </>
  );
}

