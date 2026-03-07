'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';
import type { IntegrityRow, MatchingUploadItem, IntegrityStats, FilterStatus } from '@/components/admin/settlement-integrity/types';
import { formatBusinessNumber } from '@/components/admin/settlement-integrity/CSOTagComponents';

export function useIntegrityData() {
  const { toast } = useToast();

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<IntegrityRow[]>([]);
  const [csoMapping, setCsoMapping] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'settlement'>('settlement');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('settlement');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPreview, setUploadPreview] = useState<MatchingUploadItem[]>([]);
  const [uploadDuplicatesRemoved, setUploadDuplicatesRemoved] = useState(0);
  const [uploadRawCount, setUploadRawCount] = useState(0);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IntegrityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add new row dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUnmappedBizNum, setSelectedUnmappedBizNum] = useState('');
  const [newCsoName, setNewCsoName] = useState('');
  const [addingRow, setAddingRow] = useState(false);

  // ── Data Fetching ──
  const fetchIntegrityData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.INTEGRITY);
      const result = await res.json();

      if (result.success) {
        setTableData(result.data.results);
        setCsoMapping(result.data.csoMapping || {});

        const months = [...new Set(
          result.data.results
            .map((r: IntegrityRow) => r.last_settlement_month)
            .filter(Boolean)
        )].sort().reverse() as string[];
        setAvailableMonths(months);
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
        description: '거래처 매핑 데이터를 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchIntegrityData();
  }, [fetchIntegrityData]);

  // ── Filtering ──
  const filteredData = useMemo(() => {
    let results = [...tableData];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchBizNum = searchQuery.replace(/\D/g, '');

      results = results.filter((r) => {
        if (searchBizNum && r.business_number.includes(searchBizNum)) return true;
        if (r.business_name?.toLowerCase().includes(query)) return true;
        if (r.cso_company_names.some(cso => cso.toLowerCase().includes(query))) return true;
        return false;
      });
    }

    if (selectedMonth) {
      results = results.filter((r) => r.last_settlement_month === selectedMonth);
    }

    if (filterStatus === 'all') {
      // 전체
    } else if (filterStatus === 'settlement') {
      results = results.filter((r) => r.last_settlement_month !== null);
    } else {
      if (scope === 'settlement') {
        results = results.filter((r) => r.last_settlement_month !== null);
      }

      if (filterStatus === 'complete') {
        results = results.filter((r) =>
          r.cso_company_names.length > 0 && r.registration_status === 'registered'
        );
      } else if (filterStatus === 'not_registered') {
        results = results.filter((r) =>
          r.registration_status === 'unregistered' || r.registration_status === 'pending_approval'
        );
      } else if (filterStatus === 'no_cso') {
        results = results.filter((r) => r.cso_company_names.length === 0);
      } else if (filterStatus === 'unprocessed') {
        results = results.filter((r) =>
          (r.registration_status === 'unregistered' || r.registration_status === 'pending_approval') &&
          r.cso_company_names.length === 0
        );
      }
    }

    return results;
  }, [tableData, searchQuery, filterStatus, scope, selectedMonth]);

  // ── Statistics ──
  const stats: IntegrityStats = useMemo(() => {
    const filteredByMonth = selectedMonth
      ? tableData.filter((r) => r.last_settlement_month === selectedMonth)
      : tableData;

    const total = filteredByMonth.length;
    const settlementData = filteredByMonth.filter((r) => r.last_settlement_month !== null);
    const settlement = settlementData.length;
    const baseData = scope === 'all' ? filteredByMonth : settlementData;

    const complete = baseData.filter((r) =>
      r.cso_company_names.length > 0 && r.registration_status === 'registered'
    ).length;
    const notRegistered = baseData.filter((r) =>
      r.registration_status === 'unregistered' || r.registration_status === 'pending_approval'
    ).length;
    const noCso = baseData.filter((r) => r.cso_company_names.length === 0).length;
    const unprocessed = baseData.filter((r) =>
      (r.registration_status === 'unregistered' || r.registration_status === 'pending_approval') &&
      r.cso_company_names.length === 0
    ).length;

    return { total, settlement, complete, notRegistered, noCso, unprocessed };
  }, [tableData, selectedMonth, scope]);

  const unmappedRegisteredUsers = useMemo(() => {
    return tableData
      .filter((r) => r.registration_status === 'registered' && r.cso_company_names.length === 0)
      .sort((a, b) => (a.business_name ?? '').localeCompare(b.business_name ?? ''));
  }, [tableData]);

  // ── CSO Tag Handlers ──
  const handleAddCSOTag = async (rowId: string, csoName: string) => {
    const row = tableData.find((r) => r.id === rowId);
    if (!row) return;

    if (row.cso_company_names.includes(csoName)) {
      toast({
        variant: 'destructive',
        title: '중복 업체명',
        description: `"${csoName}"은(는) 이미 추가되어 있습니다.`,
      });
      return;
    }

    const existingBizNum = csoMapping[csoName];
    if (existingBizNum && existingBizNum !== row.business_number) {
      toast({
        variant: 'destructive',
        title: '중복 매핑',
        description: `"${csoName}"은(는) 이미 다른 사업자(${formatBusinessNumber(existingBizNum)})에 매핑되어 있습니다.`,
      });
      return;
    }

    setTableData((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cso_company_names: [...r.cso_company_names, csoName], saveState: 'saving' }
          : r
      )
    );

    try {
      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ cso_company_name: csoName, business_number: row.business_number }],
        }),
      });

      const result = await res.json();

      if (result.success) {
        setTableData((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, saveState: 'saved' } : r))
        );
        setCsoMapping((prev) => ({ ...prev, [csoName]: row.business_number }));

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

    const existingBizNum = csoMapping[newName];
    if (existingBizNum && existingBizNum !== row.business_number) {
      toast({
        variant: 'destructive',
        title: '중복 매핑',
        description: `"${newName}"은(는) 이미 다른 사업자(${formatBusinessNumber(existingBizNum)})에 매핑되어 있습니다.`,
      });
      return;
    }

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
      await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cso_company_name: oldName }),
      });

      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
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

    setTableData((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cso_company_names: r.cso_company_names.filter((c) => c !== csoName), saveState: 'saving' }
          : r
      )
    );

    try {
      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
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

  // ── Row Delete Handler ──
  const handleDeleteRow = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      for (const csoName of deleteTarget.cso_company_names) {
        await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
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

  // ── Add New Row Handler ──
  const handleAddNewRow = async () => {
    if (!selectedUnmappedBizNum) {
      toast({ variant: 'destructive', title: '입력 오류', description: '회원을 선택해주세요.' });
      return;
    }
    if (!newCsoName.trim()) {
      toast({ variant: 'destructive', title: '입력 오류', description: 'CSO관리업체명을 입력해주세요.' });
      return;
    }

    setAddingRow(true);
    try {
      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ cso_company_name: newCsoName.trim(), business_number: selectedUnmappedBizNum }],
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast({ title: '추가 완료', description: '새 매핑이 추가되었습니다.' });
        setShowAddDialog(false);
        setSelectedUnmappedBizNum('');
        setNewCsoName('');
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

  // ── Excel Upload ──
  const parseUploadFile = useCallback(async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      const rawItems: MatchingUploadItem[] = [];

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
          rawItems.push({ cso_company_name: companyName, business_number: bizNum });
        }
      }

      const dedupMap = new Map<string, MatchingUploadItem>();
      let dupsRemoved = 0;
      for (const item of rawItems) {
        const key = item.cso_company_name;
        const existing = dedupMap.get(key);
        if (existing && existing.business_number === item.business_number) {
          dupsRemoved++;
        } else {
          dedupMap.set(key, item);
        }
      }

      const items = Array.from(dedupMap.values());
      setUploadRawCount(rawItems.length);
      setUploadDuplicatesRemoved(dupsRemoved);
      setUploadPreview(items);

      if (items.length === 0) {
        toast({ variant: 'destructive', title: '파싱 오류', description: '유효한 매칭 데이터를 찾을 수 없습니다.' });
      } else if (dupsRemoved > 0) {
        toast({
          title: '중복 제거',
          description: `파일 내 동일 항목 ${dupsRemoved}건이 제거되었습니다. (${rawItems.length}건 → ${items.length}건)`,
        });
      }
    } catch (error) {
      console.error('File parse error:', error);
      toast({ variant: 'destructive', title: '파일 오류', description: '엑셀 파일을 읽는 중 오류가 발생했습니다.' });
    }
  }, [toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadFile(file);
      parseUploadFile(file);
    }
  }, [parseUploadFile]);

  const dropzone = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 4 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (uploadPreview.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: uploadPreview }),
      });

      setUploadProgress(100);

      const result = await res.json();

      if (result.success) {
        const { inserted, skipped, conflicts } = result.data;
        const parts: string[] = [];
        if (inserted > 0) parts.push(`신규 ${inserted}건 추가`);
        if (skipped > 0) parts.push(`동일 ${skipped}건 스킵`);

        toast({
          title: '업로드 완료',
          description: parts.join(', ') || '변경 사항이 없습니다.',
        });

        if (conflicts && conflicts.length > 0) {
          toast({
            variant: 'destructive',
            title: `사업자번호 불일치 ${conflicts.length}건`,
            description: `다음 CSO명은 기존과 다른 사업자번호로 등록 시도되어 스킵됩니다 (삭제 후 재등록 필요): ${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? ` 외 ${conflicts.length - 5}건` : ''}`,
          });
        }

        setShowUploadDialog(false);
        setUploadFile(null);
        setUploadPreview([]);
        setUploadDuplicatesRemoved(0);
        setUploadRawCount(0);
        fetchIntegrityData();
      } else {
        toast({ variant: 'destructive', title: '업로드 실패', description: result.error });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: '오류', description: '매칭 데이터 업로드 중 오류가 발생했습니다.' });
    } finally {
      if (progressInterval) clearInterval(progressInterval);
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
          '가입 상태': r.registration_status === 'registered' ? '가입완료' : '미가입',
          'CSO 매핑': r.cso_company_names.join(', ') || '-',
          '마지막정산월': r.last_settlement_month || '-',
          '정산건수': r.row_count,
        }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '문제항목');

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `거래처매핑_문제항목_${today}.xlsx`);

      toast({
        title: '다운로드 완료',
        description: `${exportData.length}건의 문제 항목이 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: '다운로드 실패', description: '엑셀 파일 생성 중 오류가 발생했습니다.' });
    }
  };

  // ── Search Handlers ──
  const handleSearch = () => setSearchQuery(searchInput);
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };
  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const clearUploadFile = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setUploadDuplicatesRemoved(0);
    setUploadRawCount(0);
  };

  return {
    // Loading
    loading,
    // Data
    filteredData,
    stats,
    csoMapping,
    unmappedRegisteredUsers,
    availableMonths,
    // Filters
    searchInput,
    setSearchInput,
    searchQuery,
    scope,
    setScope,
    filterStatus,
    setFilterStatus,
    selectedMonth,
    setSelectedMonth,
    handleSearch,
    handleSearchKeyDown,
    clearSearch,
    // CSO tag
    handleAddCSOTag,
    handleEditCSOTag,
    handleDeleteCSOTag,
    // Row operations
    fetchIntegrityData,
    handleDeleteRow,
    handleAddNewRow,
    handleExportIssues,
    // Delete dialog
    showDeleteDialog,
    setShowDeleteDialog,
    deleteTarget,
    setDeleteTarget,
    deleting,
    // Add dialog
    showAddDialog,
    setShowAddDialog,
    selectedUnmappedBizNum,
    setSelectedUnmappedBizNum,
    newCsoName,
    setNewCsoName,
    addingRow,
    // Upload
    showUploadDialog,
    setShowUploadDialog,
    uploadFile,
    uploading,
    uploadProgress,
    uploadPreview,
    uploadDuplicatesRemoved,
    uploadRawCount,
    handleUpload,
    clearUploadFile,
    dropzone,
  };
}
