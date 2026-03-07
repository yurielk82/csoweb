'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { API_ROUTES } from '@/constants/api';
import type { MatchingUploadItem, ToastFn } from './types';
import { parseMatchingFile, handleUploadSuccess } from './helpers';

const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;

export function useIntegrityUpload(toast: ToastFn, fetchIntegrityData: () => Promise<void>) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPreview, setUploadPreview] = useState<MatchingUploadItem[]>([]);
  const [uploadDuplicatesRemoved, setUploadDuplicatesRemoved] = useState(0);
  const [uploadRawCount, setUploadRawCount] = useState(0);

  const parseUploadFile = useCallback(async (file: File) => {
    try {
      const { items, rawCount, dupsRemoved } = await parseMatchingFile(file, toast);
      setUploadRawCount(rawCount);
      setUploadDuplicatesRemoved(dupsRemoved);
      setUploadPreview(items);
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
    maxSize: MAX_UPLOAD_SIZE,
  });

  const handleUpload = async () => {
    if (uploadPreview.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    try {
      progressInterval = setInterval(() => setUploadProgress(prev => Math.min(prev + 10, 90)), 200);

      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: uploadPreview }),
      });
      setUploadProgress(100);
      const result = await res.json();

      if (result.success) {
        handleUploadSuccess(result, toast);
        setShowUploadDialog(false);
        clearUploadFile();
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

  const clearUploadFile = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setUploadDuplicatesRemoved(0);
    setUploadRawCount(0);
  };

  return {
    showUploadDialog, setShowUploadDialog,
    uploadFile, uploading, uploadProgress,
    uploadPreview, uploadDuplicatesRemoved, uploadRawCount,
    handleUpload, clearUploadFile, dropzone,
  };
}
