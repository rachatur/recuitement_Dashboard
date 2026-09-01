import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'indigo' | 'amber';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  const variantClasses = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
    danger: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
    info: 'bg-sky-950/70 text-sky-300 border-sky-800/60',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
    indigo: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60',
    amber: 'bg-amber-900/50 text-amber-200 border-amber-700/50',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-sm ${sizeClasses} ${variantClasses}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toUpperCase();

  if (['JOINED', 'SELECTED', 'COMPLETED', 'ACTIVE'].includes(s)) {
    return <Badge variant="success">{status}</Badge>;
  }
  if (['OFFER', 'SHORTLISTED', 'ACCEPTED', 'RELEASED'].includes(s)) {
    return <Badge variant="purple">{status}</Badge>;
  }
  if (['INTERVIEW', 'SUBMITTED', 'CLIENT_VIEWED', 'CLIENT_REVIEW'].includes(s)) {
    return <Badge variant="info">{status}</Badge>;
  }
  if (['SCREENED', 'OPEN', 'PARTIALLY_FILLED', 'PLANNED', 'SCHEDULED'].includes(s)) {
    return <Badge variant="indigo">{status}</Badge>;
  }
  if (['RECEIVED', 'ON_HOLD', 'DRAFT', 'RESCHEDULED'].includes(s)) {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (['REJECTED', 'CLOSED', 'CANCELLED', 'DECLINED', 'WITHDRAWN', 'DID_NOT_JOIN', 'NO_SHOW', 'INACTIVE'].includes(s)) {
    return <Badge variant="danger">{status}</Badge>;
  }

  return <Badge variant="default">{status}</Badge>;
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const p = priority.toUpperCase();
  if (p === 'URGENT') return <Badge variant="danger">⚡ URGENT</Badge>;
  if (p === 'HIGH') return <Badge variant="warning">▲ HIGH</Badge>;
  if (p === 'MEDIUM') return <Badge variant="info">● MEDIUM</Badge>;
  return <Badge variant="default">▽ LOW</Badge>;
};

export const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const r = role.toUpperCase();
  if (r === 'SUPER_ADMIN') return <Badge variant="purple">👑 Super Admin</Badge>;
  if (r === 'HR_RECRUITER') return <Badge variant="success">💼 HR Recruiter</Badge>;
  if (r === 'ADMIN') return <Badge variant="indigo">🛡️ Admin</Badge>;
  if (r === 'RECRUITER') return <Badge variant="info">🎯 Recruiter</Badge>;
  if (r === 'TEAM_LEAD') return <Badge variant="warning">⭐ Team Lead</Badge>;
  if (r === 'CLIENT') return <Badge variant="success">🏢 Client</Badge>;
  if (r === 'HIRING_MANAGER') return <Badge variant="amber">💼 Hiring Manager</Badge>;
  return <Badge variant="default">👁️ Viewer</Badge>;
};
