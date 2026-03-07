'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import { UserCheck, UserX, Clock, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IntegrityRow, RegistrationStatus } from './types';

export function formatBusinessNumber(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 10);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
}

// MappingStatusIcon — 원본 96~111줄 그대로
export const MappingStatusIcon = memo(function MappingStatusIcon({ row }: { row: IntegrityRow }) {
  const hasCSO = row.cso_company_names.length > 0;
  const isRegistered = row.registration_status === 'registered';

  if (isRegistered && hasCSO) {
    return <span className="text-green-500 text-base" title="처리 완료">✅</span>;
  }

  if (!isRegistered || !hasCSO) {
    return <span className="text-amber-500 text-base" title="미완료">⚠️</span>;
  }

  return <span className="text-red-500 text-base" title="오류">❌</span>;
});

// StatusBadge — 원본 116~142줄 그대로
export function StatusBadge({ status }: { status: RegistrationStatus }) {
  switch (status) {
    case 'registered':
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white font-medium px-2 py-0.5 text-xs">
          <UserCheck className="h-3 w-3 mr-1" />
          가입완료
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

// CSOTag — 원본 156~225줄 그대로
interface CSOTagProps {
  value: string;
  isDuplicate: boolean;
  duplicateInfo?: string;
  onEdit: (newValue: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function CSOTag({ value, isDuplicate, duplicateInfo, onEdit, onDelete, disabled }: CSOTagProps) {
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
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer transition-all",
        isDuplicate
          ? "bg-orange-100 border-2 border-orange-400 text-orange-800"
          : "bg-blue-100 text-blue-800 hover:bg-blue-200"
      )}
      onClick={() => !disabled && setIsEditing(true)}
      title={isDuplicate && duplicateInfo ? `다른 사업자에 매핑됨: ${duplicateInfo}` : undefined}
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
  );
}

// AddCSOInput — 원본 235~294줄 그대로
interface AddCSOInputProps {
  onAdd: (value: string) => void;
  disabled?: boolean;
}

export function AddCSOInput({ onAdd, disabled }: AddCSOInputProps) {
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
