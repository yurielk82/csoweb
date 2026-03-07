import { Calculator, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ColumnStatsBarProps {
  total: number;
  visible: number;
  required: number;
  summary: number;
}

export function ColumnStatsBar({ total, visible, required, summary }: ColumnStatsBarProps) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="text-muted-foreground">전체: <strong>{total}</strong>개</span>
      <span className="text-muted-foreground">표시: <strong>{visible}</strong>개</span>
      <span className="text-muted-foreground">필수: <strong>{required}</strong>개</span>
      <span className="text-blue-600">합계: <strong>{summary}</strong>개</span>
    </div>
  );
}

export function SummaryInfoCard() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-blue-700">
          <Calculator className="h-4 w-4" />월별 합계 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-blue-600">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p><strong>합계</strong> 체크된 컬럼은 사용자의 &quot;월별 합계&quot; 페이지에서 정산월 별로 합산되어 표시됩니다. 숫자형 컬럼(수량, 금액, 수수료 등)만 합계 설정이 가능합니다.</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface BatchActionsCardProps {
  onShowAll: () => void;
  onHideAll: () => void;
  onReset: () => void;
}

export function BatchActionsCard({ onShowAll, onHideAll, onReset }: BatchActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">일괄 작업</CardTitle>
        <CardDescription>드래그로 순서 변경, 체크박스로 표시 여부 설정</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onShowAll}>전체 표시</Button>
        <Button variant="outline" size="sm" onClick={onHideAll}>전체 숨김</Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />기본값 복원
        </Button>
      </CardContent>
    </Card>
  );
}
