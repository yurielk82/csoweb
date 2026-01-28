'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UploadResult {
  success: boolean;
  rowCount?: number;
  settlementMonths?: string[];
  errors?: string[];
  notifications?: {
    sent: number;
    failed: number;
  };
  message?: string;
  error?: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
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

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const formData = new FormData();
      formData.append('file', file);

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

  const removeFile = () => {
    setFile(null);
    setResult(null);
  };

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
              <input {...getInputProps()} />
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
                disabled={uploading}
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

      {/* Upload Button */}
      <Button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        className="w-full"
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
            업로드
          </>
        )}
      </Button>

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
                {result.rowCount && (
                  <p className="text-sm">• 데이터: {result.rowCount.toLocaleString()}건</p>
                )}
                {result.settlementMonths && result.settlementMonths.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">• 정산월:</span>
                    {result.settlementMonths.map(month => (
                      <Badge key={month} variant="secondary" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {month}
                      </Badge>
                    ))}
                  </div>
                )}
                {result.notifications && (
                  <p className="text-sm">
                    • 알림 발송: 성공 {result.notifications.sent}건, 실패 {result.notifications.failed}건
                  </p>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">경고:</p>
                    <ul className="text-sm list-disc list-inside">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... 외 {result.errors.length - 5}건</li>
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
          <p>• 데이터는 <strong>정산월</strong> 컬럼 기준으로 자동 분류됩니다.</p>
          <p>• 같은 정산월 데이터를 다시 업로드하면 기존 데이터가 교체됩니다.</p>
          <p>• 업로드 완료 시 해당 업체들에게 이메일 알림이 발송됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
