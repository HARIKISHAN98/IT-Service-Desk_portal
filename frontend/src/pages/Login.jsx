import React, { useEffect, useState } from 'react'
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // 1. Initialized the hooks on the top
    const navigate = useNavigate()
    const {login} = useAuth()

    useEffect(() => {
        if(error) {
            const timer = setTimeout(()=>{setError(null)},10000)
            return () => clearTimeout(timer)
        }
    },[error])

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
        // Login call get direct json object    
        const loginRes = await API.post("/auth/login",{email, password});
        const token = loginRes.data.access_token;

        // User Profile Call: fresh token header me manually pass kiya 
        const userRes = await API.get("/auth/me",{headers: {Authorization: `Bearer ${token}`} });

        // store the user data and token in context
        login(token, userRes.data)

        // Navigate to dashboard
        navigate("/dashboard");
        } catch(err) {
            // Backend ka exact error details copy kiya
            const detail = err.response?.data?.detail;

            //if detail is array, 422 validation error
            if(Array.isArray(detail)){
                setError(detail[0]?.msg || "Invalid email format (e.g., user@example.com)");
            }
            // if detail is normal string (fastAPI 401 Unauthorized Error)
            else if(typeof detail == "string"){
                setError(detail)
            }
            // if network is down or backend is closed
            else{
                setError("Unable to connect to server. Please try again")
            }
        } finally {
            // Active the button back anyhow
            setLoading(false)
        }
    }

    return (
        <div className='min-h-screen bg-slate-900 flex justify-center items-center p-4'>
            <div className='max-w-md w-full'>
                {/* Header  */}
                <div className='text-center mb-8'>
                    <h2 className='text-3xl text-white font-bold tracking-tight'>IT Service Desk Portal</h2>
                    <p className='text-slate-400 mt-2 text-sm'>Sign in to your account</p>
                </div>
                {/* Card  */}
                <div className='bg-slate-800 p-8 rounded-2xl border border-slate-700/80 shadow-2xl'>
                    <form onSubmit={handleSubmit} className='space-y-5'>
                        {/* Email */}
                        <div>
                            <label className='block text-sm font-medium text-slate-300 mb-1'>Email Address</label>
                            <input type="email" value={email} placeholder='name@company.com' required onChange={(e) => setEmail(e.target.value)}
                                className='w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition' 
                            />
                        </div>

                        {/* Password  */}
                        <div>
                            <label className='block text-sm font-medium text-slate-300 mb-1'>Password</label>
                            <input type='password' value={password} name='password' placeholder='********' required onChange={(e) => setPassword(e.target.value)} 
                            className='w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500
                            focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition'
                            />
                        </div>

                        {/* Dynamic Error banner  */}
                        <div>
                            {error && <div className='p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm'>{error}</div>}
                        </div>
                        {/* Submit Button  */}
                        <button type="submit" disabled={loading} className='w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg shadow-lg hover:shadow-sky-500/25 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'>{loading ? "Signing in..." : "Sign In"}</button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Login