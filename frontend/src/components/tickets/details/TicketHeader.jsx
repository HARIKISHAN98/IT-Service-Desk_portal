import React from 'react';

const TicketHeader = ({ ticket, onBack }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const requesterName = ticket.created_by
    ? `${ticket.created_by.first_name || ''} ${ticket.created_by.last_name || ''}`.trim() || ticket.created_by.email
    : 'Unknown';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Top Bar: Back Action & Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Ticket Queue</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Created on {formatDate(ticket.created_at)}</span>
          <span>•</span>
          <span>
            By <span className="text-slate-200 font-medium">{requesterName}</span>
          </span>
        </div>
      </div>

      {/* Main Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-md">
              {ticket.ticket_key}
            </span>
            {ticket.category && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded">
                {ticket.category.replace('_', ' ')}
              </span>
            )}
            {ticket.ticket_type && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                {ticket.ticket_type.replace('_', ' ')}
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">
            {ticket.title}
          </h1>
        </div>
      </div>
    </div>
  );
};

export default TicketHeader;
