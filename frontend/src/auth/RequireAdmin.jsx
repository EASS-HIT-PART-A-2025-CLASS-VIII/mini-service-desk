import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireAdmin({ children }) {
  const { token, user, loadingUser } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (loadingUser || !user) return <div style={{ padding: 20 }}>Loading user...</div>;

  if (!user.is_admin) return <Navigate to="/tickets" replace />;

  return children;
}