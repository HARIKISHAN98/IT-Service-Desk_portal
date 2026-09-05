import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom';

const PublicRoutes = ({children}) => {
    const {token, loading} = useAuth();

    if(loading){
        return <div>Loading</div>
    }
    else if(token){
        return <Navigate replace to="/dashboard" />
    }
    else 
        return children;
}

export default PublicRoutes