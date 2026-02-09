'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserSession } from '@/types';

interface AuthSyncProps {
  /** 서버에서 가져온 세션 정보 */
  serverSession: UserSession;
}

/**
 * SSR에서 가져온 세션 정보를 AuthContext에 동기화하는 컴포넌트
 * - (main) layout에서 사용
 * - 서버 세션이 있으면 클라이언트 상태에 반영
 * - 중복 동기화 방지를 위해 ref 사용
 */
export function AuthSync({ serverSession }: AuthSyncProps) {
  const { user, setUser, isInitialized } = useAuth();
  const hasSynced = useRef(false);

  useEffect(() => {
    // 이미 동기화했으면 스킵
    if (hasSynced.current) return;
    
    // 초기화 완료 후에만 동기화
    if (!isInitialized) return;

    // 서버 세션이 있고, 클라이언트 상태와 다르면 동기화
    if (serverSession) {
      // 사용자 ID가 다르거나 클라이언트에 user가 없으면 동기화
      if (!user || user.id !== serverSession.id) {
        setUser(serverSession);
      }
      hasSynced.current = true;
    }
  }, [serverSession, user, setUser, isInitialized]);

  // UI 렌더링 없음
  return null;
}
