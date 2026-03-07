import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';

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

// ── Helpers ──

function buildCustomMappingFormData(file: File, mappings: ColumnMapping[]): FormData {
  const formData = new FormData();
  formData.append('file', file);

  if (mappings.length > 0) {
    const customMapping: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.dbColumn) customMapping[m.excelColumn] = m.dbColumn;
    });
    formData.append('customMapping', JSON.stringify(customMapping));
  }

  return formData;
}

function buildUploadEmailBody(settlementMonth: string) {
  return {
    subject: `[${settlementMonth}] 정산서가 업로드되었습니다`,
    body: `안녕하세요, {{업체명}} 담당자님.\n\n${settlementMonth} 정산서가 업로드되었습니다.\n\n총 금액: {{총_금액}}\n데이터 건수: {{데이터_건수}}건\n\n포털에 로그인하여 확인해주세요.\n\n감사합니다.`,
    recipients: { year_month: settlementMonth },
  };
}

// ── 비동기 핸들러 헬퍼 ──

type ToastFn = ReturnType<typeof useToast>['toast'];

async function fetchPreview(
  file: File,
  toast: ToastFn,
): Promise<{ previewData: PreviewData; mappings: ColumnMapping[] } | null> {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch(API_ROUTES.UPLOAD.PREVIEW, { method: 'POST', body: formData });
    const data = await response.json();
    if (data.success) {
      return { previewData: data.data, mappings: data.data.mappings };
    }
    toast({ variant: 'destructive', title: '미리보기 실패', description: data.error });
  } catch (error) {
    console.error('파일 미리보기 오류:', error);
    toast({ variant: 'destructive', title: '오류', description: '파일 미리보기 중 오류가 발생했습니다.' });
  }
  return null;
}

async function submitUpload(
  file: File, mappings: ColumnMapping[],
): Promise<UploadResult> {
  try {
    const formData = buildCustomMappingFormData(file, mappings);
    const response = await fetch(API_ROUTES.UPLOAD.SUBMIT, { method: 'POST', body: formData });
    return await response.json();
  } catch (error) {
    console.error('파일 업로드 오류:', error);
    return { success: false, error: '업로드 중 오류가 발생했습니다.' };
  }
}

async function sendUploadEmail(
  settlementMonth: string, toast: ToastFn,
): Promise<void> {
  const payload = buildUploadEmailBody(settlementMonth);
  try {
    const res = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const emailResult = await res.json();
    if (emailResult.success) {
      toast({ title: '이메일 발송 완료', description: `${emailResult.data.sent}개 업체에게 알림을 발송했습니다.` });
    } else {
      toast({ variant: 'destructive', title: '이메일 발송 실패', description: emailResult.error });
    }
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    toast({ variant: 'destructive', title: '오류', description: '이메일 발송 중 오류가 발생했습니다.' });
  }
}

// ── 매핑 변경 헬퍼 ──

const NONE_VALUE = '_none_';

function applyMappingChange(
  prev: ColumnMapping[], excelColumn: string, newDbColumn: string,
): ColumnMapping[] {
  return prev.map(m =>
    m.excelColumn === excelColumn
      ? { ...m, dbColumn: newDbColumn === NONE_VALUE ? null : newDbColumn, score: newDbColumn === NONE_VALUE ? 0 : 1 }
      : m
  );
}

const REQUIRED_COLUMNS = ['사업자번호', '정산월'];

function checkRequiredMapped(mappings: ColumnMapping[]): boolean {
  return mappings.length === 0 || REQUIRED_COLUMNS.every(req => mappings.some(m => m.dbColumn === req));
}

const PROGRESS_STEP = 10;
const PROGRESS_MAX = 90;
const PROGRESS_INTERVAL_MS = 200;
const PROGRESS_COMPLETE = 100;

// ── Hook ──

export function useFileUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const resetFileState = useCallback(() => {
    setFile(null); setResult(null); setPreviewData(null); setMappings([]);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]); setResult(null); setPreviewData(null); setMappings([]);
    }
  }, []);

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    const preview = await fetchPreview(file, toast);
    if (preview) {
      setPreviewData(preview.previewData); setMappings(preview.mappings); setShowMappingDialog(true);
    }
    setPreviewing(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setProgress(0); setResult(null); setShowMappingDialog(false);
    const interval = setInterval(() => setProgress(prev => Math.min(prev + PROGRESS_STEP, PROGRESS_MAX)), PROGRESS_INTERVAL_MS);
    const data = await submitUpload(file, mappings);
    clearInterval(interval);
    setProgress(PROGRESS_COMPLETE); setResult(data);
    if (data.success) resetFileState();
    setUploading(false);
  };

  const handleSendEmail = async () => {
    if (!result?.data?.settlementMonths?.length) return;
    setSendingEmail(true);
    await sendUploadEmail(result.data.settlementMonths[0], toast);
    setSendingEmail(false); setShowEmailDialog(false);
  };

  return {
    file, uploading, previewing, progress, result,
    previewData, mappings, showMappingDialog, showEmailDialog, sendingEmail,
    requiredColumnsMapped: checkRequiredMapped(mappings),
    setShowMappingDialog, setShowEmailDialog,
    onDrop, handlePreview, handleUpload, handleSendEmail,
    handleMappingChange: (col: string, db: string) => setMappings(prev => applyMappingChange(prev, col, db)),
    removeFile: resetFileState,
  };
}
