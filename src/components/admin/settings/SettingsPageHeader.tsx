'use client';

import { Loader2, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SaveStatus } from '@/hooks/useAutoSaveForm';

interface SettingsPageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  loading: boolean;
  saving: boolean;
  saveStatus: SaveStatus;
  onSave: () => void;
}

export function SettingsPageHeader({
  icon,
  title,
  description,
  loading,
  saving,
  saveStatus,
  onSave,
}: SettingsPageHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {icon}
          {title}
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {saveStatus === 'saving' && (
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            저장 중...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-sm text-green-600 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            저장됨
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm text-red-600">저장 실패</span>
        )}
        <Button onClick={onSave} variant="outline" size="sm" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          전체 저장
        </Button>
      </div>
    </div>
  );
}
