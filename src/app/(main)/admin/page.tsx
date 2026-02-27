'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload,
  Users,
  Columns,
  Mail,
  MailPlus,
  TrendingUp,
  Clock,
  AlertCircle,
  Link2,
  Database,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EMAIL_LOG_DEFAULT_LIMIT } from '@/constants/defaults';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  pendingApprovals: number;
  totalUsers: number;
  totalSettlements: number;
  recentEmails: {
    sent: number;
    failed: number;
  };
}

interface SystemStatus {
  supabase: boolean;
  resend: boolean;
  smtp: {
    configured: boolean;
    host: string | null;
  };
  email_provider: string;
  version: string;
  environment: string;
  nts_api: boolean;
  hira_hospital_api: boolean;
  hira_pharmacy_api: boolean;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    totalUsers: 0,
    totalSettlements: 0,
    recentEmails: { sent: 0, failed: 0 },
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    supabase: false,
    resend: false,
    smtp: { configured: false, host: null },
    email_provider: 'resend',
    version: '',
    environment: 'Production',
    nts_api: false,
    hira_hospital_api: false,
    hira_pharmacy_api: false,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // 4개 API 병렬 호출
        const [usersRes, allUsersRes, emailRes, statusRes] = await Promise.all([
          fetch('/api/users?pending=true'),
          fetch('/api/users'),
          fetch(`/api/email/logs?limit=${EMAIL_LOG_DEFAULT_LIMIT}`),
          fetch('/api/system/status'),
        ]);
        const [usersData, allUsersData, emailData, statusData] = await Promise.all([
          usersRes.json(),
          allUsersRes.json(),
          emailRes.json(),
          statusRes.json(),
        ]);
        if (statusData.success) {
          setSystemStatus(statusData.data);
        }

        setStats({
          pendingApprovals: usersData.success ? usersData.data.length : 0,
          totalUsers: allUsersData.success ? allUsersData.data.filter((u: { is_admin: boolean }) => !u.is_admin).length : 0,
          totalSettlements: 0,
          recentEmails: emailData.success ? emailData.data.stats : { sent: 0, failed: 0 },
        });
      } catch (error) {
        console.error('Fetch stats error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const quickActions = [
    {
      href: '/admin/upload',
      icon: Upload,
      title: '정산서 업로드',
      description: '정산서 데이터 업로드',
      color: 'bg-blue-500',
    },
    {
      href: '/admin/integrity',
      icon: Link2,
      title: '거래처 매핑',
      description: 'CSO 관리업체 매칭 상태 검수',
      color: 'bg-red-500',
    },
    {
      href: '/admin/approvals',
      icon: Users,
      title: '회원 승인',
      description: '대기 중인 회원 승인',
      color: 'bg-green-500',
      badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : undefined,
    },
    {
      href: '/admin/data',
      icon: Database,
      title: '데이터 관리',
      description: '정산 데이터 관리',
      color: 'bg-cyan-500',
    },
    {
      href: '/admin/columns',
      icon: Columns,
      title: '컬럼 설정',
      description: '표시 컬럼 관리',
      color: 'bg-purple-500',
    },
    {
      href: '/admin/mailmerge',
      icon: MailPlus,
      title: '메일머지',
      description: '일괄 이메일 발송',
      color: 'bg-orange-500',
    },
    {
      href: '/admin/emails',
      icon: Mail,
      title: '이메일 이력',
      description: '발송 내역 조회',
      color: 'bg-pink-500',
    },
  ];

  const activeProvider = systemStatus.email_provider;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingApprovals > 0 ? '승인이 필요합니다' : '대기 중인 요청 없음'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 업체</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">등록된 업체 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">이메일 발송</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentEmails.sent}</div>
            <p className="text-xs text-muted-foreground">성공적으로 발송됨</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">발송 실패</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.recentEmails.failed}</div>
            <p className="text-xs text-muted-foreground">발송 실패 건수</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    {action.badge && (
                      <Badge variant="destructive">{action.badge}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* System Footer */}
      {(() => {
        const checks = [
          { label: 'DB', ok: systemStatus.supabase },
          { label: '국세청', ok: systemStatus.nts_api },
          { label: '심평원 병원', ok: systemStatus.hira_hospital_api },
          { label: '심평원 약국', ok: systemStatus.hira_pharmacy_api },
          { label: '이메일', ok: activeProvider === 'smtp' ? systemStatus.smtp.configured : systemStatus.resend },
        ];
        const issues = checks.filter(c => !c.ok);

        return (
          <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="font-mono">{systemStatus.version}</span>
              <span>·</span>
              <span>{systemStatus.environment}</span>
              <span>·</span>
              {issues.length === 0 ? (
                <span className="text-green-600">모든 서비스 정상</span>
              ) : (
                <span className="text-red-600">
                  {issues.map(i => i.label).join(', ')} 확인 필요
                </span>
              )}
            </div>
            <Link
              href="/admin/settings#system-info"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              시스템 정보
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        );
      })()}
    </div>
  );
}
