import React, { useState } from 'react';
import API from '../../services/api';

const UserForm = ({ mode = 'register', onSuccess, onCancel }) => {
    const isRegister = mode === 'register';

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const firstName = formData.first_name.trim();
        const lastName = formData.last_name.trim();
        const cleanEmail = formData.email.trim().toLowerCase();

        if (!firstName || !lastName) {
            setError('First and last name cannot be empty spaces');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (isRegister && formData.password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        const payload = {
            first_name: firstName,
            last_name: lastName,
            email: cleanEmail,
            phone: formData.phone.trim() || null,
            password: formData.password,
        };

        try {
            if (isRegister) {
                // Public registration endpoint
                await API.post('/auth/register', payload);
                onSuccess(payload);
            } else {
                // Admin agent provisioning endpoint
                await API.post('/users/', payload);
                onSuccess();
            }
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setError(detail[0]?.msg || 'Validation failed. Please check inputs.');
            } else if (typeof detail === 'string') {
                setError(detail);
            } else {
                setError('Request failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dynamic Context Notice */}
            <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between ${isRegister
                        ? 'bg-sky-500/10 border border-sky-500/20 text-slate-300'
                        : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                    }`}
            >
                <span>Assigned Role:</span>
                <span className="font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-900/60 text-[10px]">
                    {isRegister ? 'END USER' : 'SUPPORT AGENT'}
                </span>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                        First Name
                    </label>
                    <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        placeholder="John"
                        className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                        Last Name
                    </label>
                    <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        placeholder="Doe"
                        className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address
                </label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
            </div>

            {/* Conditional phone label & required prop */}
            <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone Number{' '}
                    {isRegister ? (
                        <span className="text-slate-500 font-normal">(Optional)</span>
                    ) : (
                        <span className="text-rose-400 font-bold">*</span>
                    )}
                </label>
                <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required={!isRegister}
                    placeholder={isRegister ? '+1 (555) 000-0000' : '+1 (555) 000-0000 (Required)'}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
            </div>

            {/* Password */}
            <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRegister ? 'Password' : 'Temporary Password'}
                </label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
            </div>

            {/* Confirm Password (Only for self-registering end users) */}
            {isRegister && (
                <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        required
                        placeholder="Repeat your password"
                        className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                    {error}
                </div>
            )}

            {/* Actions: Full width button on Register page, Modal controls on Admin side */}
            {isRegister ? (
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg transition duration-150 disabled:opacity-50"
                >
                    {loading ? 'Creating Account...' : 'Sign Up as End-User'}
                </button>
            ) : (
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition disabled:opacity-50"
                    >
                        {loading ? 'Provisioning...' : 'Provision Agent'}
                    </button>
                </div>
            )}
        </form>
    );
};

export default UserForm;
