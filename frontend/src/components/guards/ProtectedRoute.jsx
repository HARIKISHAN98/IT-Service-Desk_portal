import { useAuth } from "../../context/AuthContext"
import { Navigate } from "react-router-dom"

const ProtectedRoute = ({children}) => {

  const { token, loading} = useAuth()

  // Agar loading h to kya return kru 
  if (loading){
    return <div>Loading...</div>
  }
  // Agar token nhi h to kha beju 
  else if(!token){
    return <Navigate replace to="/login"/>
  }
  // Agar token h to kya render kre
  else 
    return children;
}

export default ProtectedRoute