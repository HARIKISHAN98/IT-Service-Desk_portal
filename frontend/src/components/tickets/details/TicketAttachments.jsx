import React, { useRef, useState } from 'react';
import API from '../../../services/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.docx', '.csv', '.xlsx'];

const TicketAttachments = ({
  ticketId,
  attachments = [],
  isClosed,
  currentUser,
  onUpload,
  onDelete,
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // 1. Size check
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File exceeds the 5 MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Extension check
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setUploadError('Unsupported file type. Allowed: PNG, JPG, PDF, TXT, DOCX, CSV, XLSX');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploading(true);
      await onUpload(file);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await API.get(
        `/tickets/${ticketId}/attachments/${attachment.id}/view`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.file_name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not download file. Please try again.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Attachments ({attachments.length}/10)
        </h3>

        {!isClosed && attachments.length < 10 && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-xs font-medium text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-600 rounded-lg border border-sky-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : '+ Attach File'}
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
          {uploadError}
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-2">
          No files attached to this ticket.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((item) => {
            const uploaderName = item.uploader
              ? `${item.uploader.first_name || ''} ${item.uploader.last_name || ''}`.trim() || item.uploader.email
              : 'Unknown';

            // Delete RBAC: Only Admin or original uploader can delete (and ticket must not be closed)
            const canDelete =
              !isClosed &&
              (currentUser?.role === 'ADMIN' || item.uploader?.id === currentUser?.id);

            return (
              <div
                key={item.id}
                className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-2.5 hover:border-slate-700 transition"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="text-slate-400 text-sm">📎</span>
                  <div className="min-w-0">
                    <p
                      onClick={() => handleDownload(item)}
                      className="text-xs font-semibold text-white hover:text-sky-400 cursor-pointer truncate"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formatFileSize(item.file_size)} • By {uploaderName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    className="p-1 text-slate-400 hover:text-sky-400 transition cursor-pointer"
                    title="Download"
                  >
                    ⬇️
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(item.id, item.file_name)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Delete attachment"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketAttachments;
