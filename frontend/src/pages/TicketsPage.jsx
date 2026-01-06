import { useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import Shell from "../components/shell.jsx";

function truncateText(text, max = 30) {
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

export default function TicketsPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("software");
  const [urgency, setUrgency] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

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

  async function createTicket(e) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);

    try {
      await apiFetch("/api/tickets/", {
        token,
        method: "POST",
        json: {
          description,
          request_type: requestType,
          urgency,
        },
      });

      setDescription("");
      setRequestType("software");
      setUrgency("normal");
      await loadTickets();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <Shell title="My Tickets" subtitle="Create and track support requests">
        {err && <div className="error">{err}</div>}

        <div className="grid">
          {/* Create Ticket Card */}
          <section className="card">
            <h3 className="cardTitle">📝 Create New Ticket</h3>

            <form onSubmit={createTicket} className="form">
              <div>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your issue or request..."
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  className="select"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                >
                  <option value="software">💻 Software</option>
                  <option value="hardware">🖥️ Hardware</option>
                  <option value="environment">🏢 Environment</option>
                  <option value="logistics">📦 Logistics</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>

              <div>
                <label className="label">Urgency</label>
                <select
                  className="select"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                >
                  <option value="low">🟢 Low</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <button
                className="btn primary"
                disabled={!description || submitting}
                style={{ marginTop: "8px" }}
              >
                {submitting ? "Creating..." : "🎫 Create Ticket"}
              </button>
            </form>
          </section>

          {/* Tickets List Card */}
          <section className="card">
            <div className="spread" style={{ marginBottom: "16px" }}>
              <h3 className="cardTitle" style={{ margin: 0 }}>📋 My Tickets</h3>
              <span className="badge">{tickets.length} total</span>
            </div>

            {loading ? (
              <div className="meta loading">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="meta">No tickets yet. Create your first one!</div>
            ) : (
              <ul className="list">
                {tickets.map((t, index) => (
                  <li
                    key={t.id}
                    className="listItem"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <Link className="link" to={`/tickets/${t.id}`} title={t.description ?? ""}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                        <div>
                          <b>#{t.id}</b> — {truncateText(t.description, 30)}
                        </div>
                        <span
                          className="badge"
                          style={{
                            borderColor: getStatusColor(t.status),
                            color: getStatusColor(t.status),
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="meta">
                        <span
                          style={{
                            color: getUrgencyColor(t.urgency),
                            fontWeight: 500,
                          }}
                        >
                          {t.urgency} priority
                        </span>
                        <span>•</span>
                        <span>{t.request_type}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Shell>
    </>
  );
}
