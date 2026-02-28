'use client';

import { useState, useEffect } from 'react';
import {
  Monitor,
  Loader2,
  Tag,
  Globe,
  Database,
  FileText,
  Building2,
  Pill,
  Mail,
  Shield,
  Rocket,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SystemStatus } from '@/types';

export default function SystemInfoPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetch('/api/system/status')
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setStatus(result.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            시스템 정보
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </h1>
          <p className="text-muted-foreground">시스템 구성 및 연결 상태를 확인합니다.</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            시스템 정보
          </h1>
          <p className="text-sm text-red-600">시스템 상태를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-6 w-6" />
          시스템 정보
        </h1>
        <p className="text-muted-foreground">시스템 구성 및 연결 상태를 확인합니다. (읽기전용)</p>
      </div>

      {/* 앱 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            앱 정보
          </CardTitle>
          <CardDescription>애플리케이션 버전 및 런타임 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatusRow label="버전" value={status.version} isText />
          <StatusRow
            label="환경"
            value={status.environment}
            ok={status.environment === 'Production'}
          />
          <StatusRow label="Next.js" value={status.next_version} isText />
          <StatusRow label="Node.js" value={status.node_version} isText last />
        </CardContent>
      </Card>

      {/* 배포 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            배포
          </CardTitle>
          <CardDescription>배포 플랫폼 및 URL 정보</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatusRow
            label="플랫폼"
            value={status.deploy_platform}
            ok={status.deploy_platform !== 'Unknown'}
          />
          {status.deploy_url ? (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                배포 URL
              </span>
              <a
                href={status.deploy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-primary hover:underline"
              >
                {status.deploy_url}
              </a>
            </div>
          ) : (
            <StatusRow label="배포 URL" value="미설정" ok={false} last />
          )}
        </CardContent>
      </Card>

      {/* 데이터베이스 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            데이터베이스
          </CardTitle>
          <CardDescription>Supabase 연결 상태</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatusRow
            label="Supabase"
            value={status.supabase ? '연결됨' : '미연결'}
            ok={status.supabase}
            last
          />
        </CardContent>
      </Card>

      {/* 외부 API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            외부 API
          </CardTitle>
          <CardDescription>외부 서비스 API 키 설정 상태</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatusRow
            icon={FileText}
            label="국세청 API"
            value={status.nts_api ? '설정됨' : '미설정'}
            ok={status.nts_api}
          />
          <StatusRow
            icon={Building2}
            label="심평원 병원정보 API"
            value={status.hira_hospital_api ? '설정됨' : '미설정'}
            ok={status.hira_hospital_api}
          />
          <StatusRow
            icon={Pill}
            label="심평원 약국정보 API"
            value={status.hira_pharmacy_api ? '설정됨' : '미설정'}
            ok={status.hira_pharmacy_api}
            last
          />
        </CardContent>
      </Card>

      {/* 인증 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            인증
          </CardTitle>
          <CardDescription>JWT 토큰 설정 상태</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatusRow
            label="JWT Secret"
            value={status.jwt_configured ? '설정됨' : '미설정'}
            ok={status.jwt_configured}
            last
          />
        </CardContent>
      </Card>

      {/* 이메일 서비스 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            이메일 서비스
          </CardTitle>
          <CardDescription>이메일 발송 프로바이더 상태</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex items-center justify-between py-2.5 border-b">
            <span className="text-sm text-muted-foreground">활성 프로바이더</span>
            <span className="text-sm font-medium">
              {status.email_provider === 'smtp' ? 'SMTP' : 'Resend'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b">
            <span className="text-sm text-muted-foreground">Resend</span>
            <Badge variant={status.resend ? 'default' : 'secondary'}>
              {status.resend ? '설정됨' : '미설정'}
              {status.email_provider === 'resend' && status.resend && ' (활성)'}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">SMTP</span>
            <div className="flex items-center gap-2">
              <Badge variant={status.smtp.configured ? 'default' : 'secondary'}>
                {status.smtp.configured ? '설정됨' : '미설정'}
                {status.email_provider === 'smtp' && status.smtp.configured && ' (활성)'}
              </Badge>
              {status.smtp.host && (
                <span className="text-xs text-muted-foreground font-mono">{status.smtp.host}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  ok,
  isText,
  last,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  ok?: boolean;
  isText?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? '' : 'border-b'}`}>
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      {isText ? (
        <span className="text-sm font-medium font-mono">{value}</span>
      ) : (
        <Badge variant={ok ? 'default' : 'secondary'}>{value}</Badge>
      )}
    </div>
  );
}
