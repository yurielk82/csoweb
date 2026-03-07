'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemStatus } from '@/types';

interface EmailSystemBarProps {
  emailStats: { total: number; sent: number; failed: number; pending: number } | null;
  systemLoaded: boolean;
  systemStatus: SystemStatus;
  activeProvider: string;
}

export const EmailSystemBar = memo(function EmailSystemBar({
  emailStats,
  systemLoaded,
  systemStatus,
  activeProvider,
}: EmailSystemBarProps) {
  const emailOk =
    activeProvider === 'smtp'
      ? systemStatus.smtp.configured
      : systemStatus.resend;
  const emailLabel =
    activeProvider === 'smtp'
      ? `SMTP${systemStatus.resend ? '/Resend' : ''}`
      : `Resend${systemStatus.smtp.configured ? '/SMTP' : ''}`;

  const checks = [
    { label: 'DB', ok: systemStatus.supabase },
    { label: '국세청', ok: systemStatus.nts_api },
    { label: '심평원(병원)', ok: systemStatus.hira_hospital_api },
    { label: '심평원(약국)', ok: systemStatus.hira_pharmacy_api },
    { label: emailLabel, ok: emailOk },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Mail className="h-3 w-3" />
        {emailStats ? (
          <span>
            {emailStats.sent.toLocaleString()}건 발송
            {emailStats.failed > 0 && (
              <span className="text-destructive ml-1">
                · 실패 {emailStats.failed}건
              </span>
            )}
          </span>
        ) : (
          <span>이메일 정보 없음</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {systemLoaded ? (
          checks.map(({ label, ok }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={ok ? 'dashboard-status-dot-ok' : 'dashboard-status-dot-fail'} />
              <span className={ok ? '' : 'text-destructive'}>{label}</span>
            </span>
          ))
        ) : (
          <Skeleton className="h-3 w-48" />
        )}
        <Link
          href="/admin/system"
          className="flex items-center gap-0.5 hover:text-foreground transition-colors ml-1"
        >
          상세
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
});
