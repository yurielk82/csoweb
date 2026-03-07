'use client';

import { Server, Plug, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_SMTP_PORT } from '@/constants/defaults';
import type { EmailFields } from '@/hooks/useEmailSettings';

const MS_PER_SECOND = 1000;
const MIN_DELAY_SECONDS = 0.5;
const MAX_DELAY_SECONDS = 30;

interface EmailProviderCardProps {
  formData: EmailFields;
  testing: boolean;
  onChange: (field: keyof EmailFields, value: string | number | boolean) => void;
  onBlur: (field: keyof EmailFields) => void;
  onChangeAndSave: (field: keyof EmailFields, value: string | number | boolean) => void;
  onConnectionTest: () => void;
}

export function EmailProviderCard({
  formData,
  testing,
  onChange,
  onBlur,
  onChangeAndSave,
  onConnectionTest,
}: EmailProviderCardProps) {
  const delaySeconds = formData.email_send_delay_ms / MS_PER_SECOND;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Server className="h-4 w-4" />
          이메일 발송 설정
        </CardTitle>
        <CardDescription>이메일 발송에 사용할 프로바이더를 설정합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProviderSelector value={formData.email_provider} onChangeAndSave={onChangeAndSave} />

        {formData.email_provider === 'resend' && (
          <ResendSection
            formData={formData}
            testing={testing}
            onChange={onChange}
            onBlur={onBlur}
            onConnectionTest={onConnectionTest}
          />
        )}

        {formData.email_provider === 'smtp' && (
          <SmtpSection
            formData={formData}
            testing={testing}
            onChange={onChange}
            onBlur={onBlur}
            onChangeAndSave={onChangeAndSave}
            onConnectionTest={onConnectionTest}
          />
        )}

        <SendDelaySection
          delaySeconds={delaySeconds}
          onChange={onChange}
          onBlur={onBlur}
        />

        <TestRecipientSection
          value={formData.test_recipient_email}
          onChange={onChange}
          onBlur={onBlur}
        />
      </CardContent>
    </Card>
  );
}

// ── 내부 서브컴포넌트 ──

function ProviderSelector({
  value,
  onChangeAndSave,
}: {
  value: string;
  onChangeAndSave: (field: keyof EmailFields, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>발송 프로바이더</Label>
      <RadioGroup value={value} onValueChange={(v) => onChangeAndSave('email_provider', v)}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="resend" id="provider-resend" />
          <Label htmlFor="provider-resend" className="cursor-pointer">Resend API</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="smtp" id="provider-smtp" />
          <Label htmlFor="provider-smtp" className="cursor-pointer">SMTP (하이웍스 등)</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function ConnectionTestButton({
  testing,
  onClick,
}: {
  testing: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={testing}>
      {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
      연결 테스트
    </Button>
  );
}

function ResendSection({
  formData,
  testing,
  onChange,
  onBlur,
  onConnectionTest,
}: Pick<EmailProviderCardProps, 'formData' | 'testing' | 'onChange' | 'onBlur' | 'onConnectionTest'>) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Resend 설정</Label>
        <Badge variant="secondary" className="text-xs">활성</Badge>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resend_from_email">발신 이메일</Label>
        <Input
          id="resend_from_email"
          type="email"
          value={formData.resend_from_email}
          onChange={(e) => onChange('resend_from_email', e.target.value)}
          onBlur={() => onBlur('resend_from_email')}
          placeholder="onboarding@resend.dev"
        />
        <p className="text-xs text-muted-foreground">
          비워두면 환경변수(EMAIL_FROM) 또는 기본값(onboarding@resend.dev)을 사용합니다.
        </p>
      </div>
      <ConnectionTestButton testing={testing} onClick={onConnectionTest} />
    </div>
  );
}

type SmtpHandlers = Pick<EmailProviderCardProps, 'onChange' | 'onBlur' | 'onChangeAndSave'>;

function SmtpSection({
  formData,
  testing,
  onChange,
  onBlur,
  onChangeAndSave,
  onConnectionTest,
}: Pick<EmailProviderCardProps, 'formData' | 'testing' | 'onChange' | 'onBlur' | 'onChangeAndSave' | 'onConnectionTest'>) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">SMTP 설정</Label>
        <Badge variant="secondary" className="text-xs">활성</Badge>
      </div>
      <SmtpConnectionFields formData={formData} onChange={onChange} onBlur={onBlur} onChangeAndSave={onChangeAndSave} />
      <SmtpCredentialFields formData={formData} onChange={onChange} onBlur={onBlur} />
      <SmtpSenderFields formData={formData} onChange={onChange} onBlur={onBlur} />
      <ConnectionTestButton testing={testing} onClick={onConnectionTest} />
    </div>
  );
}

function SmtpConnectionFields({
  formData, onChange, onBlur, onChangeAndSave,
}: Pick<EmailProviderCardProps, 'formData'> & SmtpHandlers) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="smtp_host">SMTP 호스트</Label>
        <Input
          id="smtp_host"
          value={formData.smtp_host}
          onChange={(e) => onChange('smtp_host', e.target.value)}
          onBlur={() => onBlur('smtp_host')}
          placeholder="smtps.hiworks.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="smtp_port">포트</Label>
        <div className="flex items-center gap-3">
          <Input
            id="smtp_port"
            type="number"
            value={formData.smtp_port}
            onChange={(e) => onChange('smtp_port', parseInt(e.target.value) || DEFAULT_SMTP_PORT)}
            onBlur={() => onBlur('smtp_port')}
            className="w-24"
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              id="smtp_secure"
              checked={formData.smtp_secure}
              onCheckedChange={(checked) => onChangeAndSave('smtp_secure', !!checked)}
            />
            <Label htmlFor="smtp_secure" className="text-sm cursor-pointer">SSL/TLS</Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmtpCredentialFields({
  formData, onChange, onBlur,
}: Pick<EmailProviderCardProps, 'formData' | 'onChange' | 'onBlur'>) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="smtp_user">계정</Label>
        <Input
          id="smtp_user"
          value={formData.smtp_user}
          onChange={(e) => onChange('smtp_user', e.target.value)}
          onBlur={() => onBlur('smtp_user')}
          placeholder="user@company.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="smtp_password">비밀번호</Label>
        <Input
          id="smtp_password"
          type="password"
          value={formData.smtp_password}
          onChange={(e) => onChange('smtp_password', e.target.value)}
          onBlur={() => onBlur('smtp_password')}
          placeholder="비밀번호 입력"
        />
      </div>
    </>
  );
}

function SmtpSenderFields({
  formData, onChange, onBlur,
}: Pick<EmailProviderCardProps, 'formData' | 'onChange' | 'onBlur'>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="smtp_from_name">발신자명</Label>
        <Input
          id="smtp_from_name"
          value={formData.smtp_from_name}
          onChange={(e) => onChange('smtp_from_name', e.target.value)}
          onBlur={() => onBlur('smtp_from_name')}
          placeholder="CSO 정산서 포털"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="smtp_from_email">발신 이메일</Label>
        <Input
          id="smtp_from_email"
          value={formData.smtp_from_email}
          onChange={(e) => onChange('smtp_from_email', e.target.value)}
          onBlur={() => onBlur('smtp_from_email')}
          placeholder="noreply@company.com"
        />
      </div>
    </div>
  );
}

function SendDelaySection({
  delaySeconds,
  onChange,
  onBlur,
}: {
  delaySeconds: number;
  onChange: (field: keyof EmailFields, value: number) => void;
  onBlur: (field: keyof EmailFields) => void;
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      <Label htmlFor="email_send_delay">일괄 발송 지연 (초)</Label>
      <div className="flex items-center gap-3">
        <Input
          id="email_send_delay"
          type="number"
          min={MIN_DELAY_SECONDS}
          max={MAX_DELAY_SECONDS}
          step={MIN_DELAY_SECONDS}
          value={delaySeconds}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
              const clamped = Math.max(MIN_DELAY_SECONDS, Math.min(MAX_DELAY_SECONDS, val));
              onChange('email_send_delay_ms', Math.round(clamped * MS_PER_SECOND));
            }
          }}
          onBlur={() => onBlur('email_send_delay_ms')}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">초 (0.5~30)</span>
      </div>
      <p className="text-xs text-muted-foreground">
        스팸 필터 방지를 위해 최소 6초를 권장합니다.
      </p>
    </div>
  );
}

function TestRecipientSection({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (field: keyof EmailFields, value: string) => void;
  onBlur: (field: keyof EmailFields) => void;
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      <Label htmlFor="test_recipient_email">테스트 수신 이메일</Label>
      <Input
        id="test_recipient_email"
        type="email"
        value={value}
        onChange={(e) => onChange('test_recipient_email', e.target.value)}
        onBlur={() => onBlur('test_recipient_email')}
        placeholder="test@example.com"
      />
      <p className="text-xs text-muted-foreground">
        연결 테스트 및 메일머지 테스트 발송 시 사용할 수신자 이메일입니다. 비워두면 로그인된 관리자의 이메일로 발송됩니다.
      </p>
    </div>
  );
}
