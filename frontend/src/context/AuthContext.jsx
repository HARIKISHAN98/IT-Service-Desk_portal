import { createContext, useContext, useState, useEffect } from "react";

// 1. Context create kiya
const AuthContext = createContext()

// 2. Provider banaya
export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // App load hote hi localStorage check karna
    useEffect(() => {
        const savedToken = localStorage.getItem("access_token");
        const savedUser = localStorage.getItem("user_data");

        if(savedToken && savedUser ){
            setToken(savedToken);
            setUser(JSON.parse(savedUser)); //string to object
        }
        setLoading(false);
    },[])

    // Login handler
    const login = (newToken, userData) => {
        // 1. localStorage me save kro 
        localStorage.setItem("access_token",newToken);
        localStorage.setItem("user_data",JSON.stringify(userData));

        // 2. state update kro (setToken, setUser)
        setToken(newToken)
        setUser(userData)
    }

    // Logout handler
    const logout = () => {

        // 1. localstorage me remove kro
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_data");

        // 2. state null kro (setToken(null), setUser(null))
        setToken(null);
        setUser(null)
    };

    return (
        <AuthContext.Provider value={{user, token, loading, login, logout}}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

// 3. custome hook taaki kisi bhi component me direct use kar sakein
export const useAuth = () => { return useContext(AuthContext); };
