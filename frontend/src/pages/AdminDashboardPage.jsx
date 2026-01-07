import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Shell from "../components/shell.jsx";
import AdvancedFilterModal, { evaluateAdvanced } from "../components/AdvancedFilterModal.jsx";

const STATUS = ["new", "assigned", "pending", "closed"];

function truncateText(text, max = 30) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
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

function getUrgencyColor(urgency) {
  switch (urgency) {
    case "high": return "#ef4444";
    case "normal": return "#f59e0b";
    case "low": return "#22c55e";
    default: return "#7c5cff";
  }
}

export default function AdminDashboardPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [operators, setOperators] = useState([]); // admins/operators list
  const [userById, setUserById] = useState({}); // submitters + fallback lookup

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // quick filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  // advanced filters
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState(null);

  // table controls
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc"); // asc/desc
  const [selected, setSelected] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const pageSize = 12;

  function nameForUserId(id) {
    if (id == null) return "—";
    return userById[id]?.name ?? `User ${id}`;
  }

  function nameForOperatorId(id) {
    if (id == null) return "—";
    const op = operators.find((o) => o.id === id);
    return op?.name ?? userById[id]?.name ?? `User ${id}`;
  }

  async function loadTickets() {
    setErr(null);
    setLoading(true);
    try {
      const [tix, ops] = await Promise.all([
        apiFetch("/api/tickets/", { token }),
        apiFetch("/api/users/operators", { token }),
      ]);

      setTickets(tix);
      setOperators(ops);

      // Fetch submitter/operator users by ID so we can show NAMES in table & filters
      const ids = new Set();
      for (const t of tix) {
        if (t.created_by_id != null) ids.add(t.created_by_id);
        if (t.operator_id != null) ids.add(t.operator_id);
      }

      // avoid refetching what we already have
      const missing = [...ids].filter((id) => userById[id] == null);

      if (missing.length) {
        const users = await Promise.all(
          missing.map((id) =>
            apiFetch(`/api/users/${id}`, { token }).catch(() => null)
          )
        );
        setUserById((prev) => {
          const next = { ...prev };
          for (const u of users) {
            if (u && u.id != null) next[u.id] = u;
          }
          return next;
        });
      }
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

  function onLogout() {
    logout();
    navigate("/login");
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function getSortValue(t, key) {
    if (key === "created_by_id") return nameForUserId(t.created_by_id);
    if (key === "operator_id") return nameForOperatorId(t.operator_id);
    if (key === "description") return t.description ?? "";
    return t?.[key];
  }

  // ========== STATISTICS ==========
  const stats = useMemo(() => {
    const total = tickets.length;
    const byStatus = { new: 0, assigned: 0, pending: 0, closed: 0 };
    let highPriority = 0;
    let unassigned = 0;

    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.urgency === "high") highPriority++;
      if (t.operator_id == null) unassigned++;
    }

    const open = byStatus.new + byStatus.assigned + byStatus.pending;

    return { total, open, highPriority, unassigned, byStatus };
  }, [tickets]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const ctx = {
      userById,
      operators,
    };

    return tickets
      .filter((t) => {
        const okStatus = statusFilter === "all" || t.status === statusFilter;

        const okQ =
          !needle ||
          String(t.id).includes(needle) ||
          (t.description ?? "").toLowerCase().includes(needle) ||
          (t.request_type ?? "").toLowerCase().includes(needle) ||
          nameForUserId(t.created_by_id).toLowerCase().includes(needle) ||
          nameForOperatorId(t.operator_id).toLowerCase().includes(needle);

        const okAdv = evaluateAdvanced(t, adv, ctx);
        return okStatus && okQ && okAdv;
      })
      .sort((a, b) => {
        const av = getSortValue(a, sortKey);
        const bv = getSortValue(b, sortKey);
        const c = compare(av, bv);
        return sortDir === "asc" ? c : -c;
      });
  }, [tickets, statusFilter, q, adv, sortKey, sortDir, userById, operators]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  useEffect(() => setPage(1), [statusFilter, q, adv]);

  const allOnPageSelected = useMemo(() => {
    if (pageRows.length === 0) return false;
    return pageRows.every((t) => selected.has(t.id));
  }, [pageRows, selected]);

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach((t) => next.delete(t.id));
      else pageRows.forEach((t) => next.add(t.id));
      return next;
    });
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sortIcon(key) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  function setQuickFilter(filter) {
    if (filter === "high") {
      setStatusFilter("all");
      setQ("");
      // Use advanced filter for high priority
    } else if (filter === "unassigned") {
      setStatusFilter("new");
      setQ("");
    } else {
      setStatusFilter(filter);
      setQ("");
    }
  }

  return (
    <>
      <Shell title="Admin Dashboard" subtitle="Manage all tickets across the system">
        {/* ========== STATISTICS CARDS ========== */}
        <div className="statsGrid">
          <div 
            className="statCard" 
            style={{ "--stat-accent": "linear-gradient(135deg, #7c5cff, #00d4ff)" }}
          >
            <div className="statIcon">📊</div>
            <div className="statValue">{stats.total}</div>
            <div className="statLabel">Total Tickets</div>
            <div className="statSubtext">All time</div>
          </div>

          <div 
            className="statCard"
            style={{ "--stat-accent": "#00d4ff", "--stat-glow": "rgba(0, 212, 255, 0.2)" }}
          >
            <div className="statIcon">📥</div>
            <div className="statValue">{stats.open}</div>
            <div className="statLabel">Open Tickets</div>
            <div className="statSubtext">Needs attention</div>
          </div>

          <div 
            className="statCard"
            style={{ "--stat-accent": "#ef4444", "--stat-glow": "rgba(239, 68, 68, 0.2)" }}
          >
            <div className="statIcon">🔥</div>
            <div className="statValue">{stats.highPriority}</div>
            <div className="statLabel">High Priority</div>
            <div className="statSubtext">Urgent</div>
          </div>

          <div 
            className="statCard"
            style={{ "--stat-accent": "#22c55e", "--stat-glow": "rgba(34, 197, 94, 0.2)" }}
          >
            <div className="statIcon">✅</div>
            <div className="statValue">{stats.byStatus.closed}</div>
            <div className="statLabel">Closed</div>
            <div className="statSubtext">Resolved</div>
          </div>
        </div>

        {/* ========== STATUS DISTRIBUTION ========== */}
        <section className="card" style={{ marginBottom: "24px" }}>
          <h3 className="cardTitle" style={{ marginBottom: "8px" }}>📈 Status Distribution</h3>
          
          <div className="statusBar">
            {stats.total > 0 && (
              <>
                <div 
                  className="segment" 
                  style={{ 
                    width: `${(stats.byStatus.new / stats.total) * 100}%`, 
                    background: "#00d4ff" 
                  }} 
                />
                <div 
                  className="segment" 
                  style={{ 
                    width: `${(stats.byStatus.assigned / stats.total) * 100}%`, 
                    background: "#7c5cff" 
                  }} 
                />
                <div 
                  className="segment" 
                  style={{ 
                    width: `${(stats.byStatus.pending / stats.total) * 100}%`, 
                    background: "#f59e0b" 
                  }} 
                />
                <div 
                  className="segment" 
                  style={{ 
                    width: `${(stats.byStatus.closed / stats.total) * 100}%`, 
                    background: "#22c55e" 
                  }} 
                />
              </>
            )}
          </div>

          <div className="statusLegend">
            <div className="legendItem">
              <span className="legendDot" style={{ background: "#00d4ff" }} />
              <span>New <b>{stats.byStatus.new}</b></span>
            </div>
            <div className="legendItem">
              <span className="legendDot" style={{ background: "#7c5cff" }} />
              <span>Assigned <b>{stats.byStatus.assigned}</b></span>
            </div>
            <div className="legendItem">
              <span className="legendDot" style={{ background: "#f59e0b" }} />
              <span>Pending <b>{stats.byStatus.pending}</b></span>
            </div>
            <div className="legendItem">
              <span className="legendDot" style={{ background: "#22c55e" }} />
              <span>Closed <b>{stats.byStatus.closed}</b></span>
            </div>
          </div>
        </section>

        {/* ========== QUICK ACTIONS ========== */}
        <div className="quickActions">
          <button 
            className={`btn ghost ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setQuickFilter("all")}
          >
            📋 All Tickets
          </button>
          <button 
            className={`btn ghost ${statusFilter === "new" ? "active" : ""}`}
            onClick={() => setQuickFilter("new")}
          >
            🆕 New ({stats.byStatus.new})
          </button>
          <button 
            className={`btn ghost ${statusFilter === "assigned" ? "active" : ""}`}
            onClick={() => setQuickFilter("assigned")}
          >
            👤 Assigned ({stats.byStatus.assigned})
          </button>
          <button 
            className={`btn ghost ${statusFilter === "pending" ? "active" : ""}`}
            onClick={() => setQuickFilter("pending")}
          >
            ⏳ Pending ({stats.byStatus.pending})
          </button>
          <button 
            className={`btn ghost ${statusFilter === "closed" ? "active" : ""}`}
            onClick={() => setQuickFilter("closed")}
          >
            ✅ Closed ({stats.byStatus.closed})
          </button>
        </div>

        <div className="toolbarRow" style={{ marginBottom: "16px" }}>
          <button className="btn ghost" onClick={loadTickets}>
            🔄 Refresh
          </button>
          <button className="btn ghost" onClick={() => setAdvOpen(true)}>
            🔍 Advanced Filter
          </button>
        </div>

        {err && <div className="error">{err}</div>}

        <section className="card" style={{ marginBottom: "16px" }}>
          <div className="toolbarRow">
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <label className="label" style={{ margin: 0 }}>Status</label>
              <select
                className="select"
                style={{ width: "auto", minWidth: "140px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <input
              className="input"
              style={{ flex: "1 1 280px" }}
              placeholder="🔍 Search: id, submitter, description, category..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="pillRow">
            <span className="pill">
              <b>Total:</b> {tickets.length}
            </span>
            <span className="pill">
              <b>Shown:</b> {filtered.length}
            </span>
            <span className="pill">
              <b>Selected:</b> {selected.size}
            </span>
            <span
              className="pill"
              style={{
                borderColor: adv ? "#7c5cff" : undefined,
                color: adv ? "#7c5cff" : undefined,
              }}
            >
              <b>Filter:</b> {adv ? "ON" : "OFF"}
            </span>
          </div>
        </section>

        <section className="card">
          <div className="tableWrap" style={{ maxHeight: "500px", overflowY: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="th" style={{ width: 44 }}>
                    <input
                      className="checkbox"
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                    />
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("id")}>
                      # <span className="sortIcon">{sortIcon("id")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("status")}>
                      Status <span className="sortIcon">{sortIcon("status")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("created_by_id")}>
                      Submitter <span className="sortIcon">{sortIcon("created_by_id")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("description")}>
                      Description <span className="sortIcon">{sortIcon("description")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("request_type")}>
                      Category <span className="sortIcon">{sortIcon("request_type")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("operator_id")}>
                      Assigned <span className="sortIcon">{sortIcon("operator_id")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("urgency")}>
                      Urgency <span className="sortIcon">{sortIcon("urgency")}</span>
                    </button>
                  </th>

                  <th className="th" style={{ width: 100 }}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="tr">
                    <td className="td" colSpan={9}>
                      <div className="meta loading">Loading tickets...</div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr className="tr">
                    <td className="td" colSpan={9}>
                      <div className="meta">No matching tickets found.</div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((t) => (
                    <tr 
                      key={t.id} 
                      className={`tr ${t.urgency === "high" ? "highPriority" : ""}`}
                    >
                      <td className="td">
                        <input
                          className="checkbox"
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleOne(t.id)}
                        />
                      </td>

                      <td className="td">
                        <b style={{ color: "#7c5cff" }}>#{t.id}</b>
                      </td>
                      <td className="td">
                        <span
                          className="badge"
                          style={{
                            borderColor: getStatusColor(t.status),
                            color: getStatusColor(t.status),
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="td">{nameForUserId(t.created_by_id)}</td>
                      <td className="td" title={t.description ?? ""}>
                        {truncateText(t.description, 30)}
                      </td>
                      <td className="td">{t.request_type}</td>
                      <td className="td">{nameForOperatorId(t.operator_id)}</td>
                      <td className="td">
                        <span
                          style={{
                            color: getUrgencyColor(t.urgency),
                            fontWeight: 600,
                          }}
                        >
                          {t.urgency}
                        </span>
                      </td>

                      <td className="td">
                        <Link className="btn ghost" to={`/admin/tickets/${t.id}`}>
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="toolbarRow" style={{ marginTop: "16px", justifyContent: "space-between" }}>
            <div className="meta">
              Page <b>{pageSafe}</b> of <b>{totalPages}</b>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn ghost"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <button
                className="btn ghost"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        </section>
      </Shell>

      <AdvancedFilterModal
        open={advOpen}
        value={adv}
        onClose={() => setAdvOpen(false)}
        onApply={(ast) => setAdv(ast)}
        token={token}
        operators={operators}
      />
    </>
  );
}
