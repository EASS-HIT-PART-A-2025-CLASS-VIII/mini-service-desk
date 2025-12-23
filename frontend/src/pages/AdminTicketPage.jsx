import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Shell from "../components/shell.jsx";

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

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (err) return <div style={{ padding: 16, color: "crimson" }}>Error: {err}</div>;
  if (!ticket) return <div style={{ padding: 16 }}>Ticket not found.</div>;

  return (
    <>
      <Shell
        title={`Ticket #${ticket.id}`}
        subtitle={ticket.description}
        right={<Link className="btn ghost" to="/admin">Back</Link>}
      >
        <section className="card">
          <h3 className="cardTitle">Ticket details</h3>

          <div className="pillRow" style={{ marginBottom: 12 }}>
            <span className="pill">
              <span className="pillKey">Status</span>
              <span className="pillVal">{ticket.status}</span>
            </span>

            <span className="pill">
              <span className="pillKey">Urgency</span>
              <span className="pillVal">{ticket.urgency}</span>
            </span>

            <span className="pill">
              <span className="pillKey">Type</span>
              <span className="pillVal">{ticket.request_type}</span>
            </span>

            <span className="pill">
              <span className="pillKey">Operator</span>
              <span className="pillVal">{operatorLabel}</span>
            </span>

            <span className="pill">
              <span className="pillKey">Created by</span>
              <span className="pillVal">{submitterName}</span>
            </span>
          </div>

          <div className="commentList" style={{ marginTop: 12 }}>
            <div className="commentListItem">
              <div className="meta" style={{ fontWeight: 600, textTransform: "uppercase" }}>
                Description
              </div>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  marginTop: 8,
                }}
              >
                {ticket.description}
              </div>
            </div>
          </div>

          <form onSubmit={saveQuickEdit} className="form" style={{ marginTop: 16 }}>
            <div>
              <div className="label">Status</div>
              <select
                className="select"
                value={statusVal}
                onChange={(e) => onChangeStatus(e.target.value)}
              >
                <option value="new">new</option>
                <option value="assigned">assigned</option>
                <option value="pending">pending</option>
                <option value="closed">closed</option>
              </select>
            </div>

            <div>
              <div className="label">Urgency</div>
              <select
                className="select"
                value={urgencyVal}
                onChange={(e) => setUrgencyVal(e.target.value)}
              >
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
              </select>
            </div>

            <div>
              <div className="label">Operator</div>
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
                <div className="meta" style={{ marginTop: 6 }}>
                  Assigning an operator will automatically move status to <b>assigned</b>.
                </div>
              )}
            </div>

            <button className="btn primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        <section className="card" style={{ marginTop: 16 }}>
          <h3 className="cardTitle">Comments</h3>

          {comments.length === 0 ? (
            <div className="meta">No comments yet.</div>
          ) : (
            <ul className="commentList">
              {comments.map((c) => {
                const authorLabel = c.author_name ?? `User #${c.author_id}`;
                return (
                  <li key={c.id} className="commentListItem">
                    <div className="meta">
                      {authorLabel} • {String(c.created_at)}
                    </div>
                    <div>{c.body}</div>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={submitComment} className="form" style={{ marginTop: 12 }}>
            <div>
              <div className="label">Add comment</div>
              <textarea
                className="textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                placeholder="Write a comment as admin…"
              />
            </div>
            <button className="btn primary" disabled={!newComment}>
              Add comment
            </button>
          </form>
        </section>
      </Shell>
    </>
  );
}
