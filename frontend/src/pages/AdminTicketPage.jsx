import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AdminTicketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [statusVal, setStatusVal] = useState("new");
  const [urgencyVal, setUrgencyVal] = useState("normal");
  const [operatorIdVal, setOperatorIdVal] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const t = await apiFetch(`/api/tickets/${id}`, { token });
      setTicket(t);
      setStatusVal(t.status ?? "new");
      setUrgencyVal(t.urgency ?? "normal");
      setOperatorIdVal(t.operator_id ?? "");

      const c = await apiFetch(`/api/tickets/${id}/comments`, { token });
      setComments(c);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) navigate("/login");
    else loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function saveAdminPatch(e) {
    e.preventDefault();
    setErr(null);

    try {
      await apiFetch(`/api/tickets/${id}`, {
        token,
        method: "PATCH",
        json: {
          status: statusVal,
          urgency: urgencyVal,
          operator_id: operatorIdVal === "" ? null : Number(operatorIdVal),
        },
      });
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    setErr(null);

    try {
      await apiFetch(`/api/tickets/${id}/comments`, {
        token,
        method: "POST",
        json: { body: newComment },
      });
      setNewComment("");
      await loadAll();
    } catch (e) {
      setErr(e.message);
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (err) return <div style={{ padding: 16, color: "crimson" }}>Error: {err}</div>;
  if (!ticket) return <div style={{ padding: 16 }}>Ticket not found.</div>;

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "system-ui" }}>
      <Link to="/admin">← Back to Admin Dashboard</Link>

      <h2 style={{ marginTop: 16 }}>
        Ticket #{ticket.id}: {ticket.subject}
      </h2>

      <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
        <div style={{ marginBottom: 8 }}><b>Created by:</b> {ticket.created_by_id}</div>
        <div style={{ marginBottom: 8 }}><b>Status:</b> {ticket.status}</div>
        <div style={{ marginBottom: 8 }}><b>Urgency:</b> {ticket.urgency}</div>
        <div style={{ marginBottom: 8 }}><b>Type:</b> {ticket.request_type}</div>
        <div style={{ marginBottom: 8 }}><b>Operator:</b> {ticket.operator_id ?? "—"}</div>
        <div><b>Body:</b><br />{ticket.body}</div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Admin controls</h3>

        <form onSubmit={saveAdminPatch} style={{ display: "grid", gap: 10 }}>
          <label>
            Status
            <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6 }}>
              <option value="new">new</option>
              <option value="in_progress">in_progress</option>
              <option value="resolved">resolved</option>
              <option value="closed">closed</option>
            </select>
          </label>

          <label>
            Urgency
            <select value={urgencyVal} onChange={(e) => setUrgencyVal(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6 }}>
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
            </select>
          </label>

          <label>
            Operator user id
            <input
              value={operatorIdVal}
              onChange={(e) => setOperatorIdVal(e.target.value)}
              placeholder="e.g. 2"
              style={{ width: "100%", padding: 10, marginTop: 6 }}
            />
          </label>

          <button>Save changes</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Comments</h3>

        {comments.length === 0 ? (
          <div>No comments yet.</div>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {comments.map((c) => (
              <li key={c.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  author_id: {c.author_id} • {String(c.created_at)}
                </div>
                <div>{c.body}</div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submitComment} style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            placeholder="Write a comment as admin…"
            style={{ width: "100%", padding: 10 }}
          />
          <button disabled={!newComment}>Add comment</button>
        </form>
      </section>
    </div>
  );
}