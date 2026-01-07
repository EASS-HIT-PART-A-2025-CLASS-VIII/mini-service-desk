import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client.js";

const FIELD_OPTIONS = [
  { key: "status", label: "Status", type: "enum", options: ["new", "assigned", "pending", "closed"] },
  { key: "submitter", label: "Submitter", type: "user" }, // created_by_id -> name
  { key: "description", label: "Description", type: "text" },
  { key: "sub_category", label: "Sub-Category", type: "enum", options: ["software", "hardware", "environment", "logistics", "other"] }, // request_type
  { key: "assigned_to", label: "Assigned to", type: "operator" }, // operator_id -> operator name
  { key: "urgency", label: "Urgency", type: "enum", options: ["low", "normal", "high"] },
];

const OP_BY_TYPE = {
  text: [
    { key: "contains", label: "contains" },
    { key: "equals", label: "equals" },
    { key: "starts_with", label: "starts with" },
    { key: "ends_with", label: "ends with" },
    { key: "not_equals", label: "not equals" },
  ],
  enum: [
    { key: "equals", label: "equals" },
    { key: "not_equals", label: "not equals" },
  ],
  user: [
    { key: "contains", label: "contains" },
    { key: "equals", label: "equals" },
    { key: "starts_with", label: "starts with" },
    { key: "not_equals", label: "not equals" },
  ],
  operator: [
    { key: "equals", label: "equals" },
    { key: "not_equals", label: "not equals" },
    { key: "is_empty", label: "is empty" },
    { key: "is_not_empty", label: "is not empty" },
  ],
};

function getFieldMeta(fieldKey) {
  return FIELD_OPTIONS.find((f) => f.key === fieldKey) ?? FIELD_OPTIONS[0];
}

function toLower(v) {
  return (v ?? "").toString().toLowerCase();
}

function getTicketValue(ticket, fieldKey, ctx) {
  switch (fieldKey) {
    case "submitter": {
      const id = ticket.created_by_id;
      const name = ctx?.userById?.[id]?.name;
      return name ?? String(id ?? "");
    }
    case "description":
      return ticket.description ?? "";
    case "sub_category":
      return ticket.request_type;
    case "assigned_to": {
      const id = ticket.operator_id;
      if (id == null) return "";
      const op = ctx?.operators?.find((u) => u.id === id);
      return op?.name ?? String(id);
    }
    default:
      return ticket?.[fieldKey];
  }
}

function evalRule(ticket, rule, ctx) {
  const field = rule.field ?? "status";
  const op = rule.op ?? "equals";
  const meta = getFieldMeta(field);

  const tv = getTicketValue(ticket, field, ctx);

  if (op === "is_empty") return tv == null || String(tv).trim() === "";
  if (op === "is_not_empty") return !(tv == null || String(tv).trim() === "");

  const left = toLower(tv);
  const right = toLower(rule.value);

  if (op === "equals") return left === right;
  if (op === "not_equals") return left !== right;
  if (op === "contains") return left.includes(right);
  if (op === "starts_with") return left.startsWith(right);
  if (op === "ends_with") return left.endsWith(right);

  // for enums, equals/not_equals already handled
  return true;
}

/**
 * evaluateAdvanced(ticket, adv, ctx?)
 * ctx can include:
 *  - userById: { [id]: {name,...} }
 *  - operators: [{id,name,...}]
 */
export function evaluateAdvanced(ticket, adv, ctx) {
  if (!adv || !adv.rules || adv.rules.length === 0) return true;

  let result = evalRule(ticket, adv.rules[0], ctx);

  for (let i = 1; i < adv.rules.length; i++) {
    const r = adv.rules[i];
    const cur = evalRule(ticket, r, ctx);
    const join = (r.join ?? "AND").toUpperCase();
    result = join === "OR" ? result || cur : result && cur;
  }

  return result;
}

function defaultRule() {
  return { join: "AND", field: "status", op: "equals", value: "new" };
}

export default function AdvancedFilterModal({ open, value, onClose, onApply, token, operators = [] }) {
  const initial = useMemo(() => {
    if (value?.rules?.length) return value;
    return { rules: [defaultRule()] };
  }, [value]);

  const [draft, setDraft] = useState(initial);

  // submitter autocomplete suggestions per rule idx
  const [submitterSug, setSubmitterSug] = useState({}); // { [idx]: ["Ben", "Benny", ...] }

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  if (!open) return null;

  function updateRule(idx, patch) {
    setDraft((prev) => {
      const next = { ...prev, rules: [...prev.rules] };
      next.rules[idx] = { ...next.rules[idx], ...patch };
      return next;
    });
  }

  function addRule() {
    setDraft((prev) => ({
      ...prev,
      rules: [...prev.rules, { join: "AND", field: "status", op: "equals", value: "new" }],
    }));
  }

  function removeRule(idx) {
    setDraft((prev) => {
      const rules = prev.rules.filter((_, i) => i !== idx);
      return { ...prev, rules: rules.length ? rules : [defaultRule()] };
    });
    setSubmitterSug((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }

  function clearAll() {
    setDraft({ rules: [defaultRule()] });
    setSubmitterSug({});
    onApply(null);  // Turn off the filter
    onClose();
  }

  async function fetchSubmitterSuggestions(idx, q) {
    const needle = (q ?? "").trim();
    if (!token || needle.length < 2) {
      setSubmitterSug((prev) => ({ ...prev, [idx]: [] }));
      return;
    }

    try {
      const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(needle)}`, { token });
      const names = (res ?? []).map((u) => u.name).filter(Boolean);
      setSubmitterSug((prev) => ({ ...prev, [idx]: names }));
    } catch {
      setSubmitterSug((prev) => ({ ...prev, [idx]: [] }));
    }
  }

  function apply() {
    const cleaned = {
      rules: draft.rules.filter((r) => {
        const meta = getFieldMeta(r.field ?? "status");
        if (meta.type === "operator" && (r.op === "is_empty" || r.op === "is_not_empty")) return true;
        if (meta.type === "enum") return (r.value ?? "").toString().trim().length > 0;
        return (r.value ?? "").toString().trim().length > 0;
      }),
    };

    onApply(cleaned.rules.length ? cleaned : null);
    onClose();
  }

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modalCard card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="toolbarRow" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Advanced filter</div>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={clearAll}>
            Clear
          </button>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="form" style={{ gap: 10 }}>
          {draft.rules.map((r, idx) => {
            const fieldMeta = getFieldMeta(r.field ?? "status");
            const ops = OP_BY_TYPE[fieldMeta.type] ?? OP_BY_TYPE.text;

            const showValue = !(fieldMeta.type === "operator" && (r.op === "is_empty" || r.op === "is_not_empty"));

            return (
              <div key={idx} className="card" style={{ padding: 12 }}>
                {idx > 0 && (
                  <div style={{ marginBottom: 10, display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="label" style={{ minWidth: 44 }}>
                      Join
                    </div>
                    <select
                      className="select"
                      value={r.join ?? "AND"}
                      onChange={(e) => updateRule(idx, { join: e.target.value })}
                      style={{ maxWidth: 140 }}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div className="label">Field</div>
                    <select
                      className="select"
                      value={r.field ?? "status"}
                      onChange={(e) => {
                        const newField = e.target.value;
                        const meta = getFieldMeta(newField);
                        const firstOp = (OP_BY_TYPE[meta.type] ?? OP_BY_TYPE.text)[0].key;

                        let nextValue = "";
                        if (meta.type === "enum") nextValue = meta.options?.[0] ?? "";
                        if (meta.type === "operator") nextValue = "";
                        if (meta.type === "user") nextValue = "";

                        updateRule(idx, { field: newField, op: firstOp, value: nextValue });
                      }}
                    >
                      {FIELD_OPTIONS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="label">Operator</div>
                    <select
                      className="select"
                      value={r.op ?? "equals"}
                      onChange={(e) => updateRule(idx, { op: e.target.value })}
                    >
                      {ops.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <div className="label">Value</div>

                    {!showValue ? (
                      <div className="meta">No value needed for this operator.</div>
                    ) : fieldMeta.type === "enum" ? (
                      <select
                        className="select"
                        value={r.value ?? ""}
                        onChange={(e) => updateRule(idx, { value: e.target.value })}
                      >
                        {(fieldMeta.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : fieldMeta.type === "operator" ? (
                      <select
                        className="select"
                        value={r.value ?? ""}
                        onChange={(e) => updateRule(idx, { value: e.target.value })}
                      >
                        <option value="">— Select operator —</option>
                        {operators.map((op) => (
                          <option key={op.id} value={op.name}>
                            {op.name}
                          </option>
                        ))}
                      </select>
                    ) : fieldMeta.type === "user" ? (
                      <>
                        <input
                          className="input"
                          value={r.value ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateRule(idx, { value: v });
                            fetchSubmitterSuggestions(idx, v);
                          }}
                          placeholder="Start typing a name…"
                          list={`submitter-dl-${idx}`}
                        />
                        <datalist id={`submitter-dl-${idx}`}>
                          {(submitterSug[idx] ?? []).map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </>
                    ) : (
                      <input
                        className="input"
                        value={r.value ?? ""}
                        onChange={(e) => updateRule(idx, { value: e.target.value })}
                        placeholder="type here…"
                      />
                    )}
                  </div>
                </div>

                <div className="toolbarRow" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                  <button className="btn danger" onClick={() => removeRule(idx)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          <div className="toolbarRow">
            <button className="btn ghost" onClick={addRule}>
              + Add rule
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn primary" onClick={apply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
