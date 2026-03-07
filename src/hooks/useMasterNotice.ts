'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_NOTICE_CONTENT } from '@/constants/defaults';
import { API_ROUTES } from '@/constants/api';

export interface NoticeSettings {
  notice_content: string;
  ceo_name: string;
}

/**
 * 정산서 Notice 편집/저장 훅
 */
export function useMasterNotice(selectedMonth: string) {
  const { toast } = useToast();
  const [noticeSettings, setNoticeSettings] = useState<NoticeSettings | null>(null);
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
  const [noticeEditContent, setNoticeEditContent] = useState('');
  const [noticeSaving, setNoticeSaving] = useState(false);

  const initNotice = useCallback((notice: NoticeSettings) => {
    setNoticeSettings(notice);
  }, []);

  const replaceNoticeVars = useCallback((text: string) => {
    if (!selectedMonth) return text;
    const [, monthStr] = selectedMonth.split('-');
    const month = Number(monthStr);
    const ceoName = noticeSettings?.ceo_name || '대표자';
    return text
      .replace(/{{정산월}}/g, `${month}월`)
      .replace(/{{정산월\+1}}/g, `${month === 12 ? 1 : month + 1}월`)
      .replace(/{{대표자명}}/g, ceoName);
  }, [selectedMonth, noticeSettings?.ceo_name]);

  const openNoticeDialog = useCallback(() => {
    setNoticeEditContent(noticeSettings?.notice_content || DEFAULT_NOTICE_CONTENT);
    setNoticeDialogOpen(true);
  }, [noticeSettings?.notice_content]);

  const handleNoticeSave = useCallback(async () => {
    setNoticeSaving(true);
    try {
      const res = await fetch(API_ROUTES.SETTINGS.COMPANY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notice_content: noticeEditContent }),
      });
      const result = await res.json();
      if (result.success) {
        setNoticeSettings(prev => prev
          ? { ...prev, notice_content: noticeEditContent }
          : { notice_content: noticeEditContent, ceo_name: '' });
        setNoticeDialogOpen(false);
        toast({ title: '저장 완료', description: 'Notice가 저장되었습니다.' });
      } else {
        toast({ variant: 'destructive', title: '저장 실패', description: result.error });
      }
    } catch (error) {
      console.error('Notice 저장 오류:', error);
      toast({ variant: 'destructive', title: '오류', description: '저장 중 오류가 발생했습니다.' });
    } finally {
      setNoticeSaving(false);
    }
  }, [noticeEditContent, toast]);

  return {
    noticeSettings, initNotice,
    noticeDialogOpen, setNoticeDialogOpen,
    noticeEditContent, setNoticeEditContent, noticeSaving,
    replaceNoticeVars, openNoticeDialog, handleNoticeSave,
  };
}
