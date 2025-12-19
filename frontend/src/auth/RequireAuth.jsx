import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { token, user, loadingUser } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  // token exists, but /me still loading
  if (loadingUser || !user) return <div style={{ padding: 20 }}>Loading user...</div>;

  return children;
}