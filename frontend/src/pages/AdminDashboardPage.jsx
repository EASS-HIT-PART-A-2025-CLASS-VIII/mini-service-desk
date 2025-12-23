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

  return (
    <>
      <Shell title="Admin Dashboard" subtitle="All tickets across the system">
        <div className="toolbarRow" style={{ marginBottom: 12 }}>
          <button className="btn ghost" onClick={loadTickets}>
            Refresh
          </button>
          <button className="btn ghost" onClick={() => setAdvOpen(true)}>
            Advanced filter
          </button>
        </div>

        {err && <div className="error">{err}</div>}

        <section className="card" style={{ marginBottom: 12 }}>
          <div className="toolbarRow">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="label">Status</div>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
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
              placeholder="Search: id / submitter / description / sub-category / assigned…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="pillRow">
            <div className="pill">
              <b>Total:</b> {tickets.length}
            </div>
            <div className="pill">
              <b>Shown:</b> {filtered.length}
            </div>
            <div className="pill">
              <b>Selected:</b> {selected.size}
            </div>
            <div className="pill">
              <b>Advanced:</b> {adv ? "ON" : "OFF"}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="tableWrap">
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
                      Sub-Category <span className="sortIcon">{sortIcon("request_type")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("operator_id")}>
                      Assigned to <span className="sortIcon">{sortIcon("operator_id")}</span>
                    </button>
                  </th>

                  <th className="th">
                    <button className="thBtn" onClick={() => toggleSort("urgency")}>
                      Urgency <span className="sortIcon">{sortIcon("urgency")}</span>
                    </button>
                  </th>

                  <th className="th" style={{ width: 120 }}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="tr">
                    <td className="td" colSpan={9}>
                      <div className="meta">Loading…</div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr className="tr">
                    <td className="td" colSpan={9}>
                      <div className="meta">No matching tickets.</div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((t) => (
                    <tr key={t.id} className="tr">
                      <td className="td">
                        <input
                          className="checkbox"
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleOne(t.id)}
                        />
                      </td>

                      <td className="td">
                        <b>#{t.id}</b>
                      </td>
                      <td className="td">{t.status}</td>
                      <td className="td">{nameForUserId(t.created_by_id)}</td>
                      <td className="td" title={t.description ?? ""}>
                        <div>{truncateText(t.description, 30)}</div>
                      </td>
                      <td className="td">{t.request_type}</td>
                      <td className="td">{nameForOperatorId(t.operator_id)}</td>
                      <td className="td">{t.urgency}</td>

                      <td className="td">
                        <Link className="btn ghost" to={`/admin/tickets/${t.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="toolbarRow" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <div className="meta">
              Page <b>{pageSafe}</b> / <b>{totalPages}</b>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn ghost"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="btn ghost"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
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
