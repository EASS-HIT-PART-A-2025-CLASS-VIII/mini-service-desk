import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

export default function AdminTicketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [admins, setAdmins] = useState([]);

  const [submitterName, setSubmitterName] = useState("—");

  const [statusVal, setStatusVal] = useState("new");
  const [urgencyVal, setUrgencyVal] = useState("normal");
  const [operatorIdVal, setOperatorIdVal] = useState("");

  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const [t, c, a] = await Promise.all([
        apiFetch(`/api/tickets/${id}`, { token }),
        apiFetch(`/api/tickets/${id}/comments`, { token }),
        apiFetch(`/api/users/operators`, { token }),
      ]);

      setTicket(t);
      setComments(c);
      setAdmins(a);

      setStatusVal(t.status ?? "new");
      setUrgencyVal(t.urgency ?? "normal");
      setOperatorIdVal(t.operator_id == null ? "" : String(t.operator_id));

      try {
        const u = await apiFetch(`/api/users/${t.created_by_id}`, { token });
        setSubmitterName(u?.name || u?.email || "—");
      } catch {
        setSubmitterName("—");
      }
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

  const operatorLabel = useMemo(() => {
    if (!ticket?.operator_id) return "—";
    const op = admins.find((u) => u.id === ticket.operator_id);
    return op ? op.name : "—";
  }, [ticket, admins]);


  function onChangeStatus(nextStatus) {
    setStatusVal(nextStatus);

    // if status is new => force unassigned (backend rule)
    if (nextStatus === "new") {
      setOperatorIdVal("");
    }
  }

  function onChangeOperator(nextOperatorId) {
    setOperatorIdVal(nextOperatorId);

    if (nextOperatorId === "") {
      setStatusVal("new");
      return;
    }

    // if operator assigned while status is new => auto move to assigned
    if (statusVal === "new") {
      setStatusVal("assigned");
    }
  }

  async function saveQuickEdit(e) {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    const operatorToSend = operatorIdVal === "" ? null : Number(operatorIdVal);
    const statusToSend =
      operatorToSend != null && statusVal === "new" ? "assigned" : statusVal;

    const operatorFinal = statusToSend === "new" ? null : operatorToSend;

    try {
      await apiFetch(`/api/tickets/${id}`, {
        token,
        method: "PATCH",
        json: {
          status: statusToSend,
          urgency: urgencyVal,
          operator_id: operatorFinal,
        },
      });
      await loadAll();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
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
        <Link className="navlink" to="/admin" style={{ marginTop: "16px", display: "inline-flex" }}>
          ← Back to dashboard
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
    <>
      <Shell title={`Ticket #${ticket.id}`} subtitle={truncateText(ticket.description, 60)}>
        <div style={{ marginBottom: "16px" }}>
          <Link className="navlink" to="/admin">
            ← Back to dashboard
          </Link>
        </div>

        <div className="grid">
          {/* Ticket Details & Edit */}
          <section className="card">
            <h3 className="cardTitle">📝 Ticket Details</h3>

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
              <span className="badge">
                Assigned: {operatorLabel}
              </span>
              <span className="badge">
                Created by: {submitterName}
              </span>
            </div>

            <div className="card solid" style={{ padding: "16px", marginBottom: "20px" }}>
              <div className="label">Description</div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: "8px", lineHeight: 1.7 }}>
                {ticket.description}
              </div>
            </div>

            <form onSubmit={saveQuickEdit} className="form">
              <div>
                <label className="label">Status</label>
                <select
                  className="select"
                  value={statusVal}
                  onChange={(e) => onChangeStatus(e.target.value)}
                >
                  <option value="new">🆕 New</option>
                  <option value="assigned">👤 Assigned</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="closed">✅ Closed</option>
                </select>
              </div>

              <div>
                <label className="label">Urgency</label>
                <select
                  className="select"
                  value={urgencyVal}
                  onChange={(e) => setUrgencyVal(e.target.value)}
                >
                  <option value="low">🟢 Low</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              <div>
                <label className="label">Assign to Operator</label>
                <select
                  className="select"
                  value={operatorIdVal}
                  onChange={(e) => onChangeOperator(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {admins.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {statusVal === "new" && (
                  <div className="meta" style={{ marginTop: "8px" }}>
                    💡 Assigning an operator will automatically move status to <b>assigned</b>.
                  </div>
                )}
              </div>

              <button className="btn primary" disabled={saving}>
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
            </form>
          </section>

          {/* Comments Section */}
          <section className="card">
            <div className="spread" style={{ marginBottom: "16px" }}>
              <h3 className="cardTitle" style={{ margin: 0 }}>💬 Comments</h3>
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

            <form onSubmit={submitComment} className="form">
              <div>
                <label className="label">Add Admin Comment</label>
                <textarea
                  className="textarea"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  placeholder="Write your comment..."
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn primary" disabled={!newComment}>
                  💬 Add Comment
                </button>
              </div>
            </form>
          </section>
        </div>
      </Shell>
    </>
  );
}

function truncateText(text, max = 60) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
