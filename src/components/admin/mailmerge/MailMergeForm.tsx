import { Users, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AVAILABLE_VARIABLES, type EmailSection, type SectionId } from '@/hooks/mailmerge';

// ─── Props ──────────────────────────────────────────────

interface RecipientCardProps {
  recipientType: 'all' | 'year_month';
  setRecipientType: (v: 'all' | 'year_month') => void;
  selectedYearMonth: string;
  setSelectedYearMonth: (v: string) => void;
  includeSettlementTable: boolean;
  setIncludeSettlementTable: (v: boolean) => void;
  sections: EmailSection[];
  yearMonthOptions: string[];
  toggleSection: (id: SectionId) => void;
  moveSection: (index: number, direction: 'up' | 'down') => void;
  recipientCount: number | null;
  loadingCount: boolean;
  sending: boolean;
}

interface EmailContentCardProps {
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  insertVariable: (key: string, target: 'subject' | 'body') => void;
  sending: boolean;
}

// ─── 수신 대상 카드 ─────────────────────────────────────

export function RecipientCard({
  recipientType,
  setRecipientType,
  selectedYearMonth,
  setSelectedYearMonth,
  includeSettlementTable,
  setIncludeSettlementTable,
  sections,
  yearMonthOptions,
  toggleSection,
  moveSection,
  recipientCount,
  loadingCount,
  sending,
}: RecipientCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          수신 대상 선택
          {recipientCount !== null && (
            <Badge variant="secondary" className="ml-2">
              {loadingCount ? '...' : `${recipientCount}개 업체`}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>이메일을 받을 업체를 선택하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={recipientType} onValueChange={(v) => setRecipientType(v as 'all' | 'year_month')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">전체 승인된 업체</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="year_month" id="year_month" />
            <Label htmlFor="year_month">특정 정산월 데이터가 있는 업체</Label>
          </div>
        </RadioGroup>

        {recipientType === 'year_month' && (
          <div className="ml-6 space-y-3">
            <Select value={selectedYearMonth} onValueChange={setSelectedYearMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="정산월 선택" />
              </SelectTrigger>
              <SelectContent>
                {yearMonthOptions.map(ym => (
                  <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedYearMonth && (
              <div className="flex items-center space-x-2 rounded-lg border px-3 py-2 bg-muted/30">
                <Checkbox
                  id="includeSettlementTable"
                  checked={includeSettlementTable}
                  onCheckedChange={(checked) => setIncludeSettlementTable(checked === true)}
                  disabled={sending}
                />
                <Label htmlFor="includeSettlementTable" className="text-sm font-medium cursor-pointer">
                  정산서 상세 데이터 포함
                </Label>
                <span className="text-xs text-muted-foreground">
                  (각 업체별 정산 데이터가 이메일에 첨부됩니다)
                </span>
              </div>
            )}

            {/* Section order management */}
            {includeSettlementTable && (
              <div className="rounded-lg border bg-background p-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">이메일 구성 순서 (드래그 또는 화살표로 변경)</p>
                <div className="space-y-1">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-background hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={section.enabled}
                        onCheckedChange={() => toggleSection(section.id)}
                        disabled={sending}
                      />
                      <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                      <span className={`text-sm flex-1 ${!section.enabled ? 'text-muted-foreground line-through' : ''}`}>
                        {section.label}
                      </span>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0 || sending}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === sections.length - 1 || sending}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 메일 작성 카드 ─────────────────────────────────────

export function EmailContentCard({
  subject,
  setSubject,
  body,
  setBody,
  insertVariable,
  sending,
}: EmailContentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">메일 작성</CardTitle>
        <CardDescription>제목과 내용을 작성하세요. 변수를 사용하면 각 업체에 맞게 치환됩니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">제목</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="이메일 제목" disabled={sending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">내용</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="이메일 내용" rows={12} className="font-mono text-sm" disabled={sending} />
        </div>
        <div className="space-y-2">
          <Label>사용 가능한 변수</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VARIABLES.map(v => (
              <Badge key={v.key} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => !sending && insertVariable(v.key, 'body')}>
                {`{{${v.key}}}`}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">클릭하면 내용에 변수가 추가됩니다.</p>
        </div>
      </CardContent>
    </Card>
  );
}
