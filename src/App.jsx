import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import BookingPage from "./pages/BookingPage";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import SuperAdmin from "./pages/SuperAdmin";

const theme = createTheme({
  palette: {
    primary: { main: "#2563eb", dark: "#1d4ed8" },
    background: { default: "#f9fafb" },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
});

function AppRoutes() {
  const { role } = useAuth();

  // Superadmin — only sees tenant management panel
  if (role === "superadmin") {
    return (
      <Routes>
        <Route path="*" element={<SuperAdmin />} />
      </Routes>
    );
  }

  // Owner — full sidebar app scoped to their business
  if (role === "owner") {
    return (
      <Sidebar>
        <Routes>
          <Route path="/"         element={<Navigate to="/bookings" replace />} />
          <Route path="/bookings" element={<Dashboard />} />
          <Route path="/book"     element={<BookingPage />} />
          <Route path="/reports"  element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*"         element={<Navigate to="/bookings" replace />} />
        </Routes>
      </Sidebar>
    );
  }

  // Guest — booking page by slug, ?biz=UID, or default
  return (
    <Routes>
      <Route path="/"           element={<Navigate to="/login" replace />} />
      <Route path="/login"      element={<LoginPage />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/book"       element={<BookingPage />} />
      <Route path="/:slug"      element={<BookingPage />} />
      <Route path="*"           element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
