'use client';

import type { IntegrityRow, MatchingUploadItem, IntegrityStats, FilterStatus } from '@/components/admin/settlement-integrity/types';

// ── Shared types for integrity sub-hooks ──

export type ToastFn = (opts: {
  variant?: 'default' | 'destructive';
  title: string;
  description?: string;
}) => void;

export type SetTableData = React.Dispatch<React.SetStateAction<IntegrityRow[]>>;
export type SetCsoMapping = React.Dispatch<React.SetStateAction<Record<string, string>>>;

export type { IntegrityRow, MatchingUploadItem, IntegrityStats, FilterStatus };
