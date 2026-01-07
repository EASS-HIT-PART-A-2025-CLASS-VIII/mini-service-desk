import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api/client.js";

// Simple email validation regex
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [err, setErr] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors = {};
    
    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }
    
    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!password.trim()) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(password)) {
      errors.password = "Password must contain at least one number";
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.password = "Password must contain at least one special character (!@#$%^&*...)";
    }
    
    if (!confirmPassword.trim()) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);
    
    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await apiFetch("/api/users/", {
        method: "POST",
        json: { name: fullName, email: email.trim(), password, is_admin: false },
      });

      navigate("/login", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && password.trim() && confirmPassword.trim();

  return (
    <div className="authContainer">
      <div className="authCard">
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 className="h1">Create account</h1>
          <p className="h2">Register to open and track tickets</p>
        </div>

        {err && <div className="error">{err}</div>}

        <section className="card">
          <h3 className="cardTitle">Register</h3>

          <form onSubmit={onSubmit} className="form">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="label">First Name *</label>
                <input
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  style={fieldErrors.firstName ? { borderColor: "#ef4444" } : {}}
                />
                {fieldErrors.firstName && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.firstName}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Last Name *</label>
                <input
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  style={fieldErrors.lastName ? { borderColor: "#ef4444" } : {}}
                />
                {fieldErrors.lastName && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.lastName}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="label">Email *</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                style={fieldErrors.email ? { borderColor: "#ef4444" } : {}}
              />
              {fieldErrors.email && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                  {fieldErrors.email}
                </div>
              )}
            </div>

            <div>
              <label className="label">Password *</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, uppercase, number, special"
                style={fieldErrors.password ? { borderColor: "#ef4444" } : {}}
              />
              {fieldErrors.password && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                  {fieldErrors.password}
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirm Password *</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                style={fieldErrors.confirmPassword ? { borderColor: "#ef4444" } : {}}
              />
              {fieldErrors.confirmPassword && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                  {fieldErrors.confirmPassword}
                </div>
              )}
            </div>

            <button
              className="btn primary"
              style={{ width: "100%", padding: "14px" }}
              disabled={loading || !isFormValid}
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