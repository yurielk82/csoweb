'use client';

import { BellRing } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { EmailNotifications } from '@/domain/company/types';

const EMAIL_NOTIFICATION_LABELS: Record<string, { label: string; description: string }> = {
  registration_request: { label: '회원가입 신청 알림', description: '새 회원가입 신청 시 관리자에게 이메일 발송' },
  approval_complete: { label: '가입 승인 알림', description: '관리자가 가입을 승인하면 사용자에게 이메일 발송' },
  approval_rejected: { label: '가입 거부 알림', description: '관리자가 가입을 거부하면 사용자에게 이메일 발송' },
  settlement_uploaded: { label: '정산서 업로드 알림', description: '정산서 업로드 시 해당 업체에 이메일 발송' },
  password_reset: { label: '비밀번호 재설정', description: '비밀번호 재설정 요청 시 사용자에게 이메일 발송' },
};

interface EmailNotificationsCardProps {
  notifications: EmailNotifications;
  onToggle: (key: string, checked: boolean) => void;
}

export function EmailNotificationsCard({ notifications, onToggle }: EmailNotificationsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-4 w-4" />
          이메일 알림 설정
        </CardTitle>
        <CardDescription>
          이메일 유형별로 발송 여부를 설정합니다. 비활성화하면 해당 유형의 이메일이 발송되지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {Object.entries(EMAIL_NOTIFICATION_LABELS).map(([key, { label, description }]) => (
          <div key={key} className="flex items-start space-x-3 py-3 border-b last:border-b-0">
            <Checkbox
              id={`notif-${key}`}
              checked={notifications[key as keyof EmailNotifications]}
              onCheckedChange={(checked) => onToggle(key, !!checked)}
            />
            <div className="space-y-0.5 leading-none">
              <Label htmlFor={`notif-${key}`} className="text-sm font-medium cursor-pointer">
                {label}
              </Label>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-3">
          메일머지(수동 발송)는 항상 발송되며, 이 설정의 영향을 받지 않습니다.
        </p>
      </CardContent>
    </Card>
  );
}
