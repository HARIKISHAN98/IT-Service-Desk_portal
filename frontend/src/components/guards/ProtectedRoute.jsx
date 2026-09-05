import { useAuth } from "../../context/AuthContext"
import { Navigate } from "react-router-dom"

const ProtectedRoute = ({children, allowedRoles}) => {

  const { token, user, loading} = useAuth()

  // if loading
  if (loading){
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading session...
      </div>
    );
  }

 // Not authenticated -> redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated, but role is not authorized -> redirect to dashboard
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  
  else 
    return children;
}

export default ProtectedRoute