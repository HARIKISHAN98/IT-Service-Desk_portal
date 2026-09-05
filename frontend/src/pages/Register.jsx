import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import UserForm from '../components/users/UserForm';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegisterSuccess = async (credentials) => {
    try {
      // Background Login after successful registration
      const loginRes = await API.post('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });
      const token = loginRes.data.access_token;

      const userRes = await API.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      login(token, userRes.data);
      navigate('/dashboard');
    } catch {
      // Fallback if auto-login drops
      navigate('/login', {
        state: { info: 'Account registered! Please sign in with your credentials.' },
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl text-white font-bold tracking-tight">Create Account</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Sign up for an <span className="text-sky-400 font-semibold">End-User</span> portal account
          </p>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700/80 shadow-2xl">
          <UserForm mode="register" onSuccess={handleRegisterSuccess} />

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-sky-400 hover:text-sky-300 font-semibold underline-offset-2 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
