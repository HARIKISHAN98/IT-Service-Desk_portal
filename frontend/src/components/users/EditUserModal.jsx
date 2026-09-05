import React, { useState, useEffect } from 'react';
import API from '../../services/api';

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        status: 'ACTIVE',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Selected user ka data load karein
    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone: user.phone || '',
                status: user.status || 'ACTIVE',
            });
            setError(null);
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const isAgent = user.role === 'SUPPORT_AGENT';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const firstName = formData.first_name.trim();
        const lastName = formData.last_name.trim();
        const phone = formData.phone.trim();

        if (!firstName || !lastName) {
            setError('First and last name cannot be empty.');
            return;
        }

        if (isAgent && !phone) {
            setError('Mobile number is mandatory for support agents.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                first_name: firstName,
                last_name: lastName,
                phone: phone || null,
                status: formData.status,
            };

            // Backend PATCH call
            const res = await API.patch(`/users/${user.id}`, payload);
            onUserUpdated(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update user profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-white tracking-tight">Edit Profile</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Read-Only Role & Email Info */}
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <span className="text-slate-400">Account Role</span>
                        <span className="font-bold tracking-wider text-[10px] uppercase px-2 py-0.5 rounded bg-slate-800 text-sky-400">
                            {user.role?.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Names */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                            Phone Number {isAgent ? <span className="text-rose-400">*</span> : <span className="text-slate-500">(Optional)</span>}
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required={isAgent}
                            placeholder="+1 (555) 000-0000"
                            className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                    </div>

                    {/* Account Status Select */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                            Account Status
                        </label>
                        <div className="relative">
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-lg text-white text-xs font-medium appearance-none focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer pr-8"
                            >
                                <option value="ACTIVE" className="bg-slate-900 text-emerald-400">
                                    Active
                                </option>
                                <option value="INACTIVE" className="bg-slate-900 text-amber-400">
                                    Inactive
                                </option>
                            </select>
                            {/* Custom Dropdown Chevron Icon for pixel-perfect vertical alignment */}
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
