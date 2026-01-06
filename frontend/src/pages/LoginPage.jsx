import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const { setToken, refreshMe } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/tickets";

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const data = await apiFetch("/api/users/login", {
        method: "POST",
        form: { username: email, password },
      });

      const accessToken = data.access_token;
      setToken(accessToken);

      const me = await refreshMe(accessToken);

      if (me?.is_admin) navigate("/admin", { replace: true });
      else navigate(from, { replace: true });
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎫</div>
          <h1 className="h1">Welcome back</h1>
          <p className="h2">Sign in to manage your tickets</p>
        </div>

        {err && <div className="error">{err}</div>}

        <section className="card">
          <h3 className="cardTitle">Login</h3>

          <form onSubmit={onSubmit} className="form">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              className="btn primary"
              style={{ width: "100%", padding: "14px" }}
              disabled={loading || !email || !password}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="meta" style={{ justifyContent: "center" }}>
              Don't have an account?{" "}
              <Link to="/register">Create one</Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}