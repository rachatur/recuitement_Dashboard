import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { Candidate, JobRequirement, ATSAnalysisResult, ATSRecommendation } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Sparkles, FileText, CheckCircle2, AlertTriangle,
  Cpu, ArrowRight, Zap, Target, CopyCheck, RefreshCw,
  Upload, FileCheck, Award, AlertCircle, Check, X,
  Copy, PlusCircle, Briefcase, GraduationCap, Phone, Mail,
  MapPin, ExternalLink, ShieldCheck, TrendingUp, Layers,
  FileCode, Clock, Info, UserPlus, Sliders, ChevronRight
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const AIToolsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'ats' | 'match' | 'parser' | 'duplicate'>('ats');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // --- Tool 1: ATS CV Analyzer & Upload Studio ---
  const [atsInputMode, setAtsInputMode] = useState<'upload' | 'text' | 'candidate'>('upload');
  const [atsFile, setAtsFile] = useState<File | null>(null);
  const [atsResumeText, setAtsResumeText] = useState('');
  const [atsCandidateId, setAtsCandidateId] = useState('');
  const [atsRequirementId, setAtsRequirementId] = useState('');
  const [isAnalyzingATS, setIsAnalyzingATS] = useState(false);
  const [atsResult, setAtsResult] = useState<ATSAnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save as Candidate Modal State
  const [showSaveCandidateModal, setShowSaveCandidateModal] = useState(false);
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [candidateFormData, setCandidateFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    location: '',
    total_experience: 0,
    current_company: '',
    current_designation: '',
    education: '',
    skills: [] as string[],
    skills_text: '',
    temp_file_id: '',
  });

  // --- Tool 2: AI Match Score Calculator ---
  const [matchCandId, setMatchCandId] = useState('');
  const [matchReqId, setMatchReqId] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [isMatching, setIsMatching] = useState(false);

  // --- Tool 3: AI Resume Text Parser ---
  const [resumeText, setResumeText] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);

  // --- Tool 4: Duplicate Detector ---
  const [dupCandId, setDupCandId] = useState('');
  const [dupResult, setDupResult] = useState<any>(null);
  const [isCheckingDup, setIsCheckingDup] = useState(false);

  const sampleResumeText = `Alex Johnson
Email: alex.johnson@example.com | Phone: +1 (555) 345-9876
Location: San Francisco, CA | LinkedIn: https://linkedin.com/in/alexjohnson | GitHub: https://github.com/alexjohnson

Professional Summary:
Accomplished Senior Full-Stack Engineer with 6+ years of experience designing, developing, and deploying enterprise web applications and scalable cloud microservices using Python, FastAPI, React, TypeScript, PostgreSQL, and AWS.

Work Experience:
Senior Software Engineer — Apex Cloud Systems (2021 - Present)
• Architected and launched 12+ cloud-native microservices handling 3.5M+ daily requests, improving API response throughput by 42%.
• Spearheaded migration of monolithic core billing platform to Docker and Kubernetes on AWS, cutting infrastructure costs by 28%.
• Optimized complex PostgreSQL queries and Redis caching layers, reducing database p95 query latency from 320ms to 38ms.
• Led a cross-functional team of 6 engineers, implemented robust CI/CD pipelines via GitHub Actions, and elevated code test coverage to 94%.

Software Engineer — Nexus Tech Labs (2018 - 2021)
• Developed responsive client dashboards using React, TypeScript, and Tailwind CSS adopted by 85,000+ active enterprise users.
• Engineered REST APIs and WebSocket real-time notification streams using Python and FastAPI.
• Automated backend integration testing using Pytest, decreasing deployment bug tickets by 35%.

Education:
Bachelor of Science in Computer Science — University of Washington (2018)

Technical Skills:
Python, FastAPI, React, TypeScript, JavaScript, SQL, PostgreSQL, Docker, Kubernetes, AWS, Redis, GraphQL, CI/CD, Git, Linux, Microservices, REST API, Kafka, Machine Learning`;

  const fetchData = async () => {
    try {
      setLoadingInitial(true);
      const [cRes, rRes] = await Promise.all([
        api.get('/candidates'),
        api.get('/requirements'),
      ]);
      setCandidates(cRes.data);
      setRequirements(rRes.data);
      if (cRes.data.length > 0) {
        setMatchCandId(cRes.data[0].id);
        setDupCandId(cRes.data[0].id);
        setAtsCandidateId(cRes.data[0].id);
      }
      if (rRes.data.length > 0) {
        setMatchReqId(rRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ATS Handlers ---
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setAtsFile(file);
      showToast('info', 'File Selected', `Loaded: ${file.name}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAtsFile(file);
      showToast('info', 'File Selected', `Loaded: ${file.name}`);
    }
  };

  const handleRunATSCheck = async () => {
    if (atsInputMode === 'upload' && !atsFile) {
      showToast('error', 'Missing File', 'Please select or upload a CV file (PDF, DOCX, TXT)');
      return;
    }
    if (atsInputMode === 'text' && !atsResumeText.trim()) {
      showToast('error', 'Missing Text', 'Please paste the resume text to evaluate');
      return;
    }
    if (atsInputMode === 'candidate' && !atsCandidateId) {
      showToast('error', 'Missing Candidate', 'Please select a candidate to evaluate');
      return;
    }

    setIsAnalyzingATS(true);
    setAtsResult(null);

    try {
      const formData = new FormData();
      if (atsInputMode === 'upload' && atsFile) {
        formData.append('file', atsFile);
      } else if (atsInputMode === 'text') {
        formData.append('resume_text', atsResumeText);
      } else if (atsInputMode === 'candidate') {
        formData.append('candidate_id', atsCandidateId);
      }

      if (atsRequirementId) {
        formData.append('requirement_id', atsRequirementId);
      }

      const res = await api.post('/ai-tools/ats-checker', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAtsResult(res.data);
      showToast(
        'success',
        'ATS Evaluation Complete',
        `Overall Score: ${res.data.overall_score}/100 [${res.data.grade}]`
      );
    } catch (err: any) {
      showToast('error', 'ATS Analysis Failed', err.response?.data?.detail || 'Could not evaluate ATS score');
    } finally {
      setIsAnalyzingATS(false);
    }
  };

  const handleOpenSaveModal = () => {
    if (!atsResult) return;
    const cand = atsResult.candidate_details || {};
    const skillsList = cand.skills || atsResult.skills_analysis?.extracted_skills || [];
    setCandidateFormData({
      first_name: cand.first_name || '',
      last_name: cand.last_name || '',
      email: cand.email || '',
      phone: cand.phone || '',
      location: cand.location || '',
      total_experience: cand.total_experience || 0,
      current_company: cand.current_company || '',
      current_designation: cand.current_designation || 'Software Engineer',
      education: cand.education || cand.highest_qualification || "Bachelor's Degree",
      skills: skillsList,
      skills_text: skillsList.join(', '),
      temp_file_id: atsResult.temp_file_id || '',
    });
    setShowSaveCandidateModal(true);
  };

  const handleSaveCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateFormData.first_name || !candidateFormData.last_name || !candidateFormData.email) {
      showToast('error', 'Validation Error', 'First name, last name, and a valid email are required.');
      return;
    }

    setIsSavingCandidate(true);
    try {
      const skillsArray = candidateFormData.skills_text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        first_name: candidateFormData.first_name,
        last_name: candidateFormData.last_name,
        email: candidateFormData.email,
        phone: candidateFormData.phone,
        location: candidateFormData.location,
        total_experience: Number(candidateFormData.total_experience) || 0,
        current_company: candidateFormData.current_company,
        current_designation: candidateFormData.current_designation,
        education: candidateFormData.education,
        skills: skillsArray,
        temp_file_id: candidateFormData.temp_file_id || null,
        source: 'ATS_CV_Studio',
      };

      const res = await api.post('/ai-tools/ats-create-candidate', payload);
      showToast('success', 'Candidate Registered', res.data.message || 'Candidate saved successfully to talent pool!');
      setShowSaveCandidateModal(false);
      fetchData(); // refresh candidates
    } catch (err: any) {
      showToast('error', 'Save Failed', err.response?.data?.detail || 'Could not create candidate');
    } finally {
      setIsSavingCandidate(false);
    }
  };

  const handleCopyATSReport = () => {
    if (!atsResult) return;
    const candName = atsResult.candidate_details?.full_name || 'Candidate';
    const lines = [
      `# ATS CV Evaluation Report — ${candName}`,
      `**Overall ATS Score**: ${atsResult.overall_score}/100 (${atsResult.grade})`,
      `**Pass Probability**: ${atsResult.pass_probability}`,
      `**File**: ${atsResult.file_name || 'Direct Text'} (${atsResult.file_size_formatted || 'N/A'})`,
      ``,
      `### Executive Summary`,
      atsResult.summary,
      ``,
      `### Category Breakdown`,
      `- Contact & Essentials: ${atsResult.category_scores.contact_info}/${atsResult.category_max_scores.contact_info}`,
      `- Section Completeness: ${atsResult.category_scores.sections}/${atsResult.category_max_scores.sections}`,
      `- Action Verbs & Impact: ${atsResult.category_scores.content_impact}/${atsResult.category_max_scores.content_impact}`,
      `- Technical Skills & Keywords: ${atsResult.category_scores.skills_keywords}/${atsResult.category_max_scores.skills_keywords}`,
      `- Formatting & Readability: ${atsResult.category_scores.formatting}/${atsResult.category_max_scores.formatting}`,
      ``,
      `### Extracted Skills (${atsResult.skills_analysis.skills_count})`,
      atsResult.skills_analysis.extracted_skills.join(', '),
      ``,
      `### Key Recommendations`,
      ...atsResult.recommendations.map((r) => `- [${r.category.toUpperCase()}] ${r.title}: ${r.description}`),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('success', 'Copied to Clipboard', 'Full ATS report copied in Markdown format');
  };

  // --- Other Tools Handlers ---
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
      showToast('success', 'Resume Parsed', `Extracted ${res.data.skills?.length || 0} skills successfully`);
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60';
    if (score >= 70) return 'text-brand-400 border-brand-500/40 bg-brand-950/60';
    if (score >= 55) return 'text-amber-400 border-amber-500/40 bg-amber-950/60';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/60';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (score >= 70) return 'bg-brand-500/20 text-brand-300 border-brand-500/40';
    if (score >= 55) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400 animate-pulse" />
            <h2 className="text-xl font-black text-slate-100 tracking-tight">
              AI Intelligence & Automated Match Studio
            </h2>
            <span className="px-2.5 py-0.5 bg-brand-950/80 border border-brand-800/60 text-brand-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
              ATS 2.0 Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate CV ATS compatibility, calculate candidate-job fit, extract technical competencies, and audit duplicate talent.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('ats')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ats'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            ATS CV Analyzer
          </button>
          <button
            onClick={() => setActiveTab('match')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'match'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Job Matcher
          </button>
          <button
            onClick={() => setActiveTab('parser')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'parser'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Resume Parser
          </button>
          <button
            onClick={() => setActiveTab('duplicate')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'duplicate'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CopyCheck className="w-3.5 h-3.5" />
            Duplicate Audit
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ATS CV ANALYZER & UPLOAD STUDIO (FEATURED) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ats' && (
        <div className="space-y-6">
          {/* Top Configuration & Upload Card */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-950/80 border border-brand-700/60 flex items-center justify-center text-brand-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    ATS CV Compatibility & Scoring Studio
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload any resume file to analyze ATS pass probability, keyword density, section health, and actionable fixes.
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setAtsInputMode('upload')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    atsInputMode === 'upload' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📁 Upload File
                </button>
                <button
                  onClick={() => setAtsInputMode('text')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    atsInputMode === 'text' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ✍️ Paste Text
                </button>
                <button
                  onClick={() => setAtsInputMode('candidate')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    atsInputMode === 'candidate' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  👤 Existing Candidate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Input Source (File Drop / Text / Candidate Selector) */}
              <div className="lg:col-span-2 space-y-3">
                {atsInputMode === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {!atsFile ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                          isDragging
                            ? 'border-brand-400 bg-brand-950/40 shadow-lg shadow-brand-950'
                            : 'border-slate-700/80 bg-slate-950/60 hover:border-brand-500/60 hover:bg-slate-950'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-brand-950/80 border border-brand-800/60 flex items-center justify-center text-brand-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200">
                            Drag & drop candidate CV here, or <span className="text-brand-400 underline">browse</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Supports PDF, DOCX, DOC, and TXT files (Up to 15MB)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950/90 border border-slate-700/80 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-950 border border-brand-800/60 flex items-center justify-center text-brand-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-200 font-mono">{atsFile.name}</p>
                            <p className="text-xs text-slate-400">
                              {(atsFile.size / 1024).toFixed(1)} KB • {atsFile.type || 'Document'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => setAtsFile(null)}
                            className="p-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {atsInputMode === 'text' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Resume Content Text</label>
                      <button
                        onClick={() => setAtsResumeText(sampleResumeText)}
                        className="text-[11px] font-bold text-brand-400 hover:text-brand-300 transition-all flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Load Sample Tech CV
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={atsResumeText}
                      onChange={(e) => setAtsResumeText(e.target.value)}
                      placeholder="Paste full resume text including summary, work experience, education, and technical skills..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500 transition-all"
                    />
                  </div>
                )}

                {atsInputMode === 'candidate' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">Select Talent Pool Candidate</label>
                    <select
                      value={atsCandidateId}
                      onChange={(e) => setAtsCandidateId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                    >
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name} ({c.candidate_code}) • {c.total_experience}y exp • {c.skills?.slice(0, 3).join(', ')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Right Column: Target Job Alignment (Optional) & CTA */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Compare to Job Requirement <span className="text-slate-500">(Optional)</span>
                    </label>
                    <select
                      value={atsRequirementId}
                      onChange={(e) => setAtsRequirementId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                    >
                      <option value="">Standard ATS Benchmark (No specific job)</option>
                      {requirements.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.job_title} ({r.client_name}) • {r.req_code}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Select a job requirement to check keyword match percentage and skill gaps.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunATSCheck}
                  disabled={isAnalyzingATS}
                  className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-900/50 transition-all flex items-center justify-center gap-2"
                >
                  {isAnalyzingATS ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Evaluating ATS Compatibility...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Check ATS Score & Compatibility
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ATS Analysis Output Dashboard */}
          {atsResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Score Hero Summary Card */}
              <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  {/* Left: Big Score Meter & Grade */}
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg ${getScoreColor(
                        atsResult.overall_score
                      )}`}
                    >
                      <span className="text-3xl font-black font-mono leading-none">
                        {atsResult.overall_score}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                        / 100 PTS
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black border ${getScoreBadge(
                            atsResult.overall_score
                          )}`}
                        >
                          {atsResult.grade}
                        </span>
                        <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-full flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                          {atsResult.pass_probability}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-100">
                        {atsResult.candidate_details?.full_name || 'Candidate CV Analysis'}
                      </h4>

                      <p className="text-xs text-slate-400 font-mono">
                        {atsResult.file_name || 'Resume Document'} • {atsResult.file_size_formatted || 'Text Input'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto">
                    <button
                      onClick={handleOpenSaveModal}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Save as Candidate
                    </button>

                    <button
                      onClick={handleCopyATSReport}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Report
                    </button>
                  </div>
                </div>

                {/* Executive Summary Quote */}
                <div className="mt-5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{atsResult.summary}</p>
                </div>
              </div>

              {/* 5-Category Breakdown & Checklist Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 5-Pillar Score Bars */}
                <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Sliders className="w-4 h-4 text-brand-400" />
                    <h4 className="text-sm font-bold text-slate-100">ATS Evaluation Pillars</h4>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Pillar 1 */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-300">1. Contact & Essentials</span>
                        <span className="font-mono text-brand-300">
                          {atsResult.category_scores.contact_info} / {atsResult.category_max_scores.contact_info} pts
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(atsResult.category_scores.contact_info / atsResult.category_max_scores.contact_info) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Pillar 2 */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-300">2. Section Completeness</span>
                        <span className="font-mono text-purple-300">
                          {atsResult.category_scores.sections} / {atsResult.category_max_scores.sections} pts
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(atsResult.category_scores.sections / atsResult.category_max_scores.sections) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Pillar 3 */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-300">3. Action Verbs & Measurable Impact</span>
                        <span className="font-mono text-emerald-300">
                          {atsResult.category_scores.content_impact} / {atsResult.category_max_scores.content_impact} pts
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(atsResult.category_scores.content_impact / atsResult.category_max_scores.content_impact) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Pillar 4 */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-300">4. Skills & Keyword Density</span>
                        <span className="font-mono text-cyan-300">
                          {atsResult.category_scores.skills_keywords} / {atsResult.category_max_scores.skills_keywords} pts
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(atsResult.category_scores.skills_keywords / atsResult.category_max_scores.skills_keywords) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Pillar 5 */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-300">5. Formatting & ATS Readability</span>
                        <span className="font-mono text-amber-300">
                          {atsResult.category_scores.formatting} / {atsResult.category_max_scores.formatting} pts
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(atsResult.category_scores.formatting / atsResult.category_max_scores.formatting) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section & Header Checklist */}
                <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-slate-100">ATS Section & Header Detection</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Candidate Name</span>
                      {atsResult.contact_info_check?.name_detected ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Detected</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">✕ Missing</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Email Address</span>
                      {atsResult.contact_info_check?.email_detected ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Detected</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">✕ Missing</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Phone Number</span>
                      {atsResult.contact_info_check?.phone_detected ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Detected</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">✕ Missing</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Location / City</span>
                      {atsResult.contact_info_check?.location_detected ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Detected</span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">? Optional</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">LinkedIn / GitHub</span>
                      {atsResult.contact_info_check?.links_detected ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Detected</span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">? Recommended</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Summary / Profile</span>
                      {atsResult.sections_detected?.summary ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Found</span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">? Missing</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Work Experience</span>
                      {atsResult.sections_detected?.work_experience ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Found</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">✕ Missing</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Education History</span>
                      {atsResult.sections_detected?.education ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Found</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">✕ Missing</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Technical Skills</span>
                      {atsResult.sections_detected?.skills ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Found</span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">✕ Missing</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Projects / Certs</span>
                      {atsResult.sections_detected?.projects_and_certifications ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✓ Found</span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">? Optional</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills & Keyword Match Section */}
              <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-slate-100">
                      Extracted Technical Skills & Keyword Density ({atsResult.skills_analysis.skills_count})
                    </h4>
                  </div>
                  {atsResult.target_job && (
                    <span className="px-3 py-1 bg-brand-950 border border-brand-800/80 text-brand-300 text-xs font-bold rounded-lg">
                      Match to {atsResult.target_job.job_title}: {atsResult.target_job.match_percentage}%
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-400 mb-2">Detected Technical Competencies:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {atsResult.skills_analysis.extracted_skills.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 bg-purple-950/70 border border-purple-800/60 text-purple-300 rounded-lg text-xs font-mono font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {atsResult.target_job && (
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-400 mb-1.5">✓ Matched Job Requirements:</p>
                      <div className="flex flex-wrap gap-1">
                        {atsResult.target_job.matched_skills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 rounded text-[11px]"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {atsResult.target_job.missing_skills.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-amber-400 mb-1.5">⚠️ Missing Target Keywords:</p>
                        <div className="flex flex-wrap gap-1">
                          {atsResult.target_job.missing_skills.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 bg-amber-950/70 border border-amber-800/60 text-amber-300 rounded text-[11px]"
                            >
                              + {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Metrics & Impact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Word Count</span>
                  <p className="text-lg font-black text-slate-100 font-mono">
                    {atsResult.content_metrics.word_count} words
                  </p>
                  <p className="text-[11px] text-brand-300">{atsResult.content_metrics.length_status}</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Action Verbs</span>
                  <p className="text-lg font-black text-emerald-300 font-mono">
                    {atsResult.content_metrics.action_verbs_count} found
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {atsResult.content_metrics.action_verbs_found.slice(0, 3).join(', ')}...
                  </p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Measurable Metrics</span>
                  <p className="text-lg font-black text-cyan-300 font-mono">
                    {atsResult.content_metrics.quantified_metrics_count} impacts
                  </p>
                  <p className="text-[11px] text-slate-400">Percentages & statistics</p>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Readability</span>
                  <p className="text-lg font-black text-amber-300 font-mono">
                    ~{atsResult.content_metrics.reading_time_minutes} min read
                  </p>
                  <p className="text-[11px] text-slate-400">{atsResult.formatting_check.file_format_compatibility}</p>
                </div>
              </div>

              {/* Actionable Recommendations List */}
              <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <h4 className="text-sm font-bold text-slate-100">AI ATS Optimization Recommendations</h4>
                </div>

                <div className="space-y-3">
                  {atsResult.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                        rec.category === 'critical'
                          ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                          : rec.category === 'improvement'
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                          : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      }`}
                    >
                      {rec.category === 'critical' && <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
                      {rec.category === 'improvement' && <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                      {rec.category === 'strength' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}

                      <div className="space-y-0.5">
                        <p className="font-bold">{rec.title}</p>
                        <p className="opacity-90 leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: AI CANDIDATE-JOB MATCH ENGINE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'match' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Target className="w-5 h-5 text-brand-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI Candidate-Job Match Engine</h3>
              <p className="text-xs text-slate-400">Evaluates skill overlap and seniority compatibility</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Candidate</label>
              <select
                value={matchCandId}
                onChange={(e) => setMatchCandId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.job_title} ({r.client_name}) • Req: {r.req_code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleComputeMatch}
            disabled={isMatching}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40 transition-all flex items-center justify-center gap-2"
          >
            <Cpu className="w-4 h-4" />
            {isMatching ? 'Analyzing Compatibility...' : 'Calculate AI Match Score'}
          </button>

          {matchResult && (
            <div className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4 animate-in fade-in duration-200 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-300">Overall Match Score</span>
                <span
                  className={`text-2xl font-black font-mono px-3 py-1 rounded-lg border ${
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

              <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                <p className="font-semibold text-brand-300 mb-1">AI Recommendation:</p>
                <p>{matchResult.ai_recommendation}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-emerald-400 mb-1.5">Matched Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {matchResult.matched_skills.map((s: string) => (
                    <span key={s} className="px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 rounded text-[11px]">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {matchResult.missing_skills?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-amber-400 mb-1.5">Skill Gaps to Probe:</p>
                  <div className="flex flex-wrap gap-1">
                    {matchResult.missing_skills.map((s: string) => (
                      <span key={s} className="px-2.5 py-0.5 bg-amber-950/60 border border-amber-800/50 text-amber-300 rounded text-[11px]">
                        ? {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: AI RESUME PARSER & SKILL EXTRACTOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'parser' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI Resume Parser & Skill Extractor</h3>
              <p className="text-xs text-slate-400">Extracts structured attributes from raw resume text</p>
            </div>
          </div>

          <div>
            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste raw candidate resume text here to parse email, experience, skills, and summary..."
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
                <div className="p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-[10px]">Detected Email</span>
                  <p className="font-mono text-slate-200 font-bold">{parseResult.email}</p>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg">
                  <span className="text-slate-400 text-[10px]">Estimated Experience</span>
                  <p className="font-mono text-slate-200 font-bold">{parseResult.total_experience} Years</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-purple-300 mb-1.5">Extracted Technical Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {parseResult.skills?.map((s: string) => (
                    <span key={s} className="px-2.5 py-0.5 bg-purple-950/80 border border-purple-800/60 text-purple-300 rounded text-[11px]">
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: DUPLICATE CANDIDATE AUDIT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'duplicate' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
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
              className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
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
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-900/40 transition-all flex items-center justify-center gap-2"
            >
              <CopyCheck className="w-4 h-4" />
              Check Duplicates
            </button>
          </div>

          {dupResult && (
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs animate-in fade-in duration-200">
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SAVE PARSED ATS CANDIDATE */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={showSaveCandidateModal}
        onClose={() => setShowSaveCandidateModal(false)}
        title="Register Candidate into Talent Pool"
      >
        <form onSubmit={handleSaveCandidateSubmit} className="space-y-4 text-xs">
          <p className="text-slate-400 text-[11px]">
            Review parsed candidate details extracted from the ATS CV evaluation:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={candidateFormData.first_name}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, first_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={candidateFormData.last_name}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, last_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email *</label>
              <input
                type="email"
                required
                value={candidateFormData.email}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={candidateFormData.phone}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, phone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={candidateFormData.location}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Experience (Years)</label>
              <input
                type="number"
                step="0.5"
                value={candidateFormData.total_experience}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, total_experience: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Current Company</label>
              <input
                type="text"
                value={candidateFormData.current_company}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, current_company: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Current Designation</label>
              <input
                type="text"
                value={candidateFormData.current_designation}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, current_designation: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Highest Qualification</label>
              <input
                type="text"
                value={candidateFormData.education}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, education: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Technical Skills (Comma separated)</label>
            <textarea
              rows={2}
              value={candidateFormData.skills_text}
              onChange={(e) => setCandidateFormData({ ...candidateFormData, skills_text: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono text-[11px]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowSaveCandidateModal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingCandidate}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-950"
            >
              {isSavingCandidate ? 'Creating Record...' : 'Confirm & Save Candidate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
