import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_PERSONAS } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Role } from '../../types';
import { RoleBadge } from '../common/Badge';
import {
  Bell, Search, ChevronDown, User, LogOut, ShieldCheck,
  CheckCheck, Clock, ExternalLink, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

interface NavbarProps {
  onSearch?: (term: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  const { user, logout, switchPersona } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const personaRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(event.target as Node)) {
        setIsPersonaOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const handlePersonaSelect = async (email: string) => {
    setIsPersonaOpen(false);
    await switchPersona(email);
  };

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Global Search Bar */}
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Global Search (Candidates, Requirements, Clients, Skills, IDs)..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full bg-slate-800/80 border border-slate-700/70 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
        />
      </div>

      {/* Right Action Center */}
      <div className="flex items-center space-x-4">
        {/* Active Account Switcher */}
        <div className="relative" ref={personaRef}>
          <button
            onClick={() => setIsPersonaOpen(!isPersonaOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-950/70 border border-brand-800/60 hover:border-brand-600 rounded-xl text-xs font-semibold text-brand-200 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">Active User:</span>
            <RoleBadge role={user?.role || 'HR_RECRUITER'} />
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {isPersonaOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Account
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Quickly switch between configured HR recruiter & admin accounts.
                </p>
              </div>

              {DEMO_PERSONAS.map((p) => {
                const isCurrent = user?.email === p.email;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePersonaSelect(p.email)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between ${
                      isCurrent
                        ? 'bg-brand-600/20 border border-brand-500/40 text-slate-100'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-100">{p.name}</strong>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-500 text-white rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center rounded-full shadow-lg shadow-rose-500/50 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3.5 transition-colors cursor-pointer text-xs ${
                        !n.is_read
                          ? 'bg-slate-850 hover:bg-slate-800/80 border-l-2 border-brand-500'
                          : 'hover:bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {format(new Date(n.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="flex items-center gap-2.5">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={user?.full_name}
              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
            />
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-200 leading-tight">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
