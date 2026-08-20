import React from 'react';
import { CandidateStatusHistory } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Clock, User, Calendar, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface CandidateTimelineProps {
  history: CandidateStatusHistory[];
  candidateName?: string;
}

export const CandidateTimeline: React.FC<CandidateTimelineProps> = ({
  history,
  candidateName,
}) => {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
        <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-medium">No history events recorded yet.</p>
      </div>
    );
  }

  // Sort chronological descending (most recent first)
  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Immutable Audit Timeline
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete sequential trail of actions, stage transitions, and recruiter interactions.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-brand-950/60 border border-brand-800/60 text-brand-300 rounded-full">
          {history.length} Event{history.length > 1 ? 's' : ''} Logged
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {sorted.map((item, index) => {
          const dateObj = new Date(item.created_at);
          const formattedDate = !isNaN(dateObj.getTime())
            ? format(dateObj, 'dd MMM yyyy, HH:mm')
            : item.created_at;

          const isLatest = index === 0;

          return (
            <div key={item.id || index} className="relative group">
              {/* Timeline Indicator Dot */}
              <div
                className={`absolute -left-[27px] top-1.5 w-4 h-4 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 ${
                  isLatest
                    ? 'bg-brand-500 border-brand-300 ring-4 ring-brand-500/20 shadow-lg shadow-brand-500/50'
                    : 'bg-slate-800 border-slate-600'
                }`}
              />

              {/* Event Card */}
              <div
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  isLatest
                    ? 'bg-slate-850 border-brand-500/40 shadow-lg shadow-brand-950/20'
                    : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.old_status && (
                      <>
                        <StatusBadge status={item.old_status} />
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </>
                    )}
                    <StatusBadge status={item.new_status} />
                    {isLatest && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-brand-500 text-white rounded-full">
                        Current State
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-xs text-slate-400 font-mono gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {/* Remarks & Descriptions */}
                {item.remarks && (
                  <p className="mt-2.5 text-sm text-slate-200 leading-relaxed font-normal bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
                    {item.remarks}
                  </p>
                )}

                {/* Metadata row: Author & Stage duration */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/50">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Action by: <strong className="text-slate-300 font-medium">{item.changed_by_name || 'Recruitment System'}</strong></span>
                  </div>

                  {item.stage_duration_hours > 0 && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Stage Duration: <strong className="text-slate-300 font-medium">{item.stage_duration_hours.toFixed(1)} hrs</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
