import { useState, useEffect } from 'react';
import { API_ROUTES } from '@/constants/api';
import type { SystemStatus } from '@/types';

/** 시스템 정보 페이지 데이터 페칭 */
export function useSystemStatus() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetch(API_ROUTES.SYSTEM.STATUS)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setStatus(result.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { loading, status };
}
