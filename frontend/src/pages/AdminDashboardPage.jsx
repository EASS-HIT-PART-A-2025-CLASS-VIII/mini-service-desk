import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AdminDashboardPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

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

  const stats = useMemo(() => {
    const byStatus = {};
    for (const t of tickets) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    return { total: tickets.length, byStatus };
  }, [tickets]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tickets.filter((t) => {
      const okStatus = statusFilter === "all" || t.status === statusFilter;
      const okQ =
        !needle ||
        String(t.id).includes(needle) ||
        (t.subject ?? "").toLowerCase().includes(needle) ||
        (t.body ?? "").toLowerCase().includes(needle);
      return okStatus && okQ;
    });
  }, [tickets, statusFilter, q]);

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 1000, margin: "30px auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Admin Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div><b>Total:</b> {stats.total}</div>
          {Object.entries(stats.byStatus).map(([k, v]) => (
            <div key={k}><b>{k}:</b> {v}</div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ marginLeft: 8, padding: 8 }}
            >
              <option value="all">All</option>
              <option value="new">new</option>
              <option value="in_progress">in_progress</option>
              <option value="resolved">resolved</option>
              <option value="closed">closed</option>
            </select>
          </label>

          <input
            placeholder="Search id / subject / body…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: 8, flex: "1 1 280px" }}
          />

          <button onClick={loadTickets}>Refresh</button>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>All tickets</h2>

        {loading ? (
          <div>Loading…</div>
        ) : filtered.length === 0 ? (
          <div>No matching tickets.</div>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {filtered.map((t) => (
              <li key={t.id} style={{ marginBottom: 10 }}>
                <Link to={`/admin/tickets/${t.id}`} style={{ textDecoration: "none" }}>
                  <div>
                    <b>#{t.id}</b> {t.subject}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    status: {t.status} | urgency: {t.urgency} | type: {t.request_type} | operator_id: {t.operator_id ?? "—"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}