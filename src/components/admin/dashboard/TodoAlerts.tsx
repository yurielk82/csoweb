'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Upload, Users, Link2, Mail, AlertTriangle } from 'lucide-react';

interface TodoAlertsProps {
  currentMonthUploaded: boolean;
  pendingCount: number;
  unmappedCount: number;
  emailNeeded: boolean;
}

export const TodoAlerts = memo(function TodoAlerts({
  currentMonthUploaded,
  pendingCount,
  unmappedCount,
  emailNeeded,
}: TodoAlertsProps) {
  const items: { href: string; icon: typeof Upload; label: string; iconColor: string }[] = [];

  if (!currentMonthUploaded) {
    items.push({ href: '/admin/upload', icon: Upload, label: '이번 달 정산서 업로드 필요', iconColor: 'glass-icon-blue' });
  }
  if (pendingCount > 0) {
    items.push({ href: '/admin/members?filter=pending', icon: Users, label: `회원 승인 대기 ${pendingCount}명`, iconColor: 'glass-icon-green' });
  }
  if (unmappedCount > 0) {
    items.push({ href: '/admin/integrity', icon: Link2, label: `CSO 미매칭 ${unmappedCount}건`, iconColor: 'glass-icon-cyan' });
  }
  if (emailNeeded) {
    items.push({ href: '/admin/mailmerge', icon: Mail, label: '이메일 발송 필요', iconColor: 'glass-icon-purple' });
  }

  if (items.length === 0) return null;

  return (
    <div className="glass-chart-card border-warning/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold">할 일</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            <item.icon className={`h-4 w-4 ${item.iconColor}`} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
});
