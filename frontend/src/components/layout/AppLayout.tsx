import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AIAssistantDrawer } from '../common/AIAssistantDrawer';

interface AppLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onGlobalSearch?: (term: string) => void;
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  setActiveTab,
  onGlobalSearch,
  children,
}) => {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      {/* Collapsible/Role-aware Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar onSearch={onGlobalSearch} />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Global Floating AI Copilot Widget */}
      <AIAssistantDrawer />
    </div>
  );
};

