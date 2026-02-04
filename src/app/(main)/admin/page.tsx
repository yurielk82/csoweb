'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Upload, 
  Users, 
  Columns, 
  Mail, 
  MailPlus,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  AlertCircle,
  ShieldCheck,
  Database
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/shared/loading';

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
  version: string;
  environment: string;
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
    version: 'v2.0',
    environment: 'Production',
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch pending approvals
        const usersRes = await fetch('/api/users?pending=true');
        const usersData = await usersRes.json();
        
        // Fetch all users
        const allUsersRes = await fetch('/api/users');
        const allUsersData = await allUsersRes.json();
        
        // Fetch email stats
        const emailRes = await fetch('/api/email/logs?limit=100');
        const emailData = await emailRes.json();

        // Fetch system status
        const statusRes = await fetch('/api/system/status');
        const statusData = await statusRes.json();
        if (statusData.success) {
          setSystemStatus(statusData.data);
        }
        
        setStats({
          pendingApprovals: usersData.success ? usersData.data.length : 0,
          totalUsers: allUsersData.success ? allUsersData.data.filter((u: { is_admin: boolean }) => !u.is_admin).length : 0,
          totalSettlements: 0, // Would need separate API
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

  if (loading) {
    return <Loading text="대시보드를 불러오는 중..." />;
  }

  const quickActions = [
    {
      href: '/admin/upload',
      icon: Upload,
      title: '엑셀 업로드',
      description: '정산서 데이터 업로드',
      color: 'bg-blue-500',
    },
    {
      href: '/admin/integrity',
      icon: ShieldCheck,
      title: '무결성 검증',
      description: 'CSO 매칭 상태 검수',
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

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            시스템 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">버전</span>
              <span>{systemStatus.version}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">데이터베이스</span>
              <Badge className={systemStatus.supabase ? 'bg-blue-600' : 'bg-gray-400'}>
                Supabase {systemStatus.supabase ? '연결됨' : '미연결'}
              </Badge>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">이메일 서비스</span>
              <Badge className={systemStatus.resend ? 'bg-blue-600' : 'bg-gray-400'}>
                Resend {systemStatus.resend ? '연결됨' : '미연결'}
              </Badge>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">환경</span>
              <Badge className={systemStatus.environment === 'Production' ? 'bg-blue-600' : 'bg-yellow-500'}>
                {systemStatus.environment}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
