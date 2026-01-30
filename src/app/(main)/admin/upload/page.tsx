'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X, 
  Calendar, 
  Mail, 
  Send,
  ArrowRight,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface UploadResult {
  success: boolean;
  data?: {
    rowCount: number;
    settlementMonths: string[];
    errors?: string[];
  };
  message?: string;
  error?: string;
}

interface ColumnMapping {
  excelColumn: string;
  dbColumn: string | null;
  score: number;
  isRequired: boolean;
}

interface PreviewData {
  fileName: string;
  totalRows: number;
  excelColumns: string[];
  dbColumnOptions: string[];
  mappings: ColumnMapping[];
  sampleData: Record<string, unknown>[];
  missingRequired: string[];
}

export default function UploadPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  
  // 컬럼 매핑 미리보기 상태
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  
  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
      setPreviewData(null);
      setMappings([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  // 컬럼 매핑 미리보기
  const handlePreview = async () => {
    if (!file) return;
    
    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/preview', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.data);
        setMappings(data.data.mappings);
        setShowMappingDialog(true);
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
        description: '파일 미리보기 중 오류가 발생했습니다.',
      });
    } finally {
      setPreviewing(false);
    }
  };

  // 매핑 변경
  const handleMappingChange = (excelColumn: string, newDbColumn: string) => {
    setMappings(prev => prev.map(m => 
      m.excelColumn === excelColumn 
        ? { ...m, dbColumn: newDbColumn === '_none_' ? null : newDbColumn, score: newDbColumn === '_none_' ? 0 : 1 }
        : m
    ));
  };

  // 실제 업로드
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setResult(null);
    setShowMappingDialog(false);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append('file', file);
      
      // 커스텀 매핑 정보 추가
      if (mappings.length > 0) {
        const customMapping: Record<string, string> = {};
        mappings.forEach(m => {
          if (m.dbColumn) {
            customMapping[m.excelColumn] = m.dbColumn;
          }
        });
        formData.append('customMapping', JSON.stringify(customMapping));
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setFile(null);
        setPreviewData(null);
        setMappings([]);
        // 업로드 성공 시 이메일 발송 여부 묻기 - 주석 처리
        // setShowEmailDialog(true);
      }
    } catch {
      setResult({
        success: false,
        error: '업로드 중 오류가 발생했습니다.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!result?.data?.settlementMonths?.length) return;
    
    setSendingEmail(true);
    try {
      const settlementMonth = result.data.settlementMonths[0];
      
      const res = await fetch('/api/email/mailmerge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `[${settlementMonth}] 정산서가 업로드되었습니다`,
          body: `안녕하세요, {{업체명}} 담당자님.\n\n${settlementMonth} 정산서가 업로드되었습니다.\n\n총 금액: {{총_금액}}\n데이터 건수: {{데이터_건수}}건\n\n포털에 로그인하여 확인해주세요.\n\n감사합니다.`,
          recipients: { year_month: settlementMonth },
        }),
      });
      
      const emailResult = await res.json();
      
      if (emailResult.success) {
        toast({
          title: '이메일 발송 완료',
          description: `${emailResult.data.sent}개 업체에게 알림을 발송했습니다.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: '이메일 발송 실패',
          description: emailResult.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '이메일 발송 중 오류가 발생했습니다.',
      });
    } finally {
      setSendingEmail(false);
      setShowEmailDialog(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setPreviewData(null);
    setMappings([]);
  };

  // 필수 컬럼 매핑 여부 확인
  const requiredColumnsMapped = mappings.length === 0 || 
    ['사업자번호', '정산월'].every(req => 
      mappings.some(m => m.dbColumn === req)
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6" />
          엑셀 업로드
        </h1>
        <p className="text-muted-foreground">정산서 데이터를 업로드합니다.</p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">파일 업로드</CardTitle>
          <CardDescription>엑셀 파일(.xlsx, .xls)을 선택하거나 드래그하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!file ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
              `}
            >
              <input {...getInputProps()} accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" capture={undefined} />
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary">파일을 여기에 놓으세요...</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    파일을 드래그하거나 클릭하여 선택
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    .xlsx, .xls (최대 20MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={removeFile}
                disabled={uploading || previewing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                업로드 중... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline"
          onClick={handlePreview} 
          disabled={!file || uploading || previewing}
          className="flex-1"
          size="lg"
        >
          {previewing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              컬럼 매핑 확인
            </>
          )}
        </Button>
        <Button 
          onClick={previewData ? () => setShowMappingDialog(true) : handleUpload} 
          disabled={!file || uploading || previewing}
          className="flex-1"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              업로드 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewData ? '매핑 확인 후 업로드' : '바로 업로드'}
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {result.success ? '업로드 완료' : '업로드 실패'}
          </AlertTitle>
          <AlertDescription>
            {result.success ? (
              <div className="mt-2 space-y-2">
                <p>{result.message}</p>
                {result.data?.rowCount && (
                  <p className="text-sm">• 데이터: {result.data.rowCount.toLocaleString()}건</p>
                )}
                {result.data?.settlementMonths && result.data.settlementMonths.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">• 정산월:</span>
                    {result.data.settlementMonths.map(month => (
                      <Badge key={month} variant="secondary" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {month}
                      </Badge>
                    ))}
                  </div>
                )}
                {result.data?.errors && result.data.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">경고:</p>
                    <ul className="text-sm list-disc list-inside">
                      {result.data.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {result.data.errors.length > 5 && (
                        <li>... 외 {result.data.errors.length - 5}건</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              result.error
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">업로드 안내</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• 엑셀 파일의 첫 번째 시트 데이터만 업로드됩니다.</p>
          <p>• 필수 컬럼: <strong>사업자번호</strong>, <strong>정산월</strong></p>
          <p>• <strong>컬럼 매핑 확인</strong>을 클릭하면 컬럼을 수동으로 매핑할 수 있습니다.</p>
          <p>• 컬럼명이 다르더라도 자동으로 유사한 컬럼을 찾아 매핑합니다.</p>
          <p>• 같은 정산월 데이터를 다시 업로드하면 기존 데이터가 교체됩니다.</p>
        </CardContent>
      </Card>

      {/* Column Mapping Dialog */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
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
              {/* 필수 컬럼 경고 */}
              {!requiredColumnsMapped && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>필수 컬럼 누락</AlertTitle>
                  <AlertDescription>
                    사업자번호와 정산월 컬럼이 매핑되어야 합니다.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 컬럼 매핑 테이블 */}
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
                          <Select
                            value={mapping.dbColumn || '_none_'}
                            onValueChange={(value) => handleMappingChange(mapping.excelColumn, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none_">
                                <span className="text-muted-foreground">(매핑 안함)</span>
                              </SelectItem>
                              {previewData.dbColumnOptions.map(opt => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {mapping.dbColumn ? (
                            <Badge 
                              variant={mapping.score >= 0.9 ? 'default' : mapping.score >= 0.7 ? 'secondary' : 'outline'}
                              className={mapping.score >= 0.9 ? 'bg-green-600' : ''}
                            >
                              {mapping.score >= 1 ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : null}
                              {Math.round(mapping.score * 100)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">-</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              {/* 샘플 데이터 미리보기 */}
              {previewData.sampleData.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">샘플 데이터 (처음 {previewData.sampleData.length}행)</h4>
                  <ScrollArea className="h-[150px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.excelColumns.slice(0, 6).map(col => (
                            <TableHead key={col} className="text-xs whitespace-nowrap">
                              {col.replace(/\n/g, ' ').slice(0, 15)}
                            </TableHead>
                          ))}
                          {previewData.excelColumns.length > 6 && (
                            <TableHead className="text-xs">...</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.sampleData.map((row, idx) => (
                          <TableRow key={idx}>
                            {previewData.excelColumns.slice(0, 6).map(col => (
                              <TableCell key={col} className="text-xs">
                                {String(row[col] || '').slice(0, 20)}
                              </TableCell>
                            ))}
                            {previewData.excelColumns.length > 6 && (
                              <TableCell className="text-xs text-muted-foreground">...</TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
              취소
            </Button>
            <Button onClick={handleUpload} disabled={!requiredColumnsMapped || uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              업로드 진행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirm Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              이메일 발송
            </DialogTitle>
            <DialogDescription className="pt-2">
              업로드가 완료되었습니다. 해당 업체들에게 알림 이메일을 발송하시겠습니까?
              <br /><br />
              {result?.data?.settlementMonths && (
                <span className="font-medium">
                  정산월: {result.data.settlementMonths.join(', ')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              나중에
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              이메일 발송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
