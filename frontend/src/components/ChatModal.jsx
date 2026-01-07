import { useState, useRef, useEffect } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ChatModal({ open, onClose, onTicketCreated }) {
  const { token } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "👋 Hi! I'm your IT support assistant. Tell me about the issue you're experiencing, and I'll help you create a support ticket.\n\nFor example:\n• \"My screen keeps flickering\"\n• \"I need Excel installed\"\n• \"The printer isn't working\"",
      }]);
    }
  }, [open]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput("");
    setError(null);
    setTicketData(null);
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    
    try {
      const response = await apiFetch("/api/chat/message", {
        token,
        method: "POST",
        json: {
          messages: messages.filter(m => m.role !== "system"),
          message: userMessage,
        },
      });
      
      setMessages(prev => [...prev, { role: "assistant", content: response.response }]);
      if (response.ticket_data) {
        setTicketData(response.ticket_data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTicket() {
    if (!ticketData) return;
    setCreating(true);
    setError(null);
    
    try {
      const ticket = await apiFetch("/api/chat/create-ticket", {
        token,
        method: "POST",
        json: ticketData,
      });
      
      setMessages([]);
      setTicketData(null);
      onTicketCreated?.(ticket);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function handleClose() {
    setMessages([]);
    setTicketData(null);
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modalOverlay" onClick={handleClose}>
      <div 
        className="modalCard" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: 600, height: "80vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modalHead">
          <h2 style={{ margin: 0 }}>🤖 AI Support Chat</h2>
          <button className="btn ghost" onClick={handleClose}>✕</button>
        </div>

        {error && <div className="error" style={{ margin: "0 16px" }}>{error}</div>}

        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" 
                  ? "linear-gradient(135deg, #7c5cff 0%, #00d4ff 100%)" 
                  : "rgba(255, 255, 255, 0.05)",
                color: msg.role === "user" ? "#fff" : "inherit",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
          ))}
          
          {loading && (
            <div style={{
              alignSelf: "flex-start",
              padding: "12px 16px",
              borderRadius: "16px 16px 16px 4px",
              background: "rgba(255, 255, 255, 0.05)",
            }}>
              ⏳ Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {ticketData && (
          <div style={{ 
            margin: "0 16px 16px", 
            padding: "16px", 
            background: "rgba(34, 197, 94, 0.1)", 
            borderRadius: 8,
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "#22c55e" }}>
              ✅ Ready to create ticket:
            </div>
            <div style={{ fontSize: 14 }}>
              <div><b>Description:</b> {ticketData.description}</div>
              <div><b>Urgency:</b> {ticketData.urgency}</div>
              <div><b>Category:</b> {ticketData.request_type}</div>
            </div>
            <button 
              className="btn primary" 
              onClick={handleCreateTicket}
              disabled={creating}
              style={{ marginTop: 12, width: "100%" }}
            >
              {creating ? "Creating..." : "➕ Create Ticket"}
            </button>
            <button 
              className="btn ghost" 
              onClick={() => { setTicketData(null); setMessages([]); }}
              style={{ marginTop: 8, width: "100%" }}
            >
              ↩️ Start Over
            </button>
          </div>
        )}

        {ticketData ? (
          <div style={{ 
            padding: "16px", 
            borderTop: "1px solid rgba(255,255,255,0.08)",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}>
            👆 Create the ticket above or start over
          </div>
        ) : (
          <form onSubmit={handleSend} style={{ 
            padding: "16px", 
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "8px",
          }}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your issue..."
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button 
              className="btn primary" 
              type="submit"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
