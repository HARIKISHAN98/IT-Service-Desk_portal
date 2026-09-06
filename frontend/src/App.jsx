import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"

// Guards
import ProtectedRoute from "./components/guards/ProtectedRoute"
import PublicRoutes from "./components/guards/PublicRoutes"

// Layout & pages
import MainLayout from "./components/layouts/MainLayout"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Register from "./pages/Register"
import Users from "./pages/Users"
import Tickets from "./pages/Tickets"
import CreateTicketPage from "./pages/CreateTicketPage"

function App() {
  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Default Route  */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Public Route  */}
            <Route path="/login" element={
              <PublicRoutes>
                <Login />
              </PublicRoutes>
            } />

            <Route path="/register" element={<PublicRoutes> <Register /> </PublicRoutes>} />

            {/* Protected Routes wrapped inside MainLayout */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Inside the MainLayout route block in App.jsx */}
              <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><Users /> </ProtectedRoute>} />
              <Route path="/tickets/new" element={<ProtectedRoute allowedRoles={['END_USER']}><CreateTicketPage /></ProtectedRoute>}/>
              <Route path="/tickets" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPPORT_AGENT', 'END_USER']}> <Tickets /> </ProtectedRoute>} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </>
  )
}

export default App
