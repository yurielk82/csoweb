import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UploadResult {
  success: boolean;
  data?: {
    rowCount: number;
    settlementMonths: string[];
    errors?: string[];
  };
  message?: string;
  error?: string;
}

export interface ColumnMapping {
  excelColumn: string;
  dbColumn: string | null;
  score: number;
  isRequired: boolean;
}

export interface PreviewData {
  fileName: string;
  totalRows: number;
  excelColumns: string[];
  dbColumnOptions: string[];
  mappings: ColumnMapping[];
  sampleData: Record<string, unknown>[];
  missingRequired: string[];
}

export function useFileUpload() {
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
    } catch (error) {
      console.error('파일 미리보기 오류:', error);
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
    } catch (error) {
      console.error('파일 업로드 오류:', error);
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
    } catch (error) {
      console.error('이메일 발송 오류:', error);
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

  return {
    // 상태
    file,
    uploading,
    previewing,
    progress,
    result,
    previewData,
    mappings,
    showMappingDialog,
    showEmailDialog,
    sendingEmail,
    requiredColumnsMapped,

    // 상태 변경
    setShowMappingDialog,
    setShowEmailDialog,

    // 핸들러
    onDrop,
    handlePreview,
    handleMappingChange,
    handleUpload,
    handleSendEmail,
    removeFile,
  };
}
