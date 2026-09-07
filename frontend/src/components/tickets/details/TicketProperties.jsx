import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../services/api';

const TicketProperties = ({ ticket, onUpdateTicket, onUpdateSuccess }) => {
  const [updatingField, setUpdatingField] = useState(null);
  const [agents, setAgents] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isAgent = user?.role === 'SUPPORT_AGENT';
  const isEndUser = user?.role === 'END_USER';
  const isClosed = ticket.status === 'CLOSED';

  // Load agents if logged-in user is Admin
  useEffect(() => {
    if (isAdmin) {
      API.get('/users/?role=SUPPORT_AGENT')
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
          setAgents(list);
        })
        .catch((err) => console.error('Error fetching agents:', err));
    }
  }, [isAdmin]);

  const assignedAgentName = ticket.assigned_agent
    ? `${ticket.assigned_agent.first_name || ''} ${ticket.assigned_agent.last_name || ''}`.trim() || ticket.assigned_agent.email
    : 'Unassigned';

  const requesterName = ticket.created_by
    ? `${ticket.created_by.first_name || ''} ${ticket.created_by.last_name || ''}`.trim() || ticket.created_by.email
    : '—';

  // Allowed status options based on role
  const getAvailableStatuses = () => {
    if (isAdmin) {
      return ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'];
    }
    if (isAgent) {
      return ['IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED'];
    }
    return [];
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === ticket.status) return;
    setUpdatingField('status');
    try {
      if (onUpdateTicket) {
        await onUpdateTicket({ status: newStatus }, `Status updated to ${newStatus.replace('_', ' ')}`);
      }
    } finally {
      setUpdatingField(null);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (newPriority === ticket.priority) return;
    setUpdatingField('priority');
    try {
      if (onUpdateTicket) {
        await onUpdateTicket({ priority: newPriority }, `Priority escalated to ${newPriority}`);
      }
    } finally {
      setUpdatingField(null);
    }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      setAssigning(true);
      await API.patch(`/tickets/${ticket.id}`, {
        assigned_agent_id: agentId ? Number(agentId) : null,
      });
      if (onUpdateSuccess) {
        onUpdateSuccess();
      } else if (onUpdateTicket) {
        onUpdateTicket();
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign agent');
    } finally {
      setAssigning(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CLOSED':
        return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
      case 'IN_PROGRESS':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'WAITING_FOR_USER':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="border-b border-slate-800/80 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ticket Metadata & Actions
        </h3>
      </div>

      {/* End User Resolution Actions */}
      {isEndUser && ticket.status === 'RESOLVED' && (
        <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-2.5">
          <p className="text-xs text-sky-300 font-medium">
            Your ticket is marked as Resolved. Do you want to accept or reopen?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={updatingField === 'status'}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition text-center cursor-pointer"
            >
              Close Ticket
            </button>
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={updatingField === 'status'}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition text-center cursor-pointer"
            >
              Reopen
            </button>
          </div>
        </div>
      )}

      {/* Status Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Status</label>
        {isClosed || isEndUser ? (
          <div>
            <span
              className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg border uppercase tracking-wider ${getStatusBadgeClass(
                ticket.status
              )}`}
            >
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        ) : (
          <div className="relative">
            <select
              value={ticket.status}
              disabled={updatingField === 'status'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-9 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
            >
              {ticket.status === 'OPEN' && <option value="OPEN">Open</option>}
              {getAvailableStatuses().map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st.replace('_', ' ')}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Priority Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Priority</label>
        {isAdmin && !isClosed ? (
          <div className="relative">
            <select
              value={ticket.priority}
              disabled={updatingField === 'priority'}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-9 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
            >
              <option value="LOW" className="bg-slate-900 text-white">Low</option>
              <option value="MEDIUM" className="bg-slate-900 text-white">Medium</option>
              <option value="HIGH" className="bg-slate-900 text-white">High</option>
              <option value="CRITICAL" className="bg-slate-900 text-white">Critical</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        ) : (
          <div>
            <span
              className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg border uppercase tracking-wider ${getPriorityBadgeClass(
                ticket.priority
              )}`}
            >
              {ticket.priority}
            </span>
          </div>
        )}
      </div>

      {/* Assigned Agent Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Assigned Agent</label>

        {isAdmin && !isClosed ? (
          <div className="relative">
            <select
              value={ticket.assigned_agent?.id || ticket.assigned_agent_id || ''}
              disabled={assigning}
              onChange={(e) => handleAssignAgent(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-9 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">
                -- Unassigned --
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id} className="bg-slate-900 text-white">
                  {agent.first_name || ''} {agent.last_name || ''} ({agent.email})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-200 bg-slate-950/40 border border-slate-800/80 px-3 py-2 rounded-lg">
            {assignedAgentName}
          </div>
        )}
      </div>

      {/* Department */}
      {ticket.department && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Department</label>
          <p className="text-xs text-slate-300 font-medium">
            {ticket.department.name}
          </p>
        </div>
      )}

      {/* Requester Profile */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <label className="text-xs font-medium text-slate-400">Requester</label>
        <p className="text-xs font-semibold text-white">{requesterName}</p>
        <p className="text-[11px] text-slate-400">{ticket.created_by?.email}</p>
        {ticket.created_by?.phone_number && (
          <p className="text-[11px] font-mono text-slate-400">{ticket.created_by.phone_number}</p>
        )}
      </div>
    </div>
  );
};

export default TicketProperties;
