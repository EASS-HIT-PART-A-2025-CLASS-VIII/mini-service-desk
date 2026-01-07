import { useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function CreateTicketModal({ open, onClose, onTicketCreated }) {
  const { token } = useAuth();

  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("software");
  const [urgency, setUrgency] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;

    setError(null);
    setSubmitting(true);

    try {
      const ticket = await apiFetch("/api/tickets/", {
        token,
        method: "POST",
        json: {
          description: description.trim(),
          request_type: requestType,
          urgency,
        },
      });

      setDescription("");
      setRequestType("software");
      setUrgency("normal");
      onTicketCreated?.(ticket);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setDescription("");
    setRequestType("software");
    setUrgency("normal");
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modalOverlay" onClick={handleClose}>
      <div 
        className="modalCard" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500 }}
      >
        <div className="modalHead">
          <h2 style={{ margin: 0 }}>📝 Create New Ticket</h2>
          <button className="btn ghost" onClick={handleClose}>✕</button>
        </div>

        {error && <div className="error" style={{ margin: "0 16px" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ padding: "16px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label className="label">Description</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe your issue or request in detail..."
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label className="label">Category</label>
              <select
                className="select"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
              >
                <option value="software">💻 Software</option>
                <option value="hardware">🖥️ Hardware</option>
                <option value="environment">🏢 Environment</option>
                <option value="logistics">📦 Logistics</option>
                <option value="other">📋 Other</option>
              </select>
            </div>

            <div>
              <label className="label">Urgency</label>
              <select
                className="select"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
              >
                <option value="low">🟢 Low</option>
                <option value="normal">🟡 Normal</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={!description.trim() || submitting}
            >
              {submitting ? "Creating..." : "➕ Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
