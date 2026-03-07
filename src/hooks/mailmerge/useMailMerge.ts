import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';

import type { SectionId, EmailSection } from './types';
import { DEFAULT_SECTIONS, formatTime } from './types';
import { buildRecipientParams } from './useMailMergePreview';
import { useMailMergePreview } from './useMailMergePreview';
import { useMailMergeSend } from './useMailMergeSend';

// ── Hook ──

export function useMailMerge() {
  const { toast } = useToast();

  // 수신 대상
  const [recipientType, setRecipientType] = useState<'all' | 'year_month'>('all');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
  const [includeSettlementTable, setIncludeSettlementTable] = useState(false);
  const [sections, setSections] = useState<EmailSection[]>(DEFAULT_SECTIONS);

  // 메일 내용
  const [subject, setSubject] = useState('{{정산월}} 정산 안내 - {{업체명}}');
  const [body, setBody] = useState(`{{업체명}} 담당자님께,

{{정산월}} 정산 내역을 안내드립니다.

★ 총 수수료(세금계산서 발행 금액): {{총_수수료}}

자세한 내용은 정산서 포털에서 확인해 주세요.

감사합니다.`);

  // 수신 대상 수
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // 정산월 옵션
  const [yearMonthOptions, setYearMonthOptions] = useState<string[]>([]);

  // ── Effects ──

  useEffect(() => {
    async function fetchAvailableMonths() {
      try {
        const res = await fetch(`${API_ROUTES.EMAIL.MAILMERGE}?type=available_months`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data.months)) {
          setYearMonthOptions(data.data.months);
        }
      } catch (error) {
        console.error('정산월 목록 조회 오류:', error);
      }
    }
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    if (recipientType !== 'year_month') {
      setIncludeSettlementTable(false);
      setSections(DEFAULT_SECTIONS);
    }
  }, [recipientType]);

  const fetchRecipientCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const params = buildRecipientParams(recipientType, selectedYearMonth);
      if (!params) {
        setRecipientCount(null);
        setLoadingCount(false);
        return;
      }
      const res = await fetch(`${API_ROUTES.EMAIL.MAILMERGE}?${params.toString()}`);
      const data = await res.json();
      if (data.success) setRecipientCount(data.data.count);
    } catch (error) {
      console.error('수신 대상 수 조회 오류:', error);
      setRecipientCount(null);
    } finally {
      setLoadingCount(false);
    }
  }, [recipientType, selectedYearMonth]);

  useEffect(() => { fetchRecipientCount(); }, [fetchRecipientCount]);

  // ── 유틸리티 ──

  const insertVariable = (key: string, target: 'subject' | 'body') => {
    const variable = `{{${key}}}`;
    if (target === 'subject') setSubject(prev => prev + variable);
    else setBody(prev => prev + variable);
  };

  const toggleSection = (id: SectionId) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    const newSections = [...sections];
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    setSections(newSections);
  };

  // ── Sub-hooks ──

  const sharedDeps = { subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections, toast };
  const previewHook = useMailMergePreview(sharedDeps);
  const sendHook = useMailMergeSend(sharedDeps);

  // sendLogs 스크롤 자동 추적
  useEffect(() => {
    sendHook.logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sendHook.sendLogs, sendHook.logsEndRef]);

  // ── 반환 ──

  return {
    recipientType, setRecipientType,
    selectedYearMonth, setSelectedYearMonth,
    includeSettlementTable, setIncludeSettlementTable,
    sections, yearMonthOptions,
    subject, setSubject,
    body, setBody,
    recipientCount, loadingCount,
    insertVariable, toggleSection, moveSection,
    formatTime,
    ...previewHook,
    ...sendHook,
  };
}
