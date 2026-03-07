import {
  FileSpreadsheet, Loader2, ArrowRight, AlertTriangle, Check, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ColumnMapping, PreviewData } from '@/hooks/useFileUpload';
import { SUBSTRING_MATCH_SCORE, HIGH_MATCH_SCORE } from '@/constants/defaults';

interface MappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: PreviewData | null;
  mappings: ColumnMapping[];
  requiredColumnsMapped: boolean;
  uploading: boolean;
  onMappingChange: (excelColumn: string, newDbColumn: string) => void;
  onUpload: () => void;
}

export function MappingDialog({
  open, onOpenChange, previewData, mappings,
  requiredColumnsMapped, uploading, onMappingChange, onUpload,
}: MappingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            컬럼 매핑 확인
          </DialogTitle>
          <DialogDescription>
            엑셀 컬럼을 DB 컬럼에 매핑합니다. 자동 매핑된 결과를 확인하고 필요시 수정하세요.
            {previewData && (
              <span className="block mt-1">
                파일: {previewData.fileName} ({previewData.totalRows.toLocaleString()}행)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {previewData && (
          <div className="space-y-4">
            {!requiredColumnsMapped && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>필수 컬럼 누락</AlertTitle>
                <AlertDescription>사업자번호와 정산월 컬럼이 매핑되어야 합니다.</AlertDescription>
              </Alert>
            )}

            <MappingTable mappings={mappings} previewData={previewData} onMappingChange={onMappingChange} />

            {previewData.sampleData.length > 0 && <SampleDataPreview previewData={previewData} />}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={onUpload} disabled={!requiredColumnsMapped || uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            업로드 진행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 매핑 테이블 ---

interface MappingTableProps {
  mappings: ColumnMapping[];
  previewData: PreviewData;
  onMappingChange: (excelColumn: string, newDbColumn: string) => void;
}

function MappingTable({ mappings, previewData, onMappingChange }: MappingTableProps) {
  return (
    <ScrollArea className="h-[300px] border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">엑셀 컬럼</TableHead>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="w-[200px]">DB 컬럼</TableHead>
            <TableHead className="w-[100px]">매칭율</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((mapping) => (
            <TableRow key={mapping.excelColumn}>
              <TableCell className="font-mono text-sm">
                {mapping.excelColumn.replace(/\n/g, ' ')}
              </TableCell>
              <TableCell>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
              <TableCell>
                <Select value={mapping.dbColumn || '_none_'} onValueChange={(value) => onMappingChange(mapping.excelColumn, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">
                      <span className="text-muted-foreground">(매핑 안함)</span>
                    </SelectItem>
                    {previewData.dbColumnOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <ScoreBadge score={mapping.score} hasMapped={!!mapping.dbColumn} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function ScoreBadge({ score, hasMapped }: { score: number; hasMapped: boolean }) {
  if (!hasMapped) {
    return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
  }

  return (
    <Badge
      variant={score >= SUBSTRING_MATCH_SCORE ? 'default' : score >= HIGH_MATCH_SCORE ? 'secondary' : 'outline'}
      className={score >= SUBSTRING_MATCH_SCORE ? 'bg-green-600' : ''}
    >
      {score >= 1 ? <Check className="h-3 w-3 mr-1" /> : null}
      {Math.round(score * 100)}%
    </Badge>
  );
}

// --- 샘플 데이터 미리보기 ---

const MAX_PREVIEW_COLUMNS = 6;

function SampleDataPreview({ previewData }: { previewData: PreviewData }) {
  const visibleColumns = previewData.excelColumns.slice(0, MAX_PREVIEW_COLUMNS);
  const hasMore = previewData.excelColumns.length > MAX_PREVIEW_COLUMNS;

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">샘플 데이터 (처음 {previewData.sampleData.length}행)</h4>
      <ScrollArea className="h-[150px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map(col => (
                <TableHead key={col} className="text-xs whitespace-nowrap">
                  {col.replace(/\n/g, ' ').slice(0, 15)}
                </TableHead>
              ))}
              {hasMore && <TableHead className="text-xs">...</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.sampleData.map((row, idx) => (
              <TableRow key={idx}>
                {visibleColumns.map(col => (
                  <TableCell key={col} className="text-xs">
                    {String(row[col] || '').slice(0, 20)}
                  </TableCell>
                ))}
                {hasMore && <TableCell className="text-xs text-muted-foreground">...</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
