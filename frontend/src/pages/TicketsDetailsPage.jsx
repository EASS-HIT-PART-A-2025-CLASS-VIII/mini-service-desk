import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Shell from "../components/shell.jsx";

function getStatusColor(status) {
  switch (status) {
    case "new": return "#00d4ff";
    case "assigned": return "#7c5cff";
    case "pending": return "#f59e0b";
    case "closed": return "#22c55e";
    default: return "#7c5cff";
  }
}

function getUrgencyColor(urgency) {
  switch (urgency) {
    case "high": return "#ef4444";
    case "normal": return "#f59e0b";
    case "low": return "#22c55e";
    default: return "#7c5cff";
  }
}

export default function TicketsDetailsPage() {
  const { id } = useParams();
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const t = await apiFetch(`/api/tickets/${id}`, { token });
      const c = await apiFetch(`/api/tickets/${id}/comments`, { token });
      setTicket(t);
      setComments(c);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function addComment(e) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/tickets/${id}/comments`, {
        token,
        method: "POST",
        json: { body: newComment },
      });
      setNewComment("");
      await load();
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Shell title="Loading..." subtitle="">
        <div className="card">
          <div className="meta loading">Loading ticket details...</div>
        </div>
      </Shell>
    );
  }

  if (err) {
    return (
      <Shell title="Error" subtitle="">
        <div className="error">Error: {err}</div>
        <Link className="navlink" to="/tickets" style={{ marginTop: "16px", display: "inline-flex" }}>
          ← Back to tickets
        </Link>
      </Shell>
    );
  }

  if (!ticket) {
    return (
      <Shell title="Not Found" subtitle="">
        <div className="error">Ticket not found</div>
      </Shell>
    );
  }

  return (
    <Shell title={`Ticket #${ticket.id}`} subtitle={truncateText(ticket.description, 60)}>
      <div style={{ marginBottom: "16px" }}>
        <Link className="navlink" to="/tickets">
          ← Back to tickets
        </Link>
      </div>

      <div className="grid">
        {/* Ticket Details Card */}
        <section className="card">
          <h2 style={{ marginBottom: "16px" }}>📄 Ticket Details</h2>

          <div className="pillRow" style={{ marginBottom: "20px" }}>
            <span
              className="badge"
              style={{
                borderColor: getStatusColor(ticket.status),
                color: getStatusColor(ticket.status),
              }}
            >
              Status: {ticket.status}
            </span>
            <span
              className="badge"
              style={{
                borderColor: getUrgencyColor(ticket.urgency),
                color: getUrgencyColor(ticket.urgency),
              }}
            >
              Urgency: {ticket.urgency}
            </span>
            <span className="badge">
              Category: {ticket.request_type}
            </span>
          </div>

          <div
            className="card solid"
            style={{ padding: "16px" }}
          >
            <div className="label">Description</div>
            <div style={{ whiteSpace: "pre-wrap", marginTop: "8px", lineHeight: 1.7 }}>
              {ticket.description}
            </div>
          </div>
        </section>

        {/* Comments Card */}
        <section className="card">
          <div className="spread" style={{ marginBottom: "16px" }}>
            <h2 style={{ margin: 0 }}>💬 Comments</h2>
            <span className="badge">{comments.length}</span>
          </div>

          {comments.length === 0 ? (
            <div className="meta" style={{ marginBottom: "20px" }}>
              No comments yet. Be the first to add one!
            </div>
          ) : (
            <ul className="commentList" style={{ marginBottom: "20px" }}>
              {comments.map((c, index) => (
                <li
                  key={c.id}
                  className="commentListItem"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className="meta"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--accent-primary)" }}>
                      {c.author_name ?? `User #${c.author_id}`}
                    </span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {c.body}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addComment} className="form">
            <div>
              <label className="label">Add a comment</label>
              <textarea
                className="textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                placeholder="Write your comment..."
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn primary" disabled={!newComment || submitting}>
                {submitting ? "Sending..." : "💬 Add Comment"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Shell>
  );
}

function truncateText(text, max = 60) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
