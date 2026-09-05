import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back, {user?.full_name || user?.email}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Role: <span className="text-sky-400 font-semibold">{user?.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tickets</span>
          <p className="text-3xl font-extrabold text-white mt-2">0</p>
        </div>
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending Action</span>
          <p className="text-3xl font-extrabold text-white mt-2">0</p>
        </div>
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Resolved</span>
          <p className="text-3xl font-extrabold text-white mt-2">0</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;