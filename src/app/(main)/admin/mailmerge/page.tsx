'use client';

import { useState } from 'react';
import { MailPlus, Send, Eye, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Generate year-month options
function generateYearMonthOptions() {
  const options: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push(yearMonth);
  }
  
  return options;
}

const AVAILABLE_VARIABLES = [
  { key: '업체명', description: '업체명' },
  { key: '사업자번호', description: '사업자번호' },
  { key: '이메일', description: '이메일 주소' },
  { key: '정산월', description: '정산 년월' },
  { key: '총_금액', description: '총 금액 (원)' },
  { key: '총_수수료', description: '총 수수료 (원)' },
  { key: '데이터_건수', description: '데이터 건수' },
];

export default function MailMergePage() {
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState<'all' | 'year_month'>('all');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
  const [subject, setSubject] = useState('{{정산월}} 정산 안내 - {{업체명}}');
  const [body, setBody] = useState(`{{업체명}} 담당자님께,

{{정산월}} 정산 내역을 안내드립니다.

▪ 총 금액: {{총_금액}}
▪ 총 수수료: {{총_수수료}}
▪ 데이터 건수: {{데이터_건수}}

자세한 내용은 정산서 포털에서 확인해 주세요.

감사합니다.`);

  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  const yearMonthOptions = generateYearMonthOptions();

  const insertVariable = (key: string, target: 'subject' | 'body') => {
    const variable = `{{${key}}}`;
    if (target === 'subject') {
      setSubject(prev => prev + variable);
    } else {
      setBody(prev => prev + variable);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/email/mailmerge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPreview(data.data);
        setPreviewOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: '미리보기 실패',
          description: data.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '미리보기 생성 중 오류가 발생했습니다.',
      });
    }
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);

    try {
      const recipients = recipientType === 'all' 
        ? ['all'] 
        : [`year_month:${selectedYearMonth}`];

      const response = await fetch('/api/email/mailmerge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients,
          subject,
          body,
          year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        toast({
          title: '발송 완료',
          description: data.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: '발송 실패',
          description: data.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '이메일 발송 중 오류가 발생했습니다.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MailPlus className="h-6 w-6" />
          메일머지
        </h1>
        <p className="text-muted-foreground">업체들에게 개인화된 이메일을 일괄 발송합니다.</p>
      </div>

      {/* Recipient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            수신 대상 선택
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
            <div className="ml-6">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">메일 작성</CardTitle>
          <CardDescription>제목과 내용을 작성하세요. 변수를 사용하면 각 업체에 맞게 치환됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">제목</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="이메일 제목"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">내용</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="이메일 내용"
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {/* Variables */}
          <div className="space-y-2">
            <Label>사용 가능한 변수</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map(v => (
                <Badge
                  key={v.key}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => insertVariable(v.key, 'body')}
                >
                  {`{{${v.key}}}`}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              클릭하면 내용에 변수가 추가됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handlePreview}>
          <Eye className="h-4 w-4 mr-2" />
          미리보기
        </Button>
        <Button 
          onClick={handleSend} 
          disabled={sending || (recipientType === 'year_month' && !selectedYearMonth)}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          발송하기
        </Button>
      </div>

      {/* Result */}
      {result && (
        <Alert variant={result.failed > 0 ? 'destructive' : 'default'}>
          <AlertTitle>발송 결과</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>전체 대상: {result.total}개 업체</p>
              <p className="text-green-600">발송 성공: {result.sent}건</p>
              {result.failed > 0 && (
                <p className="text-red-600">발송 실패: {result.failed}건</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>메일 미리보기</DialogTitle>
            <DialogDescription>
              실제 발송될 이메일의 예시입니다. (샘플 데이터 기준)
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">제목</p>
                <p className="font-medium">{preview.subject}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">내용</p>
                <pre className="whitespace-pre-wrap text-sm">{preview.body}</pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
