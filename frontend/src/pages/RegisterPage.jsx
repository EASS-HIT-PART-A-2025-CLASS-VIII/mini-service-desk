import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api/client.js";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      await apiFetch("/api/users/", {
        method: "POST",
        json: { name, email, password, is_admin: false },
      });

      navigate("/login", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authContainer">
      <div className="authCard">
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✨</div>
          <h1 className="h1">Create account</h1>
          <p className="h2">Register to open and track tickets</p>
        </div>

        {err && <div className="error">{err}</div>}

        <section className="card">
          <h3 className="cardTitle">Register</h3>

          <form onSubmit={onSubmit} className="form">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            <button
              className="btn primary"
              style={{ width: "100%", padding: "14px" }}
              disabled={loading || !name || !email || !password}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <div className="meta" style={{ justifyContent: "center" }}>
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}