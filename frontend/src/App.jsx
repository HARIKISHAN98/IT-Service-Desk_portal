import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"

// Guards
import ProtectedRoute from "./components/guards/ProtectedRoute"
import PublicRoutes from "./components/guards/PublicRoutes"

// Layout & pages
import MainLayout from "./components/layout/MainLayout"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"


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

            {/* Protected Routes wrapped inside MainLayout */}
            <Route element={ <ProtectedRoute><MainLayout/></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard/>} />
              {/* Future nested Pages like /tickets, /users comes hers */}
            </Route>

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </>
  )
}

export default App
