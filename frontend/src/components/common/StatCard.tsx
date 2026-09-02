import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  isPositive?: boolean;
  color?: 'brand' | 'emerald' | 'amber' | 'purple' | 'sky' | 'rose' | 'indigo' | 'teal';
  subtitle?: string;
  badge?: string;
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
  badge,
  onClick,
}) => {
  const colorConfig = {
    brand: {
      bgGlow: 'from-brand-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-brand-500 to-sky-400',
      iconBox: 'bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30',
    },
    emerald: {
      bgGlow: 'from-emerald-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      iconBox: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    },
    teal: {
      bgGlow: 'from-teal-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-teal-500 to-emerald-400',
      iconBox: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
    },
    amber: {
      bgGlow: 'from-amber-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-amber-500 to-orange-400',
      iconBox: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    },
    purple: {
      bgGlow: 'from-purple-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-purple-500 to-pink-400',
      iconBox: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
    },
    indigo: {
      bgGlow: 'from-indigo-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-indigo-500 to-blue-400',
      iconBox: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
    },
    sky: {
      bgGlow: 'from-sky-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-sky-500 to-cyan-400',
      iconBox: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    },
    rose: {
      bgGlow: 'from-rose-500/10 via-transparent to-transparent',
      topBar: 'bg-gradient-to-r from-rose-500 to-red-400',
      iconBox: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    },
  }[color];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-lg transition-all duration-300 hover-lift hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md dark:hover:shadow-2xl ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top Gradient Highlight Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 opacity-70 group-hover:opacity-100 transition-opacity ${colorConfig.topBar}`} />

      {/* Subtle Ambient Radial Glow on Dark Mode */}
      <div className={`absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br ${colorConfig.bgGlow} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </p>
            {badge && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {badge}
              </span>
            )}
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums mt-0.5">
            {value}
          </h3>
        </div>

        <div
          className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-300 group-hover:scale-110 shadow-sm ${colorConfig.iconBox}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(change || subtitle) && (
        <div className="mt-3.5 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/80 pt-2.5 relative z-10">
          {change ? (
            <span
              className={`font-bold flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                isPositive
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
                  : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{change}</span>
            </span>
          ) : <span />}
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] truncate max-w-[150px] text-right">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
