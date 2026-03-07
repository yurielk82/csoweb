'use client';

import {
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
import { StatusRow } from './StatusRow';
import type { SystemStatus } from '@/types';

interface SystemCardsProps {
  status: SystemStatus;
}

export function AppInfoCard({ status }: SystemCardsProps) {
  return (
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
        <StatusRow label="환경" value={status.environment} ok={status.environment === 'Production'} />
        <StatusRow label="Next.js" value={status.next_version} isText />
        <StatusRow label="Node.js" value={status.node_version} isText last />
      </CardContent>
    </Card>
  );
}

export function DeployCard({ status }: SystemCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          배포
        </CardTitle>
        <CardDescription>배포 플랫폼 및 URL 정보</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        <StatusRow label="플랫폼" value={status.deploy_platform} ok={status.deploy_platform !== 'Unknown'} />
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
  );
}

export function DatabaseCard({ status }: SystemCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          데이터베이스
        </CardTitle>
        <CardDescription>Supabase 연결 상태</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        <StatusRow label="Supabase" value={status.supabase ? '연결됨' : '미연결'} ok={status.supabase} last />
      </CardContent>
    </Card>
  );
}

export function ExternalApiCard({ status }: SystemCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          외부 API
        </CardTitle>
        <CardDescription>외부 서비스 API 키 설정 상태</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        <StatusRow icon={FileText} label="국세청 API" value={status.nts_api ? '설정됨' : '미설정'} ok={status.nts_api} />
        <StatusRow icon={Building2} label="심평원 병원정보 API" value={status.hira_hospital_api ? '설정됨' : '미설정'} ok={status.hira_hospital_api} />
        <StatusRow icon={Pill} label="심평원 약국정보 API" value={status.hira_pharmacy_api ? '설정됨' : '미설정'} ok={status.hira_pharmacy_api} last />
      </CardContent>
    </Card>
  );
}

export function AuthCard({ status }: SystemCardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          인증
        </CardTitle>
        <CardDescription>JWT 토큰 설정 상태</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0">
        <StatusRow label="JWT Secret" value={status.jwt_configured ? '설정됨' : '미설정'} ok={status.jwt_configured} last />
      </CardContent>
    </Card>
  );
}

export function EmailServiceCard({ status }: SystemCardsProps) {
  return (
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
  );
}
