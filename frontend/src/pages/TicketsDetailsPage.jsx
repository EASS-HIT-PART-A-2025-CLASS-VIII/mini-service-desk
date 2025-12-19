import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function TicketsDetailsPage() {
  const { id } = useParams();
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [err, setErr] = useState(null);

  async function load() {
    setErr(null);
    try {
      const t = await apiFetch(`/api/tickets/${id}`, { token });
      const c = await apiFetch(`/api/tickets/${id}/comments`, { token });
      setTicket(t);
      setComments(c);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addComment(e) {
    e.preventDefault();
    setErr(null);
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

  if (err) return <div style={{ padding: 16 }}>Error: {err}</div>;
  if (!ticket) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/tickets">← Back</Link>
        <button onClick={onLogout}>Logout</button>
      </div>

      <h2 style={{ marginTop: 12 }}>
        Ticket #{ticket.id}: {ticket.subject}
      </h2>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <p><b>Status:</b> {ticket.status}</p>
        <p><b>Urgency:</b> {ticket.urgency}</p>
        <p><b>Type:</b> {ticket.request_type}</p>
        <p><b>Body:</b><br />{ticket.body}</p>
      </div>

      <h3 style={{ marginTop: 24 }}>Comments</h3>

      {comments.length === 0 ? (
        <div>No comments yet.</div>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {comments.map((c) => (
            <li key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                author_id: {c.author_id} | {new Date(c.created_at).toLocaleString()}
              </div>
              <div>{c.body}</div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addComment} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
          placeholder="Write a comment…"
          style={{ width: "100%", padding: 10 }}
        />
        <button disabled={!newComment}>Add comment</button>
      </form>
    </div>
  );
}