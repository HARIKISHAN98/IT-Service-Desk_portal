import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

const CATEGORIES = [
  { value: 'HARDWARE', label: 'Hardware', desc: 'Laptops, monitors, keyboards, docks' },
  { value: 'SOFTWARE', label: 'Software', desc: 'OS, licenses, application errors' },
  { value: 'NETWORK', label: 'Network', desc: 'VPN, Wi-Fi, DNS, connectivity issues' },
  { value: 'ACCESS_MANAGEMENT', label: 'Access Management', desc: 'Permissions, passwords, accounts' },
  { value: 'OTHER', label: 'Other', desc: 'General inquiries and requests' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  { value: 'MEDIUM', label: 'Medium', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { value: 'HIGH', label: 'High', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'CRITICAL', label: 'Critical', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
];

const ALLOWED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.pdf', '.txt', '.log',
  '.docx', '.doc', '.xlsx', '.xls', '.csv', '.zip'
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 10;

const CreateTicketPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'SOFTWARE',
    priority: 'MEDIUM',
    description: '',
  });

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);

  // Replaces browser alert() with an in-page modal dialog
  const [uploadWarning, setUploadWarning] = useState(null);

  const triggerError = (msg) => {
    setError(msg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilesSelect = (selectedFiles) => {
    setError(null);
    const newFiles = Array.from(selectedFiles);

    if (files.length + newFiles.length > MAX_FILES) {
      triggerError(`Cannot upload more than ${MAX_FILES} files per ticket.`);
      return;
    }

    for (const f of newFiles) {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        triggerError(`"${f.name}" has an unsupported format. Executables and unverified formats are blocked.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        triggerError(`"${f.name}" exceeds the 5 MB limit.`);
        return;
      }
      if (f.size === 0) {
        triggerError(`"${f.name}" is empty.`);
        return;
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const title = formData.title.trim();
    const description = formData.description.trim();

    if (!title || !description) {
      triggerError('Title and description cannot be blank.');
      return;
    }

    if (title.length < 5) {
      triggerError('Title must be at least 5 characters long.');
      return;
    }

    if (description.length < 10) {
      triggerError('Description must be at least 10 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create Ticket Record
      setUploadStatus('Creating incident record...');
      const ticketPayload = {
        title,
        category: formData.category,
        priority: formData.priority,
        description,
      };

      const ticketRes = await API.post('/tickets/', ticketPayload);
      const createdTicket = ticketRes.data;

      // Step 2: Upload Attachments sequentially (if any)
      const failedFiles = [];

      for (let i = 0; i < files.length; i++) {
        setUploadStatus(`Uploading attachment ${i + 1} of ${files.length}: ${files[i].name}...`);
        const fileData = new FormData();
        fileData.append('file', files[i]);

        try {
          await API.post(`/tickets/${createdTicket.id}/attachments/`, fileData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          failedFiles.push(files[i].name);
        }
      }

      // If partial uploads failed, notify via modal; otherwise route immediately
      if (failedFiles.length > 0) {
        setUploadWarning({
          ticketKey: createdTicket.ticket_key,
          failedFiles,
        });
      } else {
        setUploadStatus('Ticket created successfully!');
        navigate('/tickets');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      triggerError(typeof detail === 'string' ? detail : 'Failed to create ticket.');
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/tickets" className="hover:text-white transition">Tickets</Link>
            <span>/</span>
            <span className="text-slate-200">New Ticket</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Support Ticket</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit an operational issue or hardware/software service request.
          </p>
        </div>
      </div>

      {/* Top Error Alert Banner */}
      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-white p-1 rounded transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1.5 uppercase tracking-wider">
            Ticket Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            disabled={submitting}
            placeholder="e.g. MacBook Pro won't charge through left USB-C port"
            className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
          />
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wider">
            Category <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = formData.category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => setFormData((prev) => ({ ...prev, category: cat.value }))}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">{cat.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{cat.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Radio Cards */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wider">
            Urgency / Priority <span className="text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRIORITIES.map((pri) => {
              const isSelected = formData.priority === pri.value;
              return (
                <button
                  key={pri.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => setFormData((prev) => ({ ...prev, priority: pri.value }))}
                  className={`py-2.5 px-3 rounded-lg border text-center transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500 text-white font-semibold shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`inline-block text-[11px] font-bold tracking-wider px-2 py-0.5 rounded border ${pri.badge}`}>
                    {pri.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1.5 uppercase tracking-wider">
            Issue Description <span className="text-rose-400">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="6"
            disabled={submitting}
            placeholder="Provide context, error logs, reproduction steps, or any recent changes..."
            className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
          />
        </div>

        {/* Attachments Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Attachments <span className="text-slate-500 font-normal lowercase">(optional, max 10 files, 5 MB each)</span>
            </label>
            <span className="text-[11px] text-slate-400">{files.length} / {MAX_FILES}</span>
          </div>

          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-6 text-center cursor-pointer transition"
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              disabled={submitting || files.length >= MAX_FILES}
              onChange={(e) => handleFilesSelect(e.target.files)}
              className="hidden"
            />
            <svg className="w-8 h-8 mx-auto text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs text-slate-300 font-medium">
              Click to browse or drag and drop logs, screenshots, or documents
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supported: PNG, JPG, PDF, TXT, LOG, DOCX, XLSX, CSV, ZIP
            </p>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-sky-400">📎</span>
                    <span className="text-slate-200 font-medium truncate">{file.name}</span>
                    <span className="text-slate-500 text-[10px]">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => removeFile(idx)}
                    className="text-slate-500 hover:text-rose-400 transition ml-2 p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-sky-400 font-medium">
            {uploadStatus && <span>⏳ {uploadStatus}</span>}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => navigate('/tickets')}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </form>

      {/* Partial Upload Warning Modal */}
      {uploadWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Ticket Created with Upload Warnings</h3>
                <p className="text-xs text-slate-400 mt-0.5">Reference: {uploadWarning.ticketKey}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your ticket was submitted successfully, but the following files failed to upload due to size or connection issues:
            </p>

            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 max-h-32 overflow-y-auto space-y-1">
              {uploadWarning.failedFiles.map((fname, i) => (
                <div key={i} className="text-xs text-rose-400 flex items-center space-x-2 truncate">
                  <span>✕</span>
                  <span className="truncate">{fname}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500">
              You can re-upload these files later directly from the Ticket Details page.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setUploadWarning(null);
                  navigate('/tickets');
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Continue to My Tickets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTicketPage;
