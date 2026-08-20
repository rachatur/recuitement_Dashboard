import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { InterviewsPage } from './pages/InterviewsPage';
import { OffersPage } from './pages/OffersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersPage } from './pages/UsersPage';
import { AIToolsPage } from './pages/AIToolsPage';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Loading RecruitFlow Platform...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'clients':
        return <ClientsPage />;
      case 'requirements':
        return <RequirementsPage />;
      case 'candidates':
        return <CandidatesPage />;
      case 'submissions':
        return <SubmissionsPage />;
      case 'interviews':
        return <InterviewsPage />;
      case 'offers':
        return <OffersPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'users':
        return <UsersPage />;
      case 'ai-tools':
        return <AIToolsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActivePage()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
