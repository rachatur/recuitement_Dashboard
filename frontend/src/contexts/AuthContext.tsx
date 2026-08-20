import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchPersona: (role: Role) => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Quick persona demo credentials mapping
export const DEMO_PERSONAS: Record<Role, { email: string; name: string; desc: string }> = {
  SUPER_ADMIN: {
    email: 'admin@recruitflow.com',
    name: 'System Administrator',
    desc: 'Full access to all tenants, users, audit logs, and configurations',
  },
  ADMIN: {
    email: 'sarah.admin@recruitflow.com',
    name: 'Sarah Jenkins (Admin)',
    desc: 'Manage users, clients, requirements, candidates, and reports',
  },
  RECRUITER: {
    email: 'alex.recruiter@recruitflow.com',
    name: 'Alex Rivera (Recruiter)',
    desc: 'Manage candidates, CV uploads, submissions, interviews, and status',
  },
  TEAM_LEAD: {
    email: 'marcus.lead@recruitflow.com',
    name: 'Marcus Sterling (Team Lead)',
    desc: 'View team performance, review recruiter pipelines and activity',
  },
  CLIENT: {
    email: 'david.client@novatech.com',
    name: 'David Vance (NovaTech Client)',
    desc: 'View submitted candidates for NovaTech, review CVs, submit feedback',
  },
  HIRING_MANAGER: {
    email: 'rachel.hm@novatech.com',
    name: 'Rachel Kim (NovaTech Hiring Manager)',
    desc: 'Review assigned candidates, record technical interview feedback',
  },
  VIEWER: {
    email: 'lisa.viewer@recruitflow.com',
    name: 'Lisa Montgomery (Viewer)',
    desc: 'Read-only access to permitted dashboards and recruitment metrics',
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('recruitflow_token');
    const savedUser = localStorage.getItem('recruitflow_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('recruitflow_token');
        localStorage.removeItem('recruitflow_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password = 'Password123!') => {
    setIsLoading(true);
    try {
      const p = email === 'admin@recruitflow.com' ? 'AdminPassword123!' : password;
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password: p,
      });
      const { access_token, refresh_token, user: userData } = res.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('recruitflow_token', access_token);
      localStorage.setItem('recruitflow_refresh_token', refresh_token);
      localStorage.setItem('recruitflow_user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('recruitflow_token');
    localStorage.removeItem('recruitflow_refresh_token');
    localStorage.removeItem('recruitflow_user');
  };

  const switchPersona = async (role: Role) => {
    const target = DEMO_PERSONAS[role];
    if (target) {
      await login(target.email);
    }
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        switchPersona,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
