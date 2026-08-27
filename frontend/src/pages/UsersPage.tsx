import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { User, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { RoleBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  UserCheck, Plus, Search, Shield, Mail, Phone,
  CheckCircle2, XCircle, RefreshCw, User as UserIcon
} from 'lucide-react';
import { format } from 'date-fns';

export const UsersPage: React.FC = () => {
  const { hasRole, user: currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add User Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('RECRUITER');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/users', {
        email: email.trim(),
        password,
        full_name: fullName,
        role,
        phone,
        is_active: true,
      });

      showToast('success', 'User Created', `Created user account for ${fullName}`);
      setIsAddOpen(false);
      setEmail('');
      setFullName('');
      setPhone('');
      fetchUsers();
    } catch (err: any) {
      showToast('error', 'Creation Failed', err.response?.data?.detail || 'Could not create user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, {
        is_active: !user.is_active,
      });
      showToast('success', 'Status Updated', `User ${user.full_name} is now ${!user.is_active ? 'Active' : 'Inactive'}`);
      fetchUsers();
    } catch (err: any) {
      showToast('error', 'Update Failed', 'Could not update user status');
    }
  };

  const canManageUsers = hasRole(['SUPER_ADMIN', 'ADMIN', 'HR_RECRUITER']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-400" />
            User Management & Role Access Control
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure system users, assign role access tiers, and manage tenant accounts.
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add System User
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="w-64">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Role Types</option>
            <option value="HR_RECRUITER">HR Recruiter (Full Access)</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="RECRUITER">Recruiter</option>
            <option value="TEAM_LEAD">Team Lead</option>
            <option value="CLIENT">Client</option>
            <option value="HIRING_MANAGER">Hiring Manager</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Created On</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No users found matching filter.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={u.full_name}
                          className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                        />
                        <span className="font-bold text-slate-100">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{u.phone || '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-400 text-[11px]">
                      {format(new Date(u.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded-full text-[10px] font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800/60 rounded-full text-[10px] font-semibold">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canManageUsers && u.id !== currentUser?.id && (
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
                            u.is_active
                              ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/50'
                              : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New System User"
        subtitle="Create user login and assign role permissions."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rachel Kim"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@recruitflow.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Initial Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Assign System Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="HR_RECRUITER">HR Recruiter (Full Access)</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="CLIENT">Client</option>
                <option value="HIRING_MANAGER">Hiring Manager</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? 'Creating User...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
