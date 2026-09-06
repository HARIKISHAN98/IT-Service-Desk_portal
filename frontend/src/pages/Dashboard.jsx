import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const role = currentUser?.role;
  const isEndUser = role === 'END_USER';
  const isAgent = role === 'SUPPORT_AGENT';
  const isAdmin = role === 'ADMIN';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get('/tickets/');
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute Metrics / KPI Counts
  const metrics = useMemo(() => {
    const total = tickets.length;
    const openCount = tickets.filter((t) => t.status === 'OPEN').length;
    const inProgressCount = tickets.filter(
      (t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_USER'
    ).length;
    const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
    const closedCount = tickets.filter((t) => t.status === 'CLOSED').length;
    const criticalCount = tickets.filter(
      (t) => (t.priority === 'CRITICAL' || t.priority === 'HIGH') && t.status !== 'CLOSED'
    ).length;

    return {
      total,
      openCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      criticalCount,
    };
  }, [tickets]);

  // Recent 5 Tickets
  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [tickets]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'MEDIUM':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-700/30 text-slate-400 border border-slate-700/50">
            Closed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
            In Progress
          </span>
        );
      case 'WAITING_FOR_USER':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Waiting
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Open
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Welcome, {currentUser?.first_name || 'User'} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin && 'System Administrator Overview • Real-time queue telemetry'}
            {isAgent && 'Staff Support Desk • Track assigned incidents & resolution times'}
            {isEndUser && 'Service Portal • Track your submitted incidents and service requests'}
          </p>
        </div>

        {isEndUser && (
          <button
            onClick={() => navigate('/tickets/new')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-600/30 transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Ticket</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div
          onClick={() => navigate('/tickets')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-400">Total Tickets</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white">{metrics.total}</span>
            <span className="text-slate-500 text-sm">🎫</span>
          </div>
        </div>

        {/* Actionable / Active */}
        <div
          onClick={() => navigate('/tickets')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer"
        >
          <p className="text-xs font-medium text-sky-400">In Progress / Active</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-sky-400">{metrics.inProgressCount}</span>
            <span className="text-sky-500 text-sm">⚡</span>
          </div>
        </div>

        {/* Resolved / Awaiting close */}
        <div
          onClick={() => navigate('/tickets')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer"
        >
          <p className="text-xs font-medium text-emerald-400">Resolved</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-400">{metrics.resolvedCount}</span>
            <span className="text-emerald-500 text-sm">✅</span>
          </div>
        </div>

        {/* Critical Escalations */}
        <div
          onClick={() => navigate('/tickets')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer"
        >
          <p className="text-xs font-medium text-rose-400">Urgent Attention</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-400">{metrics.criticalCount}</span>
            <span className="text-rose-500 text-sm">🔥</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Incidents</h3>
            <p className="text-xs text-slate-500">Latest tickets requiring attention or updates</p>
          </div>

          <button
            onClick={() => navigate('/tickets')}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition cursor-pointer"
          >
            View All Queue →
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center italic">
            No incidents reported yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {recentTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg transition cursor-pointer"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded shrink-0">
                    {t.ticket_key}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate hover:text-sky-300 transition">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Created on {formatDate(t.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getPriorityBadge(
                      t.priority
                    )}`}
                  >
                    {t.priority}
                  </span>
                  {getStatusBadge(t.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

