'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Upload,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  X,
  Download,
  Building2,
  Calendar,
  UserPlus,
  Link2Off,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ===========================================
// Types
// ===========================================

export type MatchingStatus = 'normal' | 'unregistered' | 'pending_join' | 'missing_match';

export interface CSOMatching {
  cso_company_name: string; // PK: CSO관리업체명
  business_number: string; // 사업자등록번호
  created_at?: string;
  updated_at?: string;
}

export interface IntegrityCheckResult {
  id: string;
  cso_company_name: string; // 엑셀 업체명
  business_number: string | null; // 매칭 사업자번호
  status: MatchingStatus;
  erp_company_name: string | null; // ERP(회원DB) 등록명
  last_settlement_month: string | null; // 마지막 정산월
  is_approved: boolean | null; // 회원 승인 여부
  row_count: number; // 정산 데이터 건수
}

export interface MatchingUploadItem {
  cso_company_name: string;
  business_number: string;
}

// ===========================================
// Utility: 텍스트 정규화 (공백/특수문자 제거)
// ===========================================
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, '') // 모든 공백 제거
    .replace(/[^\w가-힣]/g, '') // 특수문자 제거 (영문, 숫자, 한글만 유지)
    .toLowerCase();
}

// ===========================================
// Status Badge Component
// ===========================================
function StatusBadge({ status }: { status: MatchingStatus }) {
  switch (status) {
    case 'normal':
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1">
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          정상
        </Badge>
      );
    case 'unregistered':
      return (
        <Badge className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1 animate-pulse">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          미등록
        </Badge>
      );
    case 'pending_join':
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-3 py-1 animate-pulse">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          가입대기
        </Badge>
      );
    case 'missing_match':
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-3 py-1 animate-pulse">
          <Link2Off className="h-3.5 w-3.5 mr-1.5" />
          매칭누락
        </Badge>
      );
    default:
      return null;
  }
}

// ===========================================
// Main Component
// ===========================================
export default function SettlementIntegrityManager() {
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [checkResults, setCheckResults] = useState<IntegrityCheckResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPreview, setUploadPreview] = useState<MatchingUploadItem[]>([]);

  // Edit dialog state (직접 매칭 등록/수정)
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<IntegrityCheckResult | null>(null);
  const [editBusinessNumber, setEditBusinessNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IntegrityCheckResult | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ===========================================
  // Data Fetching
  // ===========================================
  const fetchIntegrityData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.set('month', selectedMonth);

      const res = await fetch(`/api/admin/cso-matching/integrity?${params.toString()}`);
      const result = await res.json();

      if (result.success) {
        setCheckResults(result.data.results);
        if (result.data.availableMonths) {
          setAvailableMonths(result.data.availableMonths);
        }
      } else {
        toast({
          variant: 'destructive',
          title: '데이터 로드 실패',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Fetch integrity data error:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '무결성 검증 데이터를 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, toast]);

  useEffect(() => {
    fetchIntegrityData();
  }, [fetchIntegrityData]);

  // ===========================================
  // Filtering Logic
  // ===========================================
  const filteredResults = useMemo(() => {
    let results = checkResults;

    // 검색 필터
    if (searchQuery.trim()) {
      const normalizedQuery = normalizeText(searchQuery);
      results = results.filter(
        (r) =>
          normalizeText(r.cso_company_name).includes(normalizedQuery) ||
          (r.business_number && r.business_number.includes(searchQuery.replace(/\D/g, ''))) ||
          (r.erp_company_name && normalizeText(r.erp_company_name).includes(normalizedQuery))
      );
    }

    // 문제 항목만 보기 필터
    if (showIssuesOnly) {
      results = results.filter((r) => r.status !== 'normal');
    }

    return results;
  }, [checkResults, searchQuery, showIssuesOnly]);

  // ===========================================
  // Statistics
  // ===========================================
  const stats = useMemo(() => {
    const total = checkResults.length;
    const normal = checkResults.filter((r) => r.status === 'normal').length;
    const unregistered = checkResults.filter((r) => r.status === 'unregistered').length;
    const pendingJoin = checkResults.filter((r) => r.status === 'pending_join').length;
    const missingMatch = checkResults.filter((r) => r.status === 'missing_match').length;
    const issues = unregistered + pendingJoin + missingMatch;

    return { total, normal, unregistered, pendingJoin, missingMatch, issues };
  }, [checkResults]);

  // ===========================================
  // Excel Upload Handling
  // ===========================================
  const parseUploadFile = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      // 컬럼 이름 추출 및 매핑
      const items: MatchingUploadItem[] = [];

      for (const row of jsonData) {
        // 업체명 컬럼 찾기 (여러 가능한 이름)
        const companyNameKeys = ['업체명', 'CSO관리업체', 'CSO관리업체명', '관리업체명', '회사명'];
        let companyName = '';
        for (const key of companyNameKeys) {
          if (row[key]) {
            companyName = String(row[key]).trim();
            break;
          }
        }

        // 사업자번호 컬럼 찾기
        const bizNumKeys = ['사업자번호', '사업자등록번호', '사업자_번호'];
        let bizNum = '';
        for (const key of bizNumKeys) {
          if (row[key]) {
            bizNum = String(row[key]).replace(/\D/g, '');
            break;
          }
        }

        if (companyName && bizNum && bizNum.length === 10) {
          items.push({
            cso_company_name: companyName,
            business_number: bizNum,
          });
        }
      }

      setUploadPreview(items);

      if (items.length === 0) {
        toast({
          variant: 'destructive',
          title: '파싱 오류',
          description: '유효한 매칭 데이터를 찾을 수 없습니다. 컬럼명을 확인해주세요.',
        });
      }
    } catch (error) {
      console.error('File parse error:', error);
      toast({
        variant: 'destructive',
        title: '파일 오류',
        description: '엑셀 파일을 읽는 중 오류가 발생했습니다.',
      });
    }
  }, [toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadFile(file);
      parseUploadFile(file);
    }
  }, [parseUploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (uploadPreview.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch('/api/admin/cso-matching/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: uploadPreview }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await res.json();

      if (result.success) {
        toast({
          title: '업로드 완료',
          description: `${result.data.upserted}건의 매칭 데이터가 저장되었습니다.`,
        });
        setShowUploadDialog(false);
        setUploadFile(null);
        setUploadPreview([]);
        fetchIntegrityData();
      } else {
        toast({
          variant: 'destructive',
          title: '업로드 실패',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '매칭 데이터 업로드 중 오류가 발생했습니다.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleExportIssues = async () => {
    try {
      const XLSX = await import('xlsx');

      const exportData = filteredResults
        .filter((r) => r.status !== 'normal')
        .map((r) => ({
          '엑셀 업체명': r.cso_company_name,
          '매칭 사업자번호': r.business_number || '-',
          '상태': r.status === 'unregistered' ? '미등록' :
                 r.status === 'pending_join' ? '가입대기' :
                 r.status === 'missing_match' ? '매칭누락' : '정상',
          'ERP 등록명': r.erp_company_name || '-',
          '마지막 정산월': r.last_settlement_month || '-',
          '정산건수': r.row_count,
        }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '문제항목');

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `정산서_무결성검증_문제항목_${today}.xlsx`);

      toast({
        title: '다운로드 완료',
        description: `${exportData.length}건의 문제 항목이 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: '다운로드 실패',
        description: '엑셀 파일 생성 중 오류가 발생했습니다.',
      });
    }
  };

  const closeUploadDialog = () => {
    setShowUploadDialog(false);
    setUploadFile(null);
    setUploadPreview([]);
  };

  // ===========================================
  // 직접 매칭 등록/수정 핸들링
  // ===========================================
  const openEditDialog = (result: IntegrityCheckResult) => {
    setEditTarget(result);
    setEditBusinessNumber(result.business_number || '');
    setShowEditDialog(true);
  };

  const closeEditDialog = () => {
    setShowEditDialog(false);
    setEditTarget(null);
    setEditBusinessNumber('');
  };

  const handleSaveMatching = async () => {
    if (!editTarget) return;

    // 사업자번호 유효성 검사
    const cleanedBizNum = editBusinessNumber.replace(/\D/g, '');
    if (cleanedBizNum.length !== 10) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '사업자번호는 10자리 숫자여야 합니다.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/cso-matching/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            cso_company_name: editTarget.cso_company_name,
            business_number: cleanedBizNum,
          }],
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast({
          title: '매칭 저장 완료',
          description: `"${editTarget.cso_company_name}"의 매칭 정보가 저장되었습니다.`,
        });
        closeEditDialog();
        fetchIntegrityData();
      } else {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Save matching error:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '매칭 정보 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ===========================================
  // 매칭 삭제 핸들링
  // ===========================================
  const openDeleteDialog = (result: IntegrityCheckResult) => {
    setDeleteTarget(result);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  };

  const handleDeleteMatching = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/admin/cso-matching/upsert', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cso_company_name: deleteTarget.cso_company_name,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast({
          title: '삭제 완료',
          description: `"${deleteTarget.cso_company_name}"의 매칭 정보가 삭제되었습니다.`,
        });
        closeDeleteDialog();
        fetchIntegrityData();
      } else {
        toast({
          variant: 'destructive',
          title: '삭제 실패',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Delete matching error:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '매칭 정보 삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // 사업자번호 포맷팅 (입력 시)
  const formatBusinessNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 10);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
  };

  // ===========================================
  // Render
  // ===========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            정산서 무결성 검증
          </h1>
          <p className="text-muted-foreground">
            CSO관리업체명과 회원 사업자번호 매칭 상태를 검수합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            매칭 데이터 업로드
          </Button>
          <Button variant="outline" onClick={fetchIntegrityData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              정상
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {stats.normal}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              미등록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {stats.unregistered}
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-1">
              <UserPlus className="h-4 w-4" />
              가입대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {stats.pendingJoin}
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-500 flex items-center gap-1">
              <Link2Off className="h-4 w-4" />
              매칭누락
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
              {stats.missingMatch}
            </div>
          </CardContent>
        </Card>
        <Card className={cn(
          "border-2",
          stats.issues > 0 
            ? "border-red-500 bg-red-100/50 dark:bg-red-950/30" 
            : "border-green-500 bg-green-100/50 dark:bg-green-950/30"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              "text-sm font-medium flex items-center gap-1",
              stats.issues > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
            )}>
              <AlertTriangle className="h-4 w-4" />
              문제 총계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.issues > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
            )}>
              {stats.issues}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Alert */}
      {stats.issues > 0 && (
        <Alert variant="destructive" className="border-2 border-red-500 bg-red-50 dark:bg-red-950/50">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">주의: 데이터 불일치 발견</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="font-medium">
              총 {stats.issues}건의 문제 항목이 발견되었습니다. 즉시 조치가 필요합니다.
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {stats.unregistered > 0 && (
                <li>
                  <span className="font-semibold text-red-700">미등록 {stats.unregistered}건:</span>{' '}
                  정산서 업체명이 매칭 테이블에 없음 - 매칭 데이터 추가 필요
                </li>
              )}
              {stats.pendingJoin > 0 && (
                <li>
                  <span className="font-semibold text-orange-700">가입대기 {stats.pendingJoin}건:</span>{' '}
                  매칭 정보는 있으나 회원 계정 없음 - 회원가입 유도 필요
                </li>
              )}
              {stats.missingMatch > 0 && (
                <li>
                  <span className="font-semibold text-yellow-700">매칭누락 {stats.missingMatch}건:</span>{' '}
                  회원 계정은 있으나 매칭 테이블에 정보 없음 - 매칭 정보 추가 필요
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="업체명, 사업자번호로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">전체 정산월</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              <Button
                variant={showIssuesOnly ? 'default' : 'outline'}
                onClick={() => setShowIssuesOnly(!showIssuesOnly)}
                className={cn(
                  showIssuesOnly && 'bg-red-600 hover:bg-red-700'
                )}
              >
                {showIssuesOnly ? (
                  <Eye className="h-4 w-4 mr-2" />
                ) : (
                  <EyeOff className="h-4 w-4 mr-2" />
                )}
                문제 항목만 보기
              </Button>
              <Button
                variant="outline"
                onClick={handleExportIssues}
                disabled={stats.issues === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                문제항목 다운로드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-5 w-5" />
            검증 결과
            <Badge variant="secondary" className="ml-2">
              {filteredResults.length}건
            </Badge>
          </CardTitle>
          <CardDescription>
            정산서의 CSO관리업체명과 회원 데이터의 매칭 상태를 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[200px]">엑셀 업체명</TableHead>
                    <TableHead className="w-[140px]">매칭 사업자번호</TableHead>
                    <TableHead className="w-[120px]">DB 상태</TableHead>
                    <TableHead className="w-[200px]">ERP 등록명</TableHead>
                    <TableHead className="w-[100px]">마지막 정산월</TableHead>
                    <TableHead className="w-[80px] text-right">정산건수</TableHead>
                    <TableHead className="w-[100px] text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => (
                    <TableRow
                      key={result.id}
                      className={cn(
                        result.status === 'unregistered' &&
                          'bg-red-100/80 dark:bg-red-950/50 hover:bg-red-200/80 dark:hover:bg-red-950/70 border-l-4 border-l-red-500',
                        result.status === 'pending_join' &&
                          'bg-orange-100/80 dark:bg-orange-950/50 hover:bg-orange-200/80 dark:hover:bg-orange-950/70 border-l-4 border-l-orange-500',
                        result.status === 'missing_match' &&
                          'bg-yellow-100/80 dark:bg-yellow-950/50 hover:bg-yellow-200/80 dark:hover:bg-yellow-950/70 border-l-4 border-l-yellow-500',
                        result.status === 'normal' &&
                          'hover:bg-muted/50'
                      )}
                    >
                      <TableCell className="font-medium">
                        {result.cso_company_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.business_number ? (
                          <span>
                            {result.business_number.slice(0, 3)}-
                            {result.business_number.slice(3, 5)}-
                            {result.business_number.slice(5)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={result.status} />
                      </TableCell>
                      <TableCell>
                        {result.erp_company_name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.last_settlement_month ? (
                          <Badge variant="outline" className="font-mono">
                            <Calendar className="h-3 w-3 mr-1" />
                            {result.last_settlement_month}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {result.row_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(result)}
                            title="매칭 등록/수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {result.business_number && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => openDeleteDialog(result)}
                              title="매칭 삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredResults.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        {showIssuesOnly
                          ? '문제 항목이 없습니다.'
                          : '검증할 데이터가 없습니다.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={closeUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSO 매칭 데이터 업로드
            </DialogTitle>
            <DialogDescription>
              [업체명 - 사업자번호] 형식의 엑셀 파일을 업로드하여 매칭 테이블을
              업데이트합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dropzone */}
            {!uploadFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                )}
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
                      .xlsx, .xls (최대 10MB)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">{uploadFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadFile.size / 1024).toFixed(1)} KB |{' '}
                      {uploadPreview.length}건 감지됨
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setUploadFile(null);
                    setUploadPreview([]);
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  업로드 중... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Preview */}
            {uploadPreview.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">
                  미리보기 (처음 10건)
                </h4>
                <ScrollArea className="h-[200px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>업체명</TableHead>
                        <TableHead>사업자번호</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadPreview.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.cso_company_name}</TableCell>
                          <TableCell className="font-mono">
                            {item.business_number}
                          </TableCell>
                        </TableRow>
                      ))}
                      {uploadPreview.length > 10 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground"
                          >
                            ... 외 {uploadPreview.length - 10}건
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {/* Instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>업로드 안내</AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>
                    필수 컬럼: <strong>업체명</strong> (또는 CSO관리업체),{' '}
                    <strong>사업자번호</strong> (또는 사업자등록번호)
                  </li>
                  <li>기존 업체명의 사업자번호는 자동으로 업데이트됩니다 (Upsert)</li>
                  <li>사업자번호는 10자리 숫자만 추출됩니다</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeUploadDialog} disabled={uploading}>
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || uploadPreview.length === 0}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploadPreview.length}건 업로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Matching Dialog (직접 매칭 등록/수정) */}
      <Dialog open={showEditDialog} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              매칭 정보 {editTarget?.business_number ? '수정' : '등록'}
            </DialogTitle>
            <DialogDescription>
              CSO관리업체명에 매칭할 사업자번호를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 업체명 표시 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">CSO관리업체명</label>
              <div className="p-3 bg-muted rounded-md font-medium">
                {editTarget?.cso_company_name}
              </div>
            </div>

            {/* 현재 상태 표시 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">현재 상태</label>
              <div className="flex items-center gap-2">
                {editTarget && <StatusBadge status={editTarget.status} />}
                {editTarget?.erp_company_name && (
                  <span className="text-sm text-muted-foreground">
                    (ERP: {editTarget.erp_company_name})
                  </span>
                )}
              </div>
            </div>

            {/* 사업자번호 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                매칭할 사업자번호 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="000-00-00000"
                value={formatBusinessNumber(editBusinessNumber)}
                onChange={(e) => setEditBusinessNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={12}
                className="font-mono text-lg"
              />
              <p className="text-xs text-muted-foreground">
                10자리 숫자를 입력하세요. 하이픈(-)은 자동으로 추가됩니다.
              </p>
            </div>

            {/* 기존 정보 안내 */}
            {editTarget?.business_number && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>기존 매칭 정보</AlertTitle>
                <AlertDescription className="font-mono">
                  {editTarget.business_number.slice(0, 3)}-
                  {editTarget.business_number.slice(3, 5)}-
                  {editTarget.business_number.slice(5)}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={saving}>
              취소
            </Button>
            <Button
              onClick={handleSaveMatching}
              disabled={saving || editBusinessNumber.replace(/\D/g, '').length !== 10}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={closeDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              매칭 정보 삭제
            </DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">업체명</span>
                <span className="font-medium">{deleteTarget?.cso_company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">사업자번호</span>
                <span className="font-mono">
                  {deleteTarget?.business_number ? (
                    <>
                      {deleteTarget.business_number.slice(0, 3)}-
                      {deleteTarget.business_number.slice(3, 5)}-
                      {deleteTarget.business_number.slice(5)}
                    </>
                  ) : '-'}
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              매칭 정보를 삭제하면 해당 업체는 &quot;미등록&quot; 상태로 변경되며,
              회원은 정산 데이터를 조회할 수 없게 됩니다.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deleting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMatching}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
