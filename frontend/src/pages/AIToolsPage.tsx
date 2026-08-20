import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Candidate, JobRequirement } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Sparkles, FileText, CheckCircle2, AlertTriangle,
  Cpu, ArrowRight, Zap, Target, CopyCheck, RefreshCw
} from 'lucide-react';

export const AIToolsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);

  // Tool 1: AI Match Score Calculator
  const [matchCandId, setMatchCandId] = useState('');
  const [matchReqId, setMatchReqId] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [isMatching, setIsMatching] = useState(false);

  // Tool 2: AI Resume Text Parser
  const [resumeText, setResumeText] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Tool 3: Duplicate Detector
  const [dupCandId, setDupCandId] = useState('');
  const [dupResult, setDupResult] = useState<any>(null);
  const [isCheckingDup, setIsCheckingDup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, rRes] = await Promise.all([
          api.get('/candidates'),
          api.get('/requirements'),
        ]);
        setCandidates(cRes.data);
        setRequirements(rRes.data);
        if (cRes.data.length > 0) {
          setMatchCandId(cRes.data[0].id);
          setDupCandId(cRes.data[0].id);
        }
        if (rRes.data.length > 0) {
          setMatchReqId(rRes.data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const handleComputeMatch = async () => {
    if (!matchCandId || !matchReqId) return;
    setIsMatching(true);
    try {
      const res = await api.post('/ai-tools/match-score', {
        candidate_id: matchCandId,
        requirement_id: matchReqId,
      });
      setMatchResult(res.data);
      showToast('success', 'Match Evaluated', `Overall match score: ${res.data.overall_match_score}%`);
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.detail || 'Could not evaluate match');
    } finally {
      setIsMatching(false);
    }
  };

  const handleParseResume = async () => {
    if (!resumeText.trim()) return;
    setIsParsing(true);
    try {
      const res = await api.post('/ai-tools/parse-resume', {
        document_text: resumeText,
      });
      setParseResult(res.data);
      showToast('success', 'Resume Parsed', `Extracted ${res.data.skills.length} skills successfully`);
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.detail || 'Could not parse resume text');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCheckDuplicates = async () => {
    if (!dupCandId) return;
    setIsCheckingDup(true);
    try {
      const res = await api.get(`/ai-tools/duplicate-check/${dupCandId}`);
      setDupResult(res.data);
      showToast('info', 'Duplicate Check Complete', res.data.is_duplicate_likely ? 'Potential duplicates flagged' : 'No duplicates detected');
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.detail || 'Could not check duplicates');
    } finally {
      setIsCheckingDup(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            AI Intelligence & Automated Match Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated resume parsing, semantic skill gap analysis, AI candidate scoring, and duplicate detection.
          </p>
        </div>
        <span className="px-3 py-1 bg-brand-950/80 border border-brand-800/60 text-brand-300 text-xs font-bold rounded-full">
          AI Ready Architecture
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: AI Candidate-Job Match Calculator */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI Candidate-Job Match Engine</h3>
              <p className="text-xs text-slate-400">Evaluates skill overlap and seniority compatibility</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Candidate</label>
              <select
                value={matchCandId}
                onChange={(e) => setMatchCandId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.candidate_code}) • {c.total_experience}y exp
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Job Requirement</label>
              <select
                value={matchReqId}
                onChange={(e) => setMatchReqId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.job_title} ({r.client_name}) • Req: {r.req_code}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleComputeMatch}
              disabled={isMatching}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40 transition-all flex items-center justify-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              {isMatching ? 'Analyzing Compatibility...' : 'Calculate AI Match Score'}
            </button>
          </div>

          {matchResult && (
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 mt-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Overall Match Score</span>
                <span
                  className={`text-xl font-black font-mono px-3 py-0.5 rounded-lg border ${
                    matchResult.overall_match_score >= 80
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                      : matchResult.overall_match_score >= 60
                      ? 'bg-brand-950/80 text-brand-300 border-brand-800/60'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  }`}
                >
                  {matchResult.overall_match_score}%
                </span>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <p className="font-semibold text-brand-300 mb-1">AI Recommendation:</p>
                <p>{matchResult.ai_recommendation}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-emerald-400 mb-1">Matched Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {matchResult.matched_skills.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 rounded text-[10px]">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {matchResult.missing_skills?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-amber-400 mb-1">Skill Gaps to Probe:</p>
                  <div className="flex flex-wrap gap-1">
                    {matchResult.missing_skills.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-amber-950/60 border border-amber-800/50 text-amber-300 rounded text-[10px]">
                        ? {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Module 2: AI Resume Text & Skill Extractor */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI Resume Parser & Skill Extractor</h3>
              <p className="text-xs text-slate-400">Extracts structured attributes from raw resume text</p>
            </div>
          </div>

          <div>
            <textarea
              rows={6}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={handleParseResume}
            disabled={isParsing}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isParsing ? 'Parsing Document...' : 'Extract Entities & Skills'}
          </button>

          {parseResult && (
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 animate-in fade-in duration-200 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-[10px]">Detected Email</span>
                  <p className="font-mono text-slate-200 font-bold">{parseResult.email}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-[10px]">Estimated Experience</span>
                  <p className="font-mono text-slate-200 font-bold">{parseResult.total_experience} Years</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-purple-300 mb-1">Extracted Technical Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {parseResult.skills.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 bg-purple-950/80 border border-purple-800/60 text-purple-300 rounded text-[10px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <p className="font-bold text-slate-300 mb-1 text-[11px]">AI Generated Summary:</p>
                <p className="text-slate-300 text-xs leading-relaxed">{parseResult.summary}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Module 3: Duplicate Candidate Detection */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <CopyCheck className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Duplicate Candidate Audit</h3>
            <p className="text-xs text-slate-400">Cross-checks talent database for potential dual-submissions or duplicate profiles</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={dupCandId}
            onChange={(e) => setDupCandId(e.target.value)}
            className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name} ({c.email}) • {c.candidate_code}
              </option>
            ))}
          </select>

          <button
            onClick={handleCheckDuplicates}
            disabled={isCheckingDup}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-900/40 transition-all flex items-center gap-2"
          >
            <CopyCheck className="w-4 h-4" />
            Check Duplicates
          </button>
        </div>

        {dupResult && (
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            {dupResult.is_duplicate_likely ? (
              <div className="flex items-start gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Potential duplicates detected in candidate pool!</strong>
                  <ul className="mt-2 space-y-1">
                    {dupResult.potential_matches.map((m: any) => (
                      <li key={m.id} className="font-mono text-slate-300">
                        • {m.name} ({m.email}) - {m.code}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Candidate record is unique. No duplicate profiles found in the database.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
