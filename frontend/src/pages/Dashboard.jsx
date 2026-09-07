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

  const metrics = useMemo(() => {
    const total = tickets.length;

    // Admin Specific
    const unassignedCount = tickets.filter(
      (t) => !t.assigned_agent_id && t.status !== 'CLOSED'
    ).length;

    // Agent Specific
    const waitingForUserCount = tickets.filter(
      (t) => t.status === 'WAITING_FOR_USER'
    ).length;

    // Common Lifecycle
    const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
    const closedCount = tickets.filter((t) => t.status === 'CLOSED').length;

    return {
      total,
      unassignedCount,
      waitingForUserCount,
      inProgressCount,
      resolvedCount,
      closedCount,
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
            Welcome, {currentUser?.first_name || 'User'}
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

      {/* Dynamic Role-Based KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ==================== 1. ADMIN VIEW ==================== */}
        {isAdmin && (
          <>
            {/* Card 1: All System Tickets */}
            <div
              onClick={() => navigate('/tickets')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-slate-400">Total System Queue</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{metrics.total}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-white transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Unassigned Needs Dispatch */}
            <div
              onClick={() => navigate('/tickets?assigned=unassigned')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-rose-400">Unassigned (Action)</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-rose-400">{metrics.unassignedCount}</span>
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Active Operations */}
            <div
              onClick={() => navigate('/tickets?status=IN_PROGRESS')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-sky-400">In Progress</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-sky-400">{metrics.inProgressCount}</span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: Resolved */}
            <div
              onClick={() => navigate('/tickets?status=RESOLVED')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-emerald-400">Resolved</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-emerald-400">{metrics.resolvedCount}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== 2. SUPPORT AGENT VIEW ==================== */}
        {isAgent && (
          <>
            {/* Card 1: My Total Assigned */}
            <div
              onClick={() => navigate('/tickets')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-slate-400">My Assigned Work</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{metrics.total}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-white transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Active Tickets */}
            <div
              onClick={() => navigate('/tickets?status=IN_PROGRESS')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-sky-400">In Progress</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-sky-400">{metrics.inProgressCount}</span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Waiting for User Reply */}
            <div
              onClick={() => navigate('/tickets?status=WAITING_FOR_USER')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-amber-400">Awaiting Response</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-amber-400">{metrics.waitingForUserCount}</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: My Resolved */}
            <div
              onClick={() => navigate('/tickets?status=RESOLVED')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-emerald-400">Resolved by Me</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-emerald-400">{metrics.resolvedCount}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== 3. END USER VIEW ==================== */}
        {isEndUser && (
          <>
            {/* Card 1: My Requests */}
            <div
              onClick={() => navigate('/tickets')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-slate-400">My Requests</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{metrics.total}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-white transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: In Progress */}
            <div
              onClick={() => navigate('/tickets?status=IN_PROGRESS')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-sky-400">Under Investigation</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-sky-400">{metrics.inProgressCount}</span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Resolved (Action Required from User) */}
            <div
              onClick={() => navigate('/tickets?status=RESOLVED')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-emerald-400">Resolved (Confirm/Close)</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-emerald-400">{metrics.resolvedCount}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: Closed Archive */}
            <div
              onClick={() => navigate('/tickets?status=CLOSED')}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition cursor-pointer group"
            >
              <p className="text-xs font-medium text-slate-500">Completed & Closed</p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-slate-400">{metrics.closedCount}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-center text-slate-500 group-hover:text-slate-300 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}

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
          <div className="py-8 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 font-medium">No incidents logged in queue</p>
          </div>
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

