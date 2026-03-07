import { Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EmailTemplateType, EmailStatus } from '@/types';

const TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  registration_request: '회원가입 신청',
  approval_complete: '승인 완료',
  approval_rejected: '승인 거부',
  settlement_uploaded: '정산서 업로드',
  password_reset: '비밀번호 재설정',
  mail_merge: '메일머지',
};

const STATUS_LABELS: Record<EmailStatus, string> = {
  pending: '대기중',
  sent: '발송됨',
  failed: '실패',
};

export type DatePreset = '7d' | '30d' | '90d' | 'all';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
  { value: 'all', label: '전체 기간' },
];

export function getStartDate(preset: DatePreset): string | undefined {
  if (preset === 'all') return undefined;
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function getDatePresetLabel(preset: DatePreset): string | undefined {
  return DATE_PRESETS.find((p) => p.value === preset)?.label;
}

interface EmailFiltersProps {
  datePreset: DatePreset;
  filterType: string;
  filterStatus: string;
  onDatePresetChange: (value: DatePreset) => void;
  onFilterTypeChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
}

export function EmailFilters({
  datePreset,
  filterType,
  filterStatus,
  onDatePresetChange,
  onFilterTypeChange,
  onFilterStatusChange,
}: EmailFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          필터
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 items-end">
        {/* 날짜 프리셋 */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            기간
          </p>
          <div className="flex gap-1">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={datePreset === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDatePresetChange(preset.value)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 템플릿 유형 */}
        <div className="w-44">
          <p className="text-xs text-muted-foreground mb-1.5">유형</p>
          <Select value={filterType} onValueChange={onFilterTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="템플릿 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 상태 */}
        <div className="w-36">
          <p className="text-xs text-muted-foreground mb-1.5">상태</p>
          <Select value={filterStatus} onValueChange={onFilterStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
