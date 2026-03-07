'use client';

import { memo } from 'react';
import Link from 'next/link';
import {
  Upload,
  Users,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Database,
  Mail,
  ArrowRight,
} from 'lucide-react';

interface TodoPanelProps {
  currentMonthUploaded: boolean;
  pendingCount: number;
  unmappedCount: number;
}

export const TodoPanel = memo(function TodoPanel({
  currentMonthUploaded,
  pendingCount,
  unmappedCount,
}: TodoPanelProps) {
  const items: { href: string; icon: typeof Upload; label: string; iconColor: string }[] = [];

  if (!currentMonthUploaded) {
    items.push({ href: '/admin/upload', icon: Upload, label: '정산서 업로드 필요', iconColor: 'glass-icon-blue' });
  }
  if (pendingCount > 0) {
    items.push({ href: '/admin/members?filter=pending', icon: Users, label: `승인 대기 ${pendingCount}명`, iconColor: 'glass-icon-green' });
  }
  if (unmappedCount > 0) {
    items.push({ href: '/admin/integrity', icon: Link2, label: `CSO 미매칭 ${unmappedCount}건`, iconColor: 'glass-icon-cyan' });
  }

  return (
    <div className="glass-kpi-card flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-2">
        {items.length > 0 ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-semibold">할 일</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-semibold text-muted-foreground">처리 완료</span>
          </>
        )}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <item.icon className={`h-3 w-3 shrink-0 ${item.iconColor}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">처리할 항목 없음</p>
      )}

      {/* 빠른 이동 */}
      <div className="mt-auto pt-3 border-t border-border/40">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">빠른 이동</span>
        <div className="flex flex-col gap-1 mt-1.5">
          {[
            { href: '/admin/upload', icon: Upload, label: '업로드' },
            { href: '/admin/members', icon: Users, label: '회원관리' },
            { href: '/admin/data', icon: Database, label: '데이터' },
            { href: '/admin/mailmerge', icon: Mail, label: '메일머지' },
            { href: '/admin/emails', icon: ArrowRight, label: '이메일 이력' },
          ].map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <nav.icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{nav.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});
