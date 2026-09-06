import React from 'react';

const TicketDescription = ({ ticket }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Original Issue Description
        </h3>
        <span className="text-[11px] text-slate-500 italic">Tamper-proof record</span>
      </div>

      <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-normal pt-1">
        {ticket.description || 'No description provided.'}
      </div>
    </div>
  );
};

export default TicketDescription;
