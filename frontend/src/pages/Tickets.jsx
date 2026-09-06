import { useEffect, useState, useMemo } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Tickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isEndUser = user?.role === 'END_USER';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const fetchTickets = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const res = await API.get('/tickets/');
      const data = Array.isArray(res.data) ? res.data : [];
      setTickets(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load tickets.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // In-memory instant search and multi-criteria filter
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        t.ticket_key?.toLowerCase().includes(query) ||
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' || t.status?.toUpperCase() === statusFilter;

      const matchesPriority =
        priorityFilter === 'ALL' || t.priority?.toUpperCase() === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== 'ALL' || priorityFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toUpperCase()) {
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
    const s = status?.toUpperCase();
    if (s === 'OPEN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Open
        </span>
      );
    }
    if (s === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          In Progress
        </span>
      );
    }
    if (s === 'RESOLVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {status || 'Closed'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isEndUser ? 'My Service Requests' : 'Support Queue & Tickets'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEndUser
              ? 'Track updates and history of your reported issues'
              : 'Central triage desk for managing incidents and service requests'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* Animated Refresh Button */}
          <button
            onClick={() => fetchTickets(true)}
            disabled={loading || isRefreshing}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition disabled:opacity-50 cursor-pointer"
            title="Refresh Queue"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* New Ticket Action - Strictly for End-User */}
          {isEndUser && (
            <Link
              to="/tickets/new"
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-600/30 transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Ticket</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket key (TICK-...), subject or details..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                title="Clear search text"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Styled Dropdowns */}
          <div className="flex items-center gap-2">
            {/* Status Dropdown */}
            <div className="relative inline-block">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`appearance-none pl-3 pr-9 py-2 bg-slate-950/60 border text-xs font-medium rounded-lg transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 ${statusFilter !== 'ALL'
                  ? 'border-sky-500/50 text-sky-400 bg-sky-500/5'
                  : 'border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Priority Dropdown */}
            <div className="relative inline-block">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`appearance-none pl-3 pr-9 py-2 bg-slate-950/60 border text-xs font-medium rounded-lg transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 ${priorityFilter !== 'ALL'
                  ? 'border-sky-500/50 text-sky-400 bg-sky-500/5'
                  : 'border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70 text-xs">
            <span className="text-[11px] font-medium text-slate-500">Active filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-[11px]">
                Search: <span className="font-semibold text-white">"{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-rose-400 text-slate-400 ml-0.5 transition"
                >
                  ✕
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px]">
                Status: <span className="font-semibold capitalize">{statusFilter.toLowerCase()}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="hover:text-rose-400 text-sky-400/80 ml-0.5 transition"
                >
                  ✕
                </button>
              </span>
            )}

            {priorityFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px]">
                Priority: <span className="font-semibold capitalize">{priorityFilter.toLowerCase()}</span>
                <button
                  type="button"
                  onClick={() => setPriorityFilter('ALL')}
                  className="hover:text-rose-400 text-sky-400/80 ml-0.5 transition"
                >
                  ✕
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-medium ml-1 transition underline-offset-2 hover:underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading queue...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-slate-400 text-sm font-medium">No tickets found</p>
            <p className="text-slate-500 text-xs">
              {isEndUser
                ? 'You have not reported any issues yet. Click "New Ticket" to submit one.'
                : 'No incidents match the active filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" >
            <>
              {/* 1. MOBILE & TABLET CARD VIEW (Screens < 768px) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredTickets.map((item) => {
                  const requesterName = item.created_by
                    ? `${item.created_by.first_name || ''} ${item.created_by.last_name || ''}`.trim() || item.created_by.email
                    : null;

                  const agentName = item.assigned_agent
                    ? `${item.assigned_agent.first_name || ''} ${item.assigned_agent.last_name || ''}`.trim() || item.assigned_agent.email
                    : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/tickets/${item.id}`)}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-700 transition cursor-pointer"
                    >
                      {/* Top Row: Key + Priority + Status Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                          {item.ticket_key}
                        </span>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded border ${getPriorityBadge(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      {/* Middle: Subject, Description & Category */}
                      <div>
                        <h4 className="font-semibold text-white text-sm tracking-tight line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="mt-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded">
                            {item.category?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Metadata: Requester, Assigned Agent, and Date */}
                      <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center justify-between gap-2">
                          {/* Requester (visible for Admin/Agent roles) */}
                          {!isEndUser && (
                            <div className="flex items-center space-x-1.5 truncate min-w-0">
                              <span className="text-slate-500 text-[11px]">👤</span>
                              <span className="truncate">
                                <span className="text-slate-500 text-[11px]">By:</span>{' '}
                                <span className="text-slate-300 font-medium">
                                  {requesterName || '—'}
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Created Date */}
                          <div className="flex items-center space-x-1 shrink-0 ml-auto">
                            <span className="text-slate-500 text-[11px]">📅</span>
                            <span className="text-slate-400 text-[11px]">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Assigned To Row */}
                        <div className="flex items-center space-x-1.5 text-xs truncate">
                          <span className="text-slate-500 text-[11px]">🛠️</span>
                          <span className="text-slate-500 text-[11px]">Assigned:</span>
                          {agentName ? (
                            <span className="text-sky-300 font-medium truncate">{agentName}</span>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. DESKTOP TABLE VIEW (Screens >= 768px) */}
              <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto scrollbar:none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-800/90 text-slate-200 text-xs uppercase tracking-wider border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-3.5 font-bold">Ticket Key</th>
                        <th className="px-4 py-3.5 font-bold">Subject & Details</th>
                        <th className="px-4 py-3.5 font-bold">Priority</th>
                        <th className="px-4 py-3.5 font-bold">Status</th>
                        {!isEndUser && <th className="px-4 py-3.5 font-bold">Requester</th>}
                        <th className="px-4 py-3.5 font-bold">Assigned To</th>
                        <th className="px-4 py-3.5 font-bold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {filteredTickets.map((item) => (
                        <tr key={item.id} onClick={() => navigate(`/tickets/${item.id}`)} className="hover:bg-slate-800/30 transition-colors cursor-pointer">
                          {/* Ticket Key */}
                          <td className="px-4 py-3.5 whitespace-nowrap align-top">
                            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-1 rounded">
                              {item.ticket_key}
                            </span>
                          </td>

                          {/* Subject & Details */}
                          <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                            <p className="font-semibold text-white text-xs sm:text-sm tracking-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                {item.category?.replace('_', ' ')}
                              </span>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3.5 whitespace-nowrap align-top">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded border ${getPriorityBadge(
                                item.priority
                              )}`}
                            >
                              {item.priority}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap align-top">
                            {getStatusBadge(item.status)}
                          </td>

                          {/* Requester */}
                          {!isEndUser && (
                            <td className="px-4 py-3.5 whitespace-nowrap align-top text-xs text-slate-300">
                              {item.created_by
                                ? `${item.created_by.first_name || ''} ${item.created_by.last_name || ''}`.trim() || item.created_by.email
                                : '—'}
                            </td>
                          )}

                          {/* Assigned Agent */}
                          <td className="px-4 py-3.5 whitespace-nowrap align-top text-xs text-slate-400">
                            {item.assigned_agent
                              ? `${item.assigned_agent.first_name || ''} ${item.assigned_agent.last_name || ''}`.trim() || item.assigned_agent.email
                              : <span className="text-slate-500 italic">Unassigned</span>}
                          </td>

                          {/* Created Date */}
                          <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap align-top">
                            {formatDate(item.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
