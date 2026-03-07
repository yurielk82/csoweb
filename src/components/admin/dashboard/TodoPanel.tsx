'use client';

import { memo } from 'react';
import Link from 'next/link';
import {
  Upload,
  Users,
  Link2,
  ListTodo,
  CheckCircle2,
  Database,
  Mail,
  ArrowRight,
} from 'lucide-react';

interface TodoItem {
  href: string;
  icon: typeof Upload;
  label: string;
  iconColor: string;
  count?: number;
  suffix?: string;
}

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
  const items: TodoItem[] = [];

  if (!currentMonthUploaded) {
    items.push({ href: '/admin/upload', icon: Upload, label: '정산서 업로드 필요', iconColor: 'glass-icon-blue' });
  }
  if (pendingCount > 0) {
    items.push({ href: '/admin/members?filter=pending', icon: Users, label: '승인 대기', iconColor: 'glass-icon-green', count: pendingCount, suffix: '명' });
  }
  if (unmappedCount > 0) {
    items.push({ href: '/admin/integrity', icon: Link2, label: 'CSO 미매칭', iconColor: 'glass-icon-cyan', count: unmappedCount, suffix: '건' });
  }

  return (
    <div className="glass-kpi-card flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-3">
        {items.length > 0 ? (
          <>
            <ListTodo className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">할 일</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-muted-foreground">처리 완료</span>
          </>
        )}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 py-2.5 px-3 text-sm font-medium text-foreground rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              <item.icon className={`h-5 w-5 shrink-0 ${item.iconColor}`} />
              <span className="truncate">{item.label}</span>
              {item.count != null && (
                <span className="ml-auto text-xs font-semibold bg-primary/20 rounded-full px-2 py-0.5">
                  {item.count}{item.suffix}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">처리할 항목 없음</p>
      )}

      {/* 빠른 이동 */}
      <div className="mt-4 pt-3 border-t border-border/40">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">빠른 이동</span>
        <div className="flex flex-col gap-1 mt-2">
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
              className="flex items-center gap-2 py-2.5 px-3 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <nav.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{nav.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});
