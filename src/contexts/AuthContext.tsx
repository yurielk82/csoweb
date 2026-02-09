'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  useMemo,
  type ReactNode 
} from 'react';
import type { UserSession } from '@/types';

// ============================================
// Constants
// ============================================
const STORAGE_KEY = 'cso_auth_user';

// ============================================
// Types
// ============================================
interface AuthContextValue {
  /** 현재 로그인한 사용자 정보 (null이면 미로그인) */
  user: UserSession | null;
  /** 클라이언트 마운트 완료 여부 (Hydration 안전) */
  isMounted: boolean;
  /** 로그인 상태 여부 */
  isAuthenticated: boolean;
  /** 로그인 성공 시 호출 - 상태 업데이트 + localStorage 저장 */
  setUser: (user: UserSession) => void;
  /** 사용자 정보 부분 업데이트 (회원정보 수정 시) */
  updateUser: (updates: Partial<UserSession>) => void;
  /** 로그아웃 시 호출 - 상태 초기화 + localStorage 삭제 */
  clearUser: () => void;
}

// ============================================
// Context
// ============================================
const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// Helper: localStorage 안전하게 접근
// ============================================
function getStoredUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as UserSession;
    // 필수 필드 검증
    if (parsed.id && parsed.business_number && parsed.company_name) {
      return parsed;
    }
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveStoredUser(user: UserSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save user to localStorage:', e);
  }
}

function removeStoredUser(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to remove user from localStorage:', e);
  }
}

// ============================================
// Provider
// ============================================
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // SSR에서는 null로 시작 (Hydration 일치)
  const [user, setUserState] = useState<UserSession | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트 마운트 시 localStorage에서 복원
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUserState(storedUser);
    }
    setIsMounted(true);
  }, []);

  // 로그인 성공 시 호출
  const setUser = useCallback((newUser: UserSession) => {
    setUserState(newUser);
    saveStoredUser(newUser);
  }, []);

  // 사용자 정보 부분 업데이트 (회원정보 수정 등)
  const updateUser = useCallback((updates: Partial<UserSession>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveStoredUser(updated);
      return updated;
    });
  }, []);

  // 로그아웃 시 호출
  const clearUser = useCallback(() => {
    setUserState(null);
    removeStoredUser();
  }, []);

  // Context value 메모이제이션
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isMounted,
    isAuthenticated: !!user,
    setUser,
    updateUser,
    clearUser,
  }), [user, isMounted, setUser, updateUser, clearUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Hook
// ============================================
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
