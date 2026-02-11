'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  AlertCircle,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Search,
  RefreshCw,
  Loader2,
  X,
  Download,
  Building2,
  Calendar,
  UserCheck,
  UserX,
  Clock,
  Trash2,
  Plus,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ===========================================
// Types
// ===========================================

type RegistrationStatus = 'registered' | 'unregistered' | 'pending_approval';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface IntegrityRow {
  id: string;
  business_number: string;
  business_name: string | null;
  registration_status: RegistrationStatus;
  cso_company_names: string[];
  last_settlement_month: string | null;
  row_count: number;
  is_readonly: boolean;
  // UI state
  saveState?: SaveState;
}

interface MatchingUploadItem {
  cso_company_name: string;
  business_number: string;
}

// ===========================================
// Utility Functions
// ===========================================

function formatBusinessNumber(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 10);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
}

// ===========================================
// Mapping Status Icon Component
// ===========================================
interface MappingStatusIconProps {
  row: IntegrityRow;
}

const MappingStatusIcon = memo(function MappingStatusIcon({ row }: MappingStatusIconProps) {
  // 매핑 완료: CSO업체명이 1개 이상 && 회원가입 상태가 '가입'
  // 미완료: CSO업체명이 없거나 회원가입 상태가 '미가입'
  const hasCSO = row.cso_company_names.length > 0;
  const isRegistered = row.registration_status === 'registered';
  
  if (isRegistered && hasCSO) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-green-500 cursor-help text-base" title="매핑완료">✅</span>
          </TooltipTrigger>
          <TooltipContent className="bg-green-600 text-white">
            <p>매핑완료: 회원가입 O, CSO매핑 O</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (!isRegistered || !hasCSO) {
    const reasons: string[] = [];
    if (!isRegistered) reasons.push('회원 미가입');
    if (!hasCSO) reasons.push('CSO 미매핑');
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-amber-500 cursor-help text-base" title="미완료">⚠️</span>
          </TooltipTrigger>
          <TooltipContent className="bg-amber-500 text-white">
            <p>미완료: {reasons.join(', ')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-red-500 cursor-help text-base" title="오류">❌</span>
        </TooltipTrigger>
        <TooltipContent className="bg-red-600 text-white">
          <p>데이터 오류</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ===========================================
// Status Badge Component
// ===========================================
function StatusBadge({ status }: { status: RegistrationStatus }) {
  switch (status) {
    case 'registered':
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white font-medium px-2 py-0.5 text-xs">
          <UserCheck className="h-3 w-3 mr-1" />
          가입
        </Badge>
      );
    case 'unregistered':
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2 py-0.5 text-xs">
          <UserX className="h-3 w-3 mr-1" />
          미가입
        </Badge>
      );
    case 'pending_approval':
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-2 py-0.5 text-xs">
          <Clock className="h-3 w-3 mr-1" />
          미가입
        </Badge>
      );
    default:
      return null;
  }
}

// ===========================================
// CSO Tag Component (인라인 편집 가능)
// ===========================================
interface CSOTagProps {
  value: string;
  isDuplicate: boolean;
  duplicateInfo?: string;
  onEdit: (newValue: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

function CSOTag({ value, isDuplicate, duplicateInfo, onEdit, onDelete, disabled }: CSOTagProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== value) {
      onEdit(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="px-2 py-1 text-sm border rounded min-w-[100px] max-w-[200px] outline-none focus:ring-2 focus:ring-blue-400"
        disabled={disabled}
      />
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer transition-all",
              isDuplicate
                ? "bg-orange-100 border-2 border-orange-400 text-orange-800"
                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
            )}
            onClick={() => !disabled && setIsEditing(true)}
          >
            <span className="max-w-[150px] truncate">{value}</span>
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-gray-500 hover:text-red-500 ml-1"
                title="삭제"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        </TooltipTrigger>
        {isDuplicate && duplicateInfo && (
          <TooltipContent className="bg-orange-500 text-white">
            <p>다른 사업자에 매핑됨: {duplicateInfo}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// ===========================================
// Add CSO Tag Input Component
// ===========================================
interface AddCSOInputProps {
  onAdd: (value: string) => void;
  disabled?: boolean;
}

function AddCSOInput({ onAdd, disabled }: AddCSOInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setValue('');
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleAdd}
        onKeyDown={handleKeyDown}
        placeholder="CSO업체명 입력"
        className="px-2 py-1 text-sm border rounded min-w-[120px] outline-none focus:ring-2 focus:ring-blue-400"
        disabled={disabled}
      />
    );
  }

  return (
    <button
      onClick={() => !disabled && setIsAdding(true)}
      className={cn(
        "px-2 py-1 text-sm rounded transition-all flex items-center gap-1",
        disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
      disabled={disabled}
    >
      <Plus className="h-3 w-3" />
      추가
    </button>
  );
}

// ===========================================
// Inline Editable Cell Component
// ===========================================
interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  format?: (value: string) => string;
  className?: string;
}

function EditableCell({ value, onChange, disabled, placeholder, format, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue !== value) {
      onChange(format ? format(editValue) : editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (disabled) {
    return (
      <span className={cn("text-sm", className)}>
        {format ? format(value) : value || '-'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={format ? format(editValue) : editValue}
        onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("px-2 py-1 text-sm border rounded outline-none focus:ring-2 focus:ring-blue-400 w-full", className)}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn("text-sm cursor-pointer hover:bg-gray-100 px-2 py-1 rounded", className)}
    >
      {format ? format(value) : value || placeholder || '클릭하여 입력'}
    </span>
  );
}

// ===========================================
// Main Component
// ===========================================
export default function SettlementIntegrityManager() {
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<IntegrityRow[]>([]);
  const [csoMapping, setCsoMapping] = useState<Record<string, string>>({}); // CSO명 → 사업자번호
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'registered' | 'unregistered' | 'all' | 'no_cso'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPreview, setUploadPreview] = useState<MatchingUploadItem[]>([]);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IntegrityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add new row dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBusinessNumber, setNewBusinessNumber] = useState('');
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newCsoName, setNewCsoName] = useState('');
  const [addingRow, setAddingRow] = useState(false);
  const [verifyingBizNum, setVerifyingBizNum] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<{ company_name: string; is_approved: boolean } | null>(null);

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
        setTableData(result.data.results);
        setCsoMapping(result.data.csoMapping || {});
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
  const filteredData = useMemo(() => {
    let results = [...tableData];

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchBizNum = searchQuery.replace(/\D/g, '');
      
      results = results.filter((r) => {
        // 사업자번호 검색
        if (searchBizNum && r.business_number.includes(searchBizNum)) return true;
        // 사업자명 검색
        if (r.business_name?.toLowerCase().includes(query)) return true;
        // CSO업체명 검색
        if (r.cso_company_names.some(cso => cso.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    // 상태 필터
    if (filterStatus === 'no_cso') {
      results = results.filter((r) => r.cso_company_names.length === 0);
    } else if (filterStatus === 'unregistered') {
      // 미가입 = 미등록 + 승인대기
      results = results.filter((r) => 
        r.registration_status === 'unregistered' || r.registration_status === 'pending_approval'
      );
    } else if (filterStatus === 'registered') {
      results = results.filter((r) => r.registration_status === 'registered');
    }

    return results;
  }, [tableData, searchQuery, filterStatus]);

  // ===========================================
  // Statistics
  // ===========================================
  const stats = useMemo(() => {
    const registered = tableData.filter((r) => r.registration_status === 'registered').length;
    const unregisteredCount = tableData.filter((r) => 
      r.registration_status === 'unregistered' || r.registration_status === 'pending_approval'
    ).length;
    const no_cso = tableData.filter((r) => r.cso_company_names.length === 0).length;
    
    return {
      total: tableData.length,
      registered,
      unregistered: unregisteredCount, // 미가입 = 미등록 + 승인대기
      no_cso,
    };
  }, [tableData]);

  // ===========================================
  // CSO Tag Handlers
  // ===========================================
  const handleAddCSOTag = async (rowId: string, csoName: string) => {
    const row = tableData.find((r) => r.id === rowId);
    if (!row) return;

    // 중복 검증
    const existingBizNum = csoMapping[csoName];
    if (existingBizNum && existingBizNum !== row.business_number) {
      toast({
        variant: 'destructive',
        title: '중복 경고',
        description: `"${csoName}"은(는) 이미 다른 사업자(${formatBusinessNumber(existingBizNum)})에 매핑되어 있습니다.`,
      });
      // 경고만 표시하고 계속 진행
    }

    // 낙관적 업데이트
    setTableData((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cso_company_names: [...r.cso_company_names, csoName], saveState: 'saving' }
          : r
      )
    );

    try {
      const res = await fetch('/api/admin/cso-matching/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ cso_company_name: csoName, business_number: row.business_number }],
        }),
      });

      const result = await res.json();

      if (result.success) {
        // 저장 성공
        setTableData((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, saveState: 'saved' } : r))
        );
        setCsoMapping((prev) => ({ ...prev, [csoName]: row.business_number }));
        
        // 1초 후 상태 초기화
        setTimeout(() => {
          setTableData((prev) =>
            prev.map((r) => (r.id === rowId ? { ...r, saveState: 'idle' } : r))
          );
        }, 1000);

        toast({
          title: '저장 완료',
          description: `"${csoName}" 태그가 추가되었습니다.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // 롤백
      setTableData((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, cso_company_names: r.cso_company_names.filter((c) => c !== csoName), saveState: 'error' }
            : r
        )
      );
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: error instanceof Error ? error.message : '오류가 발생했습니다.',
      });
    }
  };

  const handleEditCSOTag = async (rowId: string, oldName: string, newName: string) => {
    const row = tableData.find((r) => r.id === rowId);
    if (!row) return;

    // 중복 검증
    const existingBizNum = csoMapping[newName];
    if (existingBizNum && existingBizNum !== row.business_number) {
      toast({
        variant: 'destructive',
        title: '중복 경고',
        description: `"${newName}"은(는) 이미 다른 사업자(${formatBusinessNumber(existingBizNum)})에 매핑되어 있습니다.`,
      });
    }

    // 낙관적 업데이트
    setTableData((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              cso_company_names: r.cso_company_names.map((c) => (c === oldName ? newName : c)),
              saveState: 'saving',
            }
          : r
      )
    );

    try {
      // 기존 삭제
      await fetch('/api/admin/cso-matching/upsert', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cso_company_name: oldName }),
      });

      // 새로 추가
      const res = await fetch('/api/admin/cso-matching/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ cso_company_name: newName, business_number: row.business_number }],
        }),
      });

      const result = await res.json();

      if (result.success) {
        setTableData((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, saveState: 'saved' } : r))
        );
        setCsoMapping((prev) => {
          const newMapping = { ...prev };
          delete newMapping[oldName];
          newMapping[newName] = row.business_number;
          return newMapping;
        });

        setTimeout(() => {
          setTableData((prev) =>
            prev.map((r) => (r.id === rowId ? { ...r, saveState: 'idle' } : r))
          );
        }, 1000);

        toast({
          title: '수정 완료',
          description: `"${oldName}" → "${newName}"`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // 롤백
      setTableData((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                cso_company_names: r.cso_company_names.map((c) => (c === newName ? oldName : c)),
                saveState: 'error',
              }
            : r
        )
      );
      toast({
        variant: 'destructive',
        title: '수정 실패',
        description: error instanceof Error ? error.message : '오류가 발생했습니다.',
      });
    }
  };

  const handleDeleteCSOTag = async (rowId: string, csoName: string) => {
    const row = tableData.find((r) => r.id === rowId);
    if (!row) return;

    // 낙관적 업데이트
    setTableData((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cso_company_names: r.cso_company_names.filter((c) => c !== csoName), saveState: 'saving' }
          : r
      )
    );

    try {
      const res = await fetch('/api/admin/cso-matching/upsert', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cso_company_name: csoName }),
      });

      const result = await res.json();

      if (result.success) {
        setTableData((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, saveState: 'saved' } : r))
        );
        setCsoMapping((prev) => {
          const newMapping = { ...prev };
          delete newMapping[csoName];
          return newMapping;
        });

        setTimeout(() => {
          setTableData((prev) =>
            prev.map((r) => (r.id === rowId ? { ...r, saveState: 'idle' } : r))
          );
        }, 1000);

        toast({
          title: '삭제 완료',
          description: `"${csoName}" 태그가 삭제되었습니다.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // 롤백
      setTableData((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, cso_company_names: [...r.cso_company_names, csoName], saveState: 'error' }
            : r
        )
      );
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '오류가 발생했습니다.',
      });
    }
  };

  // ===========================================
  // Row Delete Handler
  // ===========================================
  const handleDeleteRow = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      // 해당 사업자번호의 모든 CSO 매칭 삭제
      for (const csoName of deleteTarget.cso_company_names) {
        await fetch('/api/admin/cso-matching/upsert', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cso_company_name: csoName }),
        });
      }

      toast({
        title: '삭제 완료',
        description: `사업자번호 ${formatBusinessNumber(deleteTarget.business_number)}의 모든 매핑이 삭제되었습니다.`,
      });

      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchIntegrityData();
    } catch (error) {
      console.error('Delete row error:', error);
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '매핑 삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // ===========================================
  // Add New Row Handler
  // ===========================================
  const handleVerifyBusinessNumber = async () => {
    const cleanedBizNum = newBusinessNumber.replace(/\D/g, '');
    if (cleanedBizNum.length !== 10) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '사업자번호는 10자리 숫자여야 합니다.',
      });
      return;
    }

    setVerifyingBizNum(true);
    try {
      const res = await fetch(`/api/users?search=${cleanedBizNum}`);
      const result = await res.json();

      if (result.success && result.data.length > 0) {
        const user = result.data[0];
        setVerifiedUser({
          company_name: user.company_name,
          is_approved: user.is_approved,
        });
        setNewBusinessName(user.company_name);
        toast({
          title: '회원 확인',
          description: `${user.company_name} (${user.is_approved ? '가입' : '미가입'})`,
        });
      } else {
        setVerifiedUser(null);
        toast({
          title: '미가입 사업자',
          description: '회원가입되지 않은 사업자번호입니다. 사업자명을 직접 입력하세요.',
        });
      }
    } catch (error) {
      console.error('Verify business number error:', error);
      setVerifiedUser(null);
    } finally {
      setVerifyingBizNum(false);
    }
  };

  const handleAddNewRow = async () => {
    const cleanedBizNum = newBusinessNumber.replace(/\D/g, '');
    if (cleanedBizNum.length !== 10) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '사업자번호는 10자리 숫자여야 합니다.',
      });
      return;
    }

    if (!newCsoName.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: 'CSO관리업체명을 입력해주세요.',
      });
      return;
    }

    setAddingRow(true);
    try {
      const res = await fetch('/api/admin/cso-matching/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ cso_company_name: newCsoName.trim(), business_number: cleanedBizNum }],
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast({
          title: '추가 완료',
          description: `새 매핑이 추가되었습니다.`,
        });
        setShowAddDialog(false);
        setNewBusinessNumber('');
        setNewBusinessName('');
        setNewCsoName('');
        setVerifiedUser(null);
        fetchIntegrityData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '추가 실패',
        description: error instanceof Error ? error.message : '오류가 발생했습니다.',
      });
    } finally {
      setAddingRow(false);
    }
  };

  // ===========================================
  // Excel Upload Handlers
  // ===========================================
  const parseUploadFile = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      const items: MatchingUploadItem[] = [];

      for (const row of jsonData) {
        const companyNameKeys = ['업체명', 'CSO관리업체', 'CSO관리업체명', '관리업체명', '회사명'];
        let companyName = '';
        for (const key of companyNameKeys) {
          if (row[key]) {
            companyName = String(row[key]).trim();
            break;
          }
        }

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
          description: '유효한 매칭 데이터를 찾을 수 없습니다.',
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
    maxSize: 10 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (uploadPreview.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
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

      const exportData = filteredData
        .filter((r) => r.registration_status !== 'registered' || r.cso_company_names.length === 0)
        .map((r) => ({
          '사업자번호': formatBusinessNumber(r.business_number),
          '사업자명': r.business_name || '-',
          '회원가입상태': r.registration_status === 'registered' ? '가입' : '미가입',
          'CSO관리업체명': r.cso_company_names.join(', ') || '-',
          '마지막정산월': r.last_settlement_month || '-',
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

  // ===========================================
  // Search Handlers
  // ===========================================
  const handleSearch = () => setSearchQuery(searchInput);
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };
  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
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
            사업자번호별 CSO관리업체명 매핑 상태를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            새 매핑 추가
          </Button>
          <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            엑셀 업로드
          </Button>
          <Button variant="outline" onClick={fetchIntegrityData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Stats Cards - 4개로 간소화: 전체, 가입, 미가입, CSO미매핑 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            filterStatus === 'all' && "ring-2 ring-primary"
          )}
          onClick={() => setFilterStatus('all')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-green-200 bg-green-50/50 dark:bg-green-950/20 cursor-pointer transition-all hover:shadow-md",
            filterStatus === 'registered' && "ring-2 ring-green-500"
          )}
          onClick={() => setFilterStatus('registered')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              가입
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {stats.registered}
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer transition-all hover:shadow-md",
            filterStatus === 'unregistered' && "ring-2 ring-amber-500"
          )}
          onClick={() => setFilterStatus('unregistered')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <UserX className="h-4 w-4" />
              미가입
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {stats.unregistered}
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-red-200 bg-red-50/50 dark:bg-red-950/20 cursor-pointer transition-all hover:shadow-md",
            filterStatus === 'no_cso' && "ring-2 ring-red-500"
          )}
          onClick={() => setFilterStatus('no_cso')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              CSO미매핑
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {stats.no_cso}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Alert */}
      {(stats.unregistered > 0 || stats.no_cso > 0) && (
        <Alert variant="destructive" className="border-2 border-red-500 bg-red-50 dark:bg-red-950/50">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">주의: 매핑 필요</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="space-y-1 text-sm">
              {stats.unregistered > 0 && (
                <li>
                  <span className="font-semibold text-amber-700">미가입 {stats.unregistered}건:</span>{' '}
                  회원가입되지 않은 사업자번호입니다.
                </li>
              )}
              {stats.no_cso > 0 && (
                <li>
                  <span className="font-semibold text-red-700">CSO미매핑 {stats.no_cso}건:</span>{' '}
                  CSO관리업체명이 연결되지 않았습니다.
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
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="사업자번호, 사업자명, CSO업체명 검색 (Enter)"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-10 pr-10"
                  />
                  {searchInput && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  &quot;{searchQuery}&quot; 검색 결과: {filteredData.length}건
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">전체 정산월</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={handleExportIssues}
                disabled={stats.unregistered + stats.no_cso === 0}
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
            검증 결과
            <Badge variant="secondary" className="ml-2">{filteredData.length}건</Badge>
          </CardTitle>
          <CardDescription>
            CSO관리업체명 태그를 클릭하여 편집하고, × 버튼으로 삭제, + 버튼으로 추가할 수 있습니다.
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
                    <TableHead className="w-[140px]">사업자번호</TableHead>
                    <TableHead className="w-[150px]">사업자명</TableHead>
                    <TableHead className="w-[100px]">회원가입상태</TableHead>
                    <TableHead className="min-w-[300px]">CSO관리업체명</TableHead>
                    <TableHead className="w-[100px]">마지막정산월</TableHead>
                    <TableHead className="w-[80px] text-right">정산건수</TableHead>
                    <TableHead className="w-[60px] text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row) => {
                    // 미가입 = unregistered + pending_approval
                    const isUnregistered = row.registration_status === 'unregistered' || row.registration_status === 'pending_approval';
                    const hasNoCso = row.cso_company_names.length === 0;

                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          isUnregistered && 'bg-amber-50 dark:bg-amber-950/30',
                          hasNoCso && !isUnregistered && 'bg-red-50 dark:bg-red-950/30',
                          row.saveState === 'saving' && 'border-l-4 border-l-yellow-400',
                          row.saveState === 'saved' && 'border-l-4 border-l-green-400',
                          row.saveState === 'error' && 'border-l-4 border-l-red-400'
                        )}
                      >
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <MappingStatusIcon row={row} />
                            {row.is_readonly ? (
                              <span className="text-gray-600">{formatBusinessNumber(row.business_number)}</span>
                            ) : (
                              <EditableCell
                                value={row.business_number}
                                onChange={() => {
                                  // TODO: 사업자번호 수정 시 회원 검증 + 저장
                                }}
                                format={formatBusinessNumber}
                                className="font-mono"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.is_readonly ? (
                            <span className="text-sm">{row.business_name || '-'}</span>
                          ) : (
                            <EditableCell
                              value={row.business_name || ''}
                              onChange={() => {
                                // TODO: 사업자명 수정
                              }}
                              placeholder="사업자명 입력"
                              className={cn(isUnregistered && 'bg-amber-100')}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.registration_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2 items-center">
                            {row.cso_company_names.map((csoName, idx) => {
                              const existingBizNum = csoMapping[csoName];
                              const isDuplicate = existingBizNum && existingBizNum !== row.business_number;
                              return (
                                <CSOTag
                                  key={`${csoName}-${idx}`}
                                  value={csoName}
                                  isDuplicate={!!isDuplicate}
                                  duplicateInfo={isDuplicate ? formatBusinessNumber(existingBizNum) : undefined}
                                  onEdit={(newValue) => handleEditCSOTag(row.id, csoName, newValue)}
                                  onDelete={() => handleDeleteCSOTag(row.id, csoName)}
                                />
                              );
                            })}
                            <AddCSOInput onAdd={(value) => handleAddCSOTag(row.id, value)} />
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.last_settlement_month ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {row.last_settlement_month}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {row.row_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => {
                              setDeleteTarget(row);
                              setShowDeleteDialog(true);
                            }}
                            title="전체 매핑 삭제"
                            disabled={row.cso_company_names.length === 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {searchQuery
                          ? `"${searchQuery}" 검색 결과가 없습니다.`
                          : filterStatus !== 'all'
                          ? '해당 상태의 항목이 없습니다.'
                          : '데이터가 없습니다.'}
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
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSO 매칭 데이터 업로드
            </DialogTitle>
            <DialogDescription>
              [업체명 - 사업자번호] 형식의 엑셀 파일을 업로드하여 매칭 테이블을 업데이트합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!uploadFile ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-primary">파일을 여기에 놓으세요...</p>
                ) : (
                  <>
                    <p className="text-muted-foreground">파일을 드래그하거나 클릭하여 선택</p>
                    <p className="text-sm text-muted-foreground mt-2">.xlsx, .xls (최대 10MB)</p>
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
                      {(uploadFile.size / 1024).toFixed(1)} KB | {uploadPreview.length}건 감지됨
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setUploadFile(null); setUploadPreview([]); }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">업로드 중... {uploadProgress}%</p>
              </div>
            )}

            {uploadPreview.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">미리보기 (처음 10건)</h4>
                <ScrollArea className="h-[200px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CSO업체명</TableHead>
                        <TableHead>사업자번호</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadPreview.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.cso_company_name}</TableCell>
                          <TableCell className="font-mono">{formatBusinessNumber(item.business_number)}</TableCell>
                        </TableRow>
                      ))}
                      {uploadPreview.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            ... 외 {uploadPreview.length - 10}건
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              취소
            </Button>
            <Button onClick={handleUpload} disabled={uploading || uploadPreview.length === 0}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploadPreview.length}건 업로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              전체 매핑 삭제
            </DialogTitle>
            <DialogDescription>
              해당 사업자번호의 모든 CSO관리업체명 매핑을 삭제합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/30 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">사업자번호</span>
                <span className="font-mono">{deleteTarget && formatBusinessNumber(deleteTarget.business_number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">사업자명</span>
                <span>{deleteTarget?.business_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CSO업체명</span>
                <span>{deleteTarget?.cso_company_names.length || 0}개</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteRow} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              전체 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Row Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              새 매핑 추가
            </DialogTitle>
            <DialogDescription>
              사업자번호와 CSO관리업체명을 입력하여 새 매핑을 추가합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                사업자번호 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="000-00-00000"
                  value={formatBusinessNumber(newBusinessNumber)}
                  onChange={(e) => setNewBusinessNumber(e.target.value.replace(/\D/g, ''))}
                  maxLength={12}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={handleVerifyBusinessNumber}
                  disabled={verifyingBizNum || newBusinessNumber.replace(/\D/g, '').length !== 10}
                >
                  {verifyingBizNum ? <Loader2 className="h-4 w-4 animate-spin" /> : '검증'}
                </Button>
              </div>
              {verifiedUser && (
                <p className="text-sm text-green-600">
                  ✓ {verifiedUser.company_name} ({verifiedUser.is_approved ? '가입' : '미가입'})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                사업자명 {!verifiedUser && <span className="text-red-500">*</span>}
              </label>
              <Input
                placeholder="사업자명 입력"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                disabled={!!verifiedUser}
                className={verifiedUser ? 'bg-gray-100' : ''}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                CSO관리업체명 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="CSO관리업체명 입력"
                value={newCsoName}
                onChange={(e) => setNewCsoName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={addingRow}>
              취소
            </Button>
            <Button
              onClick={handleAddNewRow}
              disabled={addingRow || newBusinessNumber.replace(/\D/g, '').length !== 10 || !newCsoName.trim()}
            >
              {addingRow ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
