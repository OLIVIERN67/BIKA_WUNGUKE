import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AuthResponse,
  LoginResult,
  RegisterResponse,
  User,
} from '../types';
import * as authService from '../services/auth.service';
import {
  clearToken,
  getToken,
  setToken,
} from '../services/api';
import { changeLanguage, getStoredLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import type { SupportedLanguage } from '../i18n';

/** Applies the account's saved locale unless the user has chosen a different one on this device. */
function syncLocaleFromUser(user: User | null): void {
  if (!user?.locale) return;
  const locale = String(user.locale).slice(0, 2).toLowerCase();
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(locale)) return;
  // The stored choice wins if the user has explicitly picked a language on this device;
  // otherwise adopt the account locale.
  const stored = getStoredLanguage();
  if (stored !== locale && !localStorage.getItem('bika_wunguke_lang')) {
    changeLanguage(locale as SupportedLanguage);
  }
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<LoginResult>;
  verifyEmail: (payload: authService.VerifyEmailPayload) => Promise<void>;
  register: (payload: authService.RegisterPayload) => Promise<RegisterResponse>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await authService.getMe();
      setUser(me);
      syncLocaleFromUser(me);
    } catch (error) {
      // Only an explicit rejection from the API means the session is dead.
      // A network/server failure keeps the token so a flaky connection does
      // not silently sign the user out.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) {
        clearToken();
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setIsLoading(false);
    })();
  }, [refresh]);

  const handleAuth = useCallback((result: AuthResponse) => {
    setToken(result.token);
    setUser(result.user);
    syncLocaleFromUser(result.user);
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      const result = await authService.login({ phone, password });
      // Only a fully authenticated response (with a token) starts a session.
      // A `verificationRequired` result leaves the user signed out so the OTP
      // screen can be shown instead.
      if ('token' in result) {
        handleAuth(result);
      }
      return result;
    },
    [handleAuth],
  );

  const verifyEmail = useCallback(
    async (payload: authService.VerifyEmailPayload) => {
      const result = await authService.verifyEmail(payload);
      handleAuth(result);
    },
    [handleAuth],
  );

  const register = useCallback(
    async (payload: authService.RegisterPayload) => {
      // Registration no longer issues a session; the account must first be
      // activated by verifying the emailed OTP.
      return authService.register(payload);
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => setUser(next), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      verifyEmail,
      register,
      logout,
      refresh,
      updateUser,
    }),
    [user, isLoading, login, verifyEmail, register, logout, refresh, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
