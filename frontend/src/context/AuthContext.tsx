'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, setAccessToken } from '../lib/api';
import type { HostProfile } from '../types/host';
import { getEffectivePermissions, type AdminRole, type Permission } from '../types/admin';

function enrichUser(u: User | null): User | null {
  if (!u) return null;
  if (u.role === 'ADMIN' && (!u.permissions || u.permissions.length === 0)) {
    return {
      ...u,
      permissions: getEffectivePermissions(u),
    };
  }
  return u;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  adminRole?: AdminRole | null;
  permissions?: Permission[];
  /** Profile picture URL (e.g. the Google account photo). */
  avatar?: string | null;
  createdAt?: string;
  hostProfile?: HostProfile | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setHostProfile: (profile: HostProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async (): Promise<User | null> => {
    try {
      // First attempt to get active user using stored token or silent refresh
      const userData = await apiFetch<User>('/auth/me');
      const enriched = enrichUser(userData);
      setUser(enriched);
      return enriched;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await apiFetch<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    setAccessToken(response.accessToken);
    const enriched = enrichUser(response.user);
    setUser(enriched);
    return enriched as User;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
      skipAuth: true,
    });
    // Auto-login after registration
    return await login(email, password);
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const setHostProfile = (profile: HostProfile | null) => {
    setUser((prev) => (prev ? { ...prev, hostProfile: profile } : null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setHostProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
