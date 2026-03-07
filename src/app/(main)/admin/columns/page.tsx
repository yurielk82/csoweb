'use client';

import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns, GripVertical, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useColumnSettings } from '@/hooks/useColumnSettings';
import { ColumnStatsBar, SummaryInfoCard, BatchActionsCard } from '@/components/admin/columns/ColumnInfoCards';
import type { ColumnSetting } from '@/types';
import { NUMERIC_COLUMN_KEYS } from '@/types';

interface SortableColumnProps {
  column: ColumnSetting;
  onToggleVisible: (key: string) => void;
  onToggleRequired: (key: string) => void;
  onToggleSummary: (key: string) => void;
  onChangeName: (key: string, name: string) => void;
}

function SortableColumn({ column, onToggleVisible, onToggleRequired, onToggleSummary, onChangeName }: SortableColumnProps) {
  const isNumeric = NUMERIC_COLUMN_KEYS.includes(column.column_key);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.column_key });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className={`flex items-center gap-4 p-3 bg-white border rounded-lg ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''} ${!column.is_visible ? 'opacity-60' : ''}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="w-6 text-sm text-muted-foreground text-center">{column.display_order}</span>
      <Checkbox checked={column.is_visible} onCheckedChange={() => onToggleVisible(column.column_key)} />
      <span className="w-32 text-sm font-mono text-muted-foreground truncate">{column.column_key}</span>
      <Input value={column.column_name} onChange={(e) => onChangeName(column.column_key, e.target.value)} className="flex-1 max-w-xs" placeholder="표시명" />
      <div className="flex items-center gap-2">
        <Checkbox id={`required-${column.column_key}`} checked={column.is_required} onCheckedChange={() => onToggleRequired(column.column_key)} disabled={!column.is_visible} />
        <Label htmlFor={`required-${column.column_key}`} className="text-sm text-muted-foreground">필수</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={`summary-${column.column_key}`} checked={column.is_summary || false} onCheckedChange={() => onToggleSummary(column.column_key)} disabled={!isNumeric} />
        <Label htmlFor={`summary-${column.column_key}`} className={`text-sm ${isNumeric ? 'text-blue-600' : 'text-muted-foreground'}`}>합계</Label>
      </div>
    </div>
  );
}

export default function ColumnsPage() {
  const c = useColumnSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Columns className="h-6 w-6" />컬럼 설정
            {c.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground">업체에게 보여줄 컬럼을 설정합니다.</p>
        </div>
        <Button onClick={c.saveChanges} disabled={!c.hasChanges || c.saving}>
          {c.saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}저장
        </Button>
      </div>
      <ColumnStatsBar total={c.columns.length} visible={c.visibleCount} required={c.requiredCount} summary={c.summaryCount} />
      <SummaryInfoCard />
      <BatchActionsCard onShowAll={c.showAll} onHideAll={c.hideAll} onReset={c.resetDefaults} />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
            <span className="w-6"></span><span className="w-6">#</span><span className="w-6">표시</span>
            <span className="w-32">컬럼 키</span><span className="flex-1 max-w-xs">표시명</span><span>필수</span><span className="text-blue-600">합계</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <DndContext sensors={c.sensors} collisionDetection={closestCenter} onDragEnd={c.handleDragEnd}>
            <SortableContext items={c.columns.map(col => col.column_key)} strategy={verticalListSortingStrategy}>
              {c.loading && c.columns.length === 0 && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />컬럼 설정을 불러오는 중...
                </div>
              )}
              {c.columns.map(column => (
                <SortableColumn key={column.column_key} column={column} onToggleVisible={c.toggleVisible} onToggleRequired={c.toggleRequired} onToggleSummary={c.toggleSummary} onChangeName={c.changeName} />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}
