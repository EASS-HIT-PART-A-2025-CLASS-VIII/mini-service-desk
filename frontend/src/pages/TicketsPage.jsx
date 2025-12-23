import { useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNavigate, Link } from "react-router-dom";
import Shell from "../components/shell.jsx";

function truncateText(text, max = 30) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
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
    }
  }

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <Shell title="Tickets" subtitle="Create a ticket and track progress">
        {err && <div className="error">{err}</div>}

        <div className="grid">
          <section className="card">
            <h3 className="cardTitle">Create ticket</h3>

            <form onSubmit={createTicket} className="form">
              <div>
                <div className="label">Description</div>
                <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>

              <div>
                <div className="label">Sub-Category</div>
                <select className="select" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                  <option value="software">Software</option>
                  <option value="hardware">Hardware</option>
                  <option value="environment">Environment</option>
                  <option value="logistics">Logistics</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <div className="label">Urgency</div>
                <select className="select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>

              <button className="btn primary" disabled={!description}>
                Open ticket
              </button>
            </form>
          </section>

          <section className="card">
            <h3 className="cardTitle">My tickets</h3>

            {loading ? (
              <div className="meta">Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="meta">No tickets yet.</div>
            ) : (
              <ul className="list">
                {tickets.map((t) => (
                  <li key={t.id} className="listItem">
                    <Link className="link" to={`/tickets/${t.id}`} title={t.description ?? ""}>
                      <div>
                        <b>#{t.id}</b> — {truncateText(t.description, 30)}
                      </div>
                      <div className="meta">
                        status: {t.status} • urgency: {t.urgency} • sub-category: {t.request_type}
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
