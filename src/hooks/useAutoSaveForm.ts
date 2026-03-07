import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_STATUS_RESET_MS = 2000;

interface UseAutoSaveFormOptions<T> {
  defaultValues: T;
  mergeServerData?: (serverData: Record<string, unknown>, defaults: T) => T;
  saveMethod?: 'PUT' | 'PATCH';
  saveSuccessMessage?: string;
}

/** company settings API에 JSON 요청 후 결과 반환 */
async function fetchCompanySettings(
  method: string,
  body: unknown,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(API_ROUTES.SETTINGS.COMPANY, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

interface FetchInitialDataParams<T> {
  defaultValues: T;
  mergeServerData: UseAutoSaveFormOptions<T>['mergeServerData'];
  setFormData: (data: T) => void;
  initialDataRef: React.MutableRefObject<T>;
  setLoading: (v: boolean) => void;
}

/** 초기 데이터 로딩 */
function useFetchInitialData<T>({
  defaultValues, mergeServerData, setFormData, initialDataRef, setLoading,
}: FetchInitialDataParams<T>) {
  useEffect(() => {
    fetch(API_ROUTES.SETTINGS.COMPANY, { cache: 'no-store' })
      .then(r => r.json())
      .then((result) => {
        if (result.success && result.data) {
          const merged = mergeServerData
            ? mergeServerData(result.data, defaultValues)
            : { ...defaultValues, ...result.data } as T;
          setFormData(merged);
          initialDataRef.current = merged;
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * 관리자 설정 폼의 자동저장 공통 로직
 * - fetch -> merge -> patchFields (blur) -> handleSave (전체 저장)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAutoSaveForm<T extends Record<string, any>>({
  defaultValues,
  mergeServerData,
  saveMethod = 'PATCH',
  saveSuccessMessage = '설정이 저장되었습니다.',
}: UseAutoSaveFormOptions<T>) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<T>(defaultValues);
  const initialDataRef = useRef<T>(defaultValues);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useFetchInitialData({ defaultValues, mergeServerData, setFormData, initialDataRef, setLoading });

  const handleChange = useCallback(
    (field: keyof T, value: string | number | boolean) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    },
    [],
  );

  const patchFields = useCallback(
    async (fields: Partial<T>) => {
      setSaveStatus('saving');
      try {
        const result = await fetchCompanySettings('PATCH', fields);
        if (result.success) {
          initialDataRef.current = { ...initialDataRef.current, ...fields };
          setSaveStatus('saved');
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), SAVE_STATUS_RESET_MS);
        } else {
          setSaveStatus('error');
          toast({ variant: 'destructive', title: '저장 실패', description: result.error });
        }
      } catch (error) {
        console.error('자동 저장 오류:', error);
        setSaveStatus('error');
        toast({ variant: 'destructive', title: '오류', description: '저장 중 오류가 발생했습니다.' });
      }
    },
    [toast],
  );

  const handleBlur = useCallback(
    (field: keyof T) => {
      if (formData[field] !== initialDataRef.current[field]) {
        patchFields({ [field]: formData[field] } as Partial<T>);
      }
    },
    [formData, patchFields],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = await fetchCompanySettings(saveMethod, formData);
      if (result.success) {
        initialDataRef.current = { ...formData };
        toast({ title: '저장 완료', description: saveSuccessMessage });
      } else {
        toast({ variant: 'destructive', title: '저장 실패', description: result.error });
      }
    } catch (error) {
      console.error('설정 저장 오류:', error);
      toast({ variant: 'destructive', title: '오류', description: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  }, [formData, saveMethod, saveSuccessMessage, toast]);

  const handleChangeAndSave = useCallback(
    (field: keyof T, value: string | number | boolean) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      patchFields({ [field]: value } as Partial<T>);
    },
    [patchFields],
  );

  return {
    loading, saving, formData, setFormData, saveStatus,
    initialDataRef, handleChange, handleBlur, handleSave,
    handleChangeAndSave, patchFields,
  };
}
