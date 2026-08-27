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
  switchPersona: (emailOrRole: string) => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface DemoPersona {
  id: string;
  email: string;
  name: string;
  role: Role;
  desc: string;
}

// Active user personas for switcher
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'madhavi',
    email: 'madhavi.singh@ethxsoftcon.com',
    name: 'Madhavi Singh',
    role: 'HR_RECRUITER',
    desc: 'HR Recruiter • Full access to entire platform & WhatsApp outreach',
  },
  {
    id: 'niky',
    email: 'niky.sharma@ethxsoftcon.com',
    name: 'Niky Sharma',
    role: 'HR_RECRUITER',
    desc: 'HR Recruiter • Full access to entire platform & WhatsApp outreach',
  },
  {
    id: 'admin',
    email: 'admin@recruitflow.com',
    name: 'System Administrator',
    role: 'SUPER_ADMIN',
    desc: 'Super Admin • Full access to all tenants & configurations',
  },
];

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

  const switchPersona = async (emailOrRole: string) => {
    const target = DEMO_PERSONAS.find((p) => p.email === emailOrRole || p.role === emailOrRole);
    if (target) {
      const p = target.email === 'admin@recruitflow.com' ? 'AdminPassword123!' : 'Password123!';
      await login(target.email, p);
    }
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'HR_RECRUITER') return true;
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
