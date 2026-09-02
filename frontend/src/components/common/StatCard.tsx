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
    brand: 'bg-brand-50 text-brand-600 border-brand-200 group-hover:border-brand-300 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20 dark:group-hover:border-brand-500/40',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:group-hover:border-emerald-500/40',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 group-hover:border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:group-hover:border-amber-500/40',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 group-hover:border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 dark:group-hover:border-purple-500/40',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 dark:group-hover:border-indigo-500/40',
    sky: 'bg-sky-50 text-sky-600 border-sky-200 group-hover:border-sky-300 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 dark:group-hover:border-sky-500/40',
    rose: 'bg-rose-50 text-rose-600 border-rose-200 group-hover:border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 dark:group-hover:border-rose-500/40',
  }[color];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-xl ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
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
        <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          {change && (
            <span
              className={`font-semibold flex items-center space-x-1 ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span>{isPositive ? '↑' : '↓'}</span>
              <span>{change}</span>
            </span>
          )}
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 font-normal">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
