import React, { useState } from 'react';

const TicketActivityTabs = ({
  comments = [],
  isClosed,
  currentUser,
  onAddComment,
  historyLogs = [],
}) => {
  const [activeTab, setActiveTab] = useState('comments');
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    try {
      setSubmitting(true);
      await onAddComment(commentBody);
      setCommentBody('');
    } catch {
      // Error handled by parent toast
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Tabs Header */}
      <div className="flex items-center space-x-4 border-b border-slate-800/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`text-xs font-bold uppercase tracking-wider pb-1 transition cursor-pointer ${
            activeTab === 'comments'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Discussion ({comments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`text-xs font-bold uppercase tracking-wider pb-1 transition cursor-pointer ${
            activeTab === 'history'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit History
        </button>
      </div>

      {/* Tab 1: Comments Thread */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                No comments posted yet. Start the conversation below.
              </p>
            ) : (
              comments.map((c) => {
                const isAuthorCurrent = c.author?.id === currentUser?.id;
                const authorName = c.author
                  ? `${c.author.first_name || ''} ${c.author.last_name || ''}`.trim() || c.author.email
                  : 'User';
                const initial = (authorName || 'U')[0].toUpperCase();

                return (
                  <div
                    key={c.id}
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border ${
                      isAuthorCurrent
                        ? 'bg-sky-500/5 border-sky-500/20'
                        : 'bg-slate-950/40 border-slate-800/80'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {authorName}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatDate(c.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {c.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Comment Input Box */}
          {isClosed ? (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500 italic">
              Ticket is Closed. Comments are disabled.
            </div>
          ) : (
            <form onSubmit={handlePostComment} className="space-y-2 pt-2 border-t border-slate-800/80">
              <textarea
                rows={3}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Type your reply or progress note here..."
                maxLength={2000}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {commentBody.length}/2000 characters
                </span>
                <button
                  type="submit"
                  disabled={submitting || !commentBody.trim()}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-600/30 transition cursor-pointer"
                >
                  {submitting ? 'Sending...' : 'Post Reply'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab 2: Audit History Trail */}
      {activeTab === 'history' && (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {historyLogs.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">
              No audit logs recorded for this ticket yet.
            </p>
          ) : (
            historyLogs.map((log) => {
              const modifier = log.changed_by
                ? `${log.changed_by.first_name || ''} ${log.changed_by.last_name || ''}`.trim() || log.changed_by.email
                : 'System';

              return (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950/40 border border-slate-800/70 rounded-xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-medium text-slate-300">{modifier}</span>
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-slate-300">
                    Changed <span className="font-mono text-sky-400">{log.field_name}</span> from{' '}
                    <span className="text-rose-400 font-semibold">{log.old_value || 'None'}</span> to{' '}
                    <span className="text-emerald-400 font-semibold">{log.new_value || 'None'}</span>
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TicketActivityTabs;
