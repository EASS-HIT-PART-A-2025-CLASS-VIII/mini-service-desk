import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TicketsPage from "./pages/TicketsPage";
import TicketsDetailsPage from "./pages/TicketsDetailsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminTicketPage from "./pages/AdminTicketPage.jsx";
import RequireAuth from "./auth/RequireAuth";
import RequireAdmin from "./auth/RequireAdmin";
import RegisterPage from "./pages/RegisterPage";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/tickets"
        element={
          <RequireAuth>
            <TicketsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/tickets/:id"
        element={
          <RequireAuth>
            <TicketsDetailsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        }
      />

      <Route
        path="/admin/tickets/:id"
        element={
          <RequireAdmin>
            <AdminTicketPage />
          </RequireAdmin>
        }
      />


      <Route path="*" element={<h2>404</h2>} />
    </Routes>
  );
}