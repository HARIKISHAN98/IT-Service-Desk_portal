import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onToggleSidebar }) => {
  const { user } = useAuth();

  const userInitial = (
    user?.first_name + ' ' + user?.last_name ||
    user?.email ||
    'U'
  )[0].toUpperCase();

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition"
          aria-label="Toggle navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-bold text-sky-400">
            IT
          </div>
          <span className="text-base font-bold text-white tracking-wide">
            Service Desk
          </span>
        </div>
      </div>

      {/* Header Right Profile Indicator */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
          {userInitial}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
