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
  Tag,
  FileText,
  Building2,
  Pill,
  Globe
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
        <div>
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            ))}
          </div>
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

      {/* System Info */}
      <div>
        <h2 className="text-lg font-semibold mb-4">시스템 정보</h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-slate-400" />
            <span className="text-muted-foreground">버전</span>
            <span className="font-medium font-mono">{systemStatus.version}</span>
          </div>

          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            <span className="text-muted-foreground">데이터베이스</span>
            <Badge variant={systemStatus.supabase ? 'default' : 'secondary'}>
              {systemStatus.supabase ? '연결됨' : '미연결'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span className="text-muted-foreground">국세청 API</span>
            <Badge variant={systemStatus.nts_api ? 'default' : 'secondary'}>
              {systemStatus.nts_api ? '설정됨' : '미설정'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sky-400" />
            <span className="text-muted-foreground">심평원 병원</span>
            <Badge variant={systemStatus.hira_hospital_api ? 'default' : 'secondary'}>
              {systemStatus.hira_hospital_api ? '설정됨' : '미설정'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-teal-400" />
            <span className="text-muted-foreground">심평원 약국</span>
            <Badge variant={systemStatus.hira_pharmacy_api ? 'default' : 'secondary'}>
              {systemStatus.hira_pharmacy_api ? '설정됨' : '미설정'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-400" />
            <span className="text-muted-foreground">환경</span>
            <Badge variant={systemStatus.environment === 'Production' ? 'default' : 'outline'}>
              {systemStatus.environment}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-orange-400" />
            <span className="text-muted-foreground">이메일</span>
            {activeProvider === 'smtp' ? (
              <>
                <Badge variant={systemStatus.smtp.configured ? 'default' : 'secondary'}>SMTP</Badge>
                {systemStatus.resend && <Badge variant="outline">Resend</Badge>}
              </>
            ) : (
              <>
                <Badge variant={systemStatus.resend ? 'default' : 'secondary'}>Resend</Badge>
                {systemStatus.smtp.configured && <Badge variant="outline">SMTP</Badge>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
