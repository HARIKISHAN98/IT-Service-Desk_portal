import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

// Modular Child Components
import TicketHeader from '../components/tickets/details/TicketHeader';
import TicketDescription from '../components/tickets/details/TicketDescription';
import TicketAttachments from '../components/tickets/details/TicketAttachments';
import TicketActivityTabs from '../components/tickets/details/TicketActivityTabs';
import TicketProperties from '../components/tickets/details/TicketProperties';

const TicketDetailsPage = () => {
  const { id: ticketId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Primary States
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  // Loading & Action feedback
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Unified Fetcher for Ticket & Related Entities
  const fetchAllTicketData = useCallback(async () => {
    try {
      setPageLoading(true);
      setPageError(null);

      const [ticketRes, commentsRes, attachmentsRes] = await Promise.all([
        API.get(`/tickets/${ticketId}`),
        API.get(`/tickets/${ticketId}/comments/`),
        API.get(`/tickets/${ticketId}/attachments/`),
      ]);

      setTicket(ticketRes.data);
      setComments(commentsRes.data || []);
      setAttachments(attachmentsRes.data || []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setPageError('Ticket not found.');
      } else if (status === 403) {
        setPageError('Access denied: You do not have permission to view this ticket.');
      } else {
        setPageError(err.response?.data?.detail || 'Failed to load ticket workspace.');
      }
    } finally {
      setPageLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (ticketId) {
      fetchAllTicketData();
    }
  }, [ticketId, fetchAllTicketData]);

  // 2. Ticket Property Mutation (Status, Priority)
  const handleUpdateTicket = async (patchPayload, successMsg = 'Ticket updated successfully') => {
    try {
      const res = await API.patch(`/tickets/${ticketId}`, patchPayload);
      setTicket(res.data);
      showToast(successMsg, 'success');
      // Comments ya audit trail refresh karne ke liye
      fetchAllTicketData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update ticket.', 'error');
    }
  };

  // 3. Comment Creation Handler
  const handleAddComment = async (commentBody) => {
    try {
      const res = await API.post(`/tickets/${ticketId}/comments/`, { body: commentBody });
      setComments((prev) => [...prev, res.data]);
      showToast('Comment posted', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to post comment.', 'error');
      throw err;
    }
  };

  // 4. Attachment Upload Handler
  const handleUploadAttachment = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await API.post(`/tickets/${ticketId}/attachments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments((prev) => [res.data, ...prev]);
      showToast(`File "${file.name}" uploaded successfully`, 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'File upload failed.', 'error');
      throw err;
    }
  };

  // 5. Attachment Delete Handler
  const handleDeleteAttachment = async (attachmentId, fileName) => {
    try {
      await API.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      showToast(`Attachment "${fileName}" deleted`, 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete file.', 'error');
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading ticket workspace...</p>
        </div>
      </div>
    );
  }

  if (pageError || !ticket) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400 text-lg">
          ⚠️
        </div>
        <h3 className="text-white font-semibold text-base">{pageError || 'Ticket unavailable'}</h3>
        <button
          onClick={() => navigate('/tickets')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition"
        >
          ← Back to Ticket Queue
        </button>
      </div>
    );
  }

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800/80 shadow-rose-950/50'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80 shadow-emerald-950/50'
          }`}
        >
          {toastMessage.message}
        </div>
      )}

      {/* Top Header */}
      <TicketHeader
        ticket={ticket}
        onBack={() => navigate('/tickets')}
      />

      {/* Main Workspace Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side (70% on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <TicketDescription ticket={ticket} />

          <TicketAttachments
            ticketId={ticket.id}
            attachments={attachments}
            isClosed={isClosed}
            currentUser={currentUser}
            onUpload={handleUploadAttachment}
            onDelete={handleDeleteAttachment}
          />

          <TicketActivityTabs
            comments={comments}
            isClosed={isClosed}
            currentUser={currentUser}
            onAddComment={handleAddComment}
            historyLogs={historyLogs}
          />
        </div>

        {/* Right Side (30% on desktop, stacks below on mobile) */}
        <div className="lg:col-span-1">
          <TicketProperties
            ticket={ticket}
            currentUser={currentUser}
            isClosed={isClosed}
            onUpdateTicket={handleUpdateTicket}
          />
        </div>

      </div>
    </div>
  );
};

export default TicketDetailsPage;
