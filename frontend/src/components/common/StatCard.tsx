import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  isPositive?: boolean;
  color?: 'brand' | 'emerald' | 'amber' | 'purple' | 'sky' | 'rose' | 'indigo';
  subtitle?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  isPositive,
  color = 'brand',
  subtitle,
  onClick,
}) => {
  const colorStyles = {
    brand: 'bg-brand-500/10 text-brand-400 border-brand-500/20 group-hover:border-brand-500/40',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:border-emerald-500/40',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:border-amber-500/40',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:border-purple-500/40',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:border-indigo-500/40',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20 group-hover:border-sky-500/40',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:border-rose-500/40',
  }[color];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:border-slate-700 hover:shadow-xl ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-black text-slate-100 mt-1 tracking-tight">
            {value}
          </h3>
        </div>
        <div
          className={`p-3 rounded-xl border transition-all duration-300 ${colorStyles}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(change || subtitle) && (
        <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-800/80 pt-2.5">
          {change && (
            <span
              className={`font-semibold flex items-center space-x-1 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{change}</span>
            </span>
          )}
          {subtitle && (
            <span className="text-slate-400 font-normal">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
