import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { PositionTrackingPage } from './pages/PositionTrackingPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { CandidateProfilePage } from './pages/CandidateProfilePage';
import { CandidateHistoryPage } from './pages/CandidateHistoryPage';
import { BenchPage } from './pages/BenchPage';
import { WhatsAppDashboardPage } from './pages/WhatsAppDashboardPage';
import { WhatsAppCampaignsPage } from './pages/WhatsAppCampaignsPage';
import { WhatsAppTemplatesPage } from './pages/WhatsAppTemplatesPage';
import { WhatsAppConversationsPage } from './pages/WhatsAppConversationsPage';
import { WhatsAppOptOutsPage } from './pages/WhatsAppOptOutsPage';
import { WhatsAppSettingsPage } from './pages/WhatsAppSettingsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { InterviewsPage } from './pages/InterviewsPage';
import { OffersPage } from './pages/OffersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { WeeklyHRReportPage } from './pages/WeeklyHRReportPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersPage } from './pages/UsersPage';
import { AIToolsPage } from './pages/AIToolsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Cross-page navigation context state
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [campaignCandidateIds, setCampaignCandidateIds] = useState<string[]>([]);
  const [campaignRequirementId, setCampaignRequirementId] = useState<string | undefined>(undefined);
  const [globalSearch, setGlobalSearch] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Loading RecruitFlow Enterprise Platform...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleViewCandidateProfile = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setActiveTab('candidate-profile');
  };

  const handleNavigateToCampaigns = (candidateIds: string[], requirementId?: string) => {
    setCampaignCandidateIds(candidateIds);
    setCampaignRequirementId(requirementId);
    setActiveTab('whatsapp-campaigns');
  };

  const handleGlobalSearch = (term: string) => {
    setGlobalSearch(term);
    if (term.trim()) setActiveTab('candidates');
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'clients':
        return <ClientsPage />;
      case 'requirements':
        return <RequirementsPage />;
      case 'position-tracking':
        return (
          <PositionTrackingPage
            onNavigateToCampaigns={handleNavigateToCampaigns}
          />
        );
      case 'candidates':
        return (
          <CandidatesPage
            onViewCandidateProfile={handleViewCandidateProfile}
            initialSearch={globalSearch}
          />
        );
      case 'candidate-profile':
        return selectedCandidateId ? (
          <CandidateProfilePage
            candidateId={selectedCandidateId}
            onBack={() => setActiveTab('candidates')}
          />
        ) : (
          <CandidatesPage onViewCandidateProfile={handleViewCandidateProfile} />
        );
      case 'candidate-history':
        return (
          <CandidateHistoryPage
            onViewCandidateProfile={handleViewCandidateProfile}
          />
        );
      case 'bench':
        return (
          <BenchPage
            onNavigateToCampaigns={handleNavigateToCampaigns}
            onViewCandidateProfile={handleViewCandidateProfile}
          />
        );
      case 'whatsapp-dashboard':
        return (
          <WhatsAppDashboardPage
            onNavigateToCampaigns={() => setActiveTab('whatsapp-campaigns')}
            onNavigateToConversations={() => setActiveTab('whatsapp-conversations')}
          />
        );
      case 'whatsapp-campaigns':
        return (
          <WhatsAppCampaignsPage
            initialCandidateIds={campaignCandidateIds}
            initialRequirementId={campaignRequirementId}
            onClearInitialParams={() => {
              setCampaignCandidateIds([]);
              setCampaignRequirementId(undefined);
            }}
          />
        );
      case 'whatsapp-templates':
        return <WhatsAppTemplatesPage />;
      case 'whatsapp-conversations':
        return <WhatsAppConversationsPage />;
      case 'whatsapp-opt-outs':
        return <WhatsAppOptOutsPage />;
      case 'whatsapp-settings':
        return <WhatsAppSettingsPage />;
      case 'history':
        return <HistoryPage />;
      case 'submissions':
        return <SubmissionsPage />;
      case 'interviews':
        return <InterviewsPage />;
      case 'offers':
        return (
          <OffersPage
            onNavigateToCampaigns={handleNavigateToCampaigns}
            onViewCandidateProfile={handleViewCandidateProfile}
          />
        );
      case 'analytics':
        return <AnalyticsPage />;
      case 'weekly-hr-report':
        return <WeeklyHRReportPage onViewCandidateProfile={handleViewCandidateProfile} />;
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'users':
        return <UsersPage />;
      case 'ai-assistant':
        return <AIAssistantPage />;
      case 'ai-tools':
        return <AIToolsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} onGlobalSearch={handleGlobalSearch}>
      {renderActivePage()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
