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
  /** 초기 로딩 완료 여부 (localStorage 확인 완료) */
  isInitialized: boolean;
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
// Provider
// ============================================
interface AuthProviderProps {
  children: ReactNode;
  /** 서버에서 전달받은 초기 사용자 정보 (SSR) */
  initialUser?: UserSession | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUserState] = useState<UserSession | null>(initialUser);
  const [isInitialized, setIsInitialized] = useState(false);

  // 앱 로드 시 localStorage에서 사용자 정보 복원
  useEffect(() => {
    // SSR에서 이미 사용자 정보가 있으면 그대로 사용
    if (initialUser) {
      // localStorage에도 동기화
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialUser));
      } catch (e) {
        console.warn('Failed to sync user to localStorage:', e);
      }
      setIsInitialized(true);
      return;
    }

    // localStorage에서 복원 시도
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserSession;
        // 필수 필드 검증
        if (parsed.id && parsed.business_number && parsed.company_name) {
          setUserState(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to restore user from localStorage:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
    
    setIsInitialized(true);
  }, [initialUser]);

  // 로그인 성공 시 호출
  const setUser = useCallback((newUser: UserSession) => {
    setUserState(newUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.warn('Failed to save user to localStorage:', e);
    }
  }, []);

  // 사용자 정보 부분 업데이트 (회원정보 수정 등)
  const updateUser = useCallback((updates: Partial<UserSession>) => {
    setUserState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update user in localStorage:', e);
      }
      return updated;
    });
  }, []);

  // 로그아웃 시 호출
  const clearUser = useCallback(() => {
    setUserState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to remove user from localStorage:', e);
    }
  }, []);

  // Context value 메모이제이션 (불필요한 리렌더링 방지)
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isInitialized,
    isAuthenticated: !!user,
    setUser,
    updateUser,
    clearUser,
  }), [user, isInitialized, setUser, updateUser, clearUser]);

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

// Optional: 인증 필수 페이지용 Hook (미인증 시 에러)
export function useRequireAuth(): AuthContextValue & { user: UserSession } {
  const auth = useAuth();
  if (!auth.isInitialized) {
    throw new Error('Auth not initialized yet');
  }
  if (!auth.user) {
    throw new Error('User not authenticated');
  }
  return auth as AuthContextValue & { user: UserSession };
}
