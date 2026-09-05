import React, { useEffect, useState, useMemo } from 'react';
import API from '../services/api';
import CreateAgentModal from '../components/users/CreateAgentModal';
import EditUserModal from '../components/users/EditUserModal';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchUsers = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        else setLoading(true);

        setError(null);
        try {
            const res = await API.get('/users/');
            const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
            setUsers(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load users directory.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Compute filtered list dynamically in memory
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            // 1. Text Search (Matches first name, last name, or email)
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
            const email = (u.email || '').toLowerCase();
            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = !query || fullName.includes(query) || email.includes(query);

            // 2. Role Filter
            const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

            // 3. Status Filter
            const matchesStatus = statusFilter === 'ALL' || (u.status || 'ACTIVE').toUpperCase() === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

    const hasActiveFilters = searchQuery.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL';

    const resetFilters = () => {
        setSearchQuery('');
        setRoleFilter('ALL');
        setStatusFilter('ALL');
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'SUPPORT_AGENT':
                return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
            default:
                return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
        }
    };

    const getStatusBadge = (status = 'ACTIVE') => {
        const isActive = status?.toUpperCase() === 'ACTIVE';
        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide border transition-colors ${isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
            >
                <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}
                />
                <span className="capitalize">{isActive ? 'Active' : 'Inactive'}</span>
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
                        User Management
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Directory of registered users and provisioned support agents
                    </p>
                </div>

                <div className="flex items-center space-x-2.5 self-start sm:self-auto">
                    <button
                        onClick={() => fetchUsers(true)}
                        disabled={loading || isRefreshing}
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition disabled:opacity-50 cursor-pointer"
                        title="Refresh Directory"
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

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-sky-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Provision Agent</span>
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
                {/* Search Bar */}
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
                        placeholder="Search by name or email..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-700/80 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                </div>

                {/* Dropdown Filters */}
                <div className="flex items-center gap-2.5">
                    {/* Styled Filter Dropdowns */}
                    <div className="flex items-center gap-2">
                        {/* Role Select */}
                        <div className="relative inline-block">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className={`appearance-none pl-3 pr-9 py-2 bg-slate-950/60 border text-xs font-medium rounded-lg transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 ${roleFilter !== 'ALL'
                                        ? 'border-sky-500/50 text-sky-400 bg-sky-500/5'
                                        : 'border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                            >
                                <option value="ALL">All Roles</option>
                                <option value="SUPPORT_AGENT">Support Agent</option>
                                <option value="END_USER">End User</option>
                            </select>
                            {/* Perfectly Centered Downward Chevron */}
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Status Select */}
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
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                            {/* Perfectly Centered Downward Chevron */}
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="px-2.5 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
                            title="Reset all filters"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Counter Tag */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                    Showing <span className="text-white font-semibold">{filteredUsers.length}</span> of{' '}
                    <span className="text-white font-semibold">{users.length}</span> registered users
                </span>
            </div>

            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                    {error}
                </div>
            )}

            {/* Directory Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Loading directory...</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                        <p className="text-slate-400 text-sm font-medium">No matching users found</p>
                        <p className="text-slate-500 text-xs">
                            Try adjusting your search query or reset the active filters.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-800/90 text-slate-200 text-xs uppercase tracking-wider border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-3.5 font-bold">User Details</th>
                                    <th className="px-4 py-3.5 font-bold">Role</th>
                                    <th className="hidden md:table-cell px-4 py-3.5 font-bold">Phone</th>
                                    <th className="px-4 py-3.5 font-bold">Status</th>
                                    <th className="hidden sm:table-cell px-4 py-3.5 font-bold">Joined</th>
                                    <th className="px-4 py-3.5 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-slate-200">
                                {filteredUsers.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <p className="font-semibold text-white text-xs sm:text-sm">
                                                {item.first_name} {item.last_name}
                                            </p>
                                            <p className="text-[11px] text-slate-400">{item.email}</p>
                                            {item.phone && (
                                                <p className="text-[10px] text-slate-400 md:hidden mt-0.5">
                                                    📞 {item.phone}
                                                </p>
                                            )}
                                        </td>

                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase rounded border ${getRoleBadge(
                                                    item.role
                                                )}`}
                                            >
                                                {item.role?.replace('_', ' ')}
                                            </span>
                                        </td>

                                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-slate-300 whitespace-nowrap">
                                            {item.phone || '—'}
                                        </td>

                                        <td className="px-4 py-3.5 whitespace-nowrap align-middle">
                                            {getStatusBadge(item.status)}
                                        </td>

                                        <td className="hidden sm:table-cell px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                                            {formatDate(item.created_at)}
                                        </td>

                                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(item);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="px-3 py-1 text-xs font-semibold text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-600 border border-sky-500/20 hover:border-transparent rounded-md transition duration-150 cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateAgentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchUsers(true)}
            />

            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                onUserUpdated={(updatedUser) => {
                    setUsers((prev) =>
                        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
                    );
                }}
            />
        </div>
    );
};

export default Users;