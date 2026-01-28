'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns, GripVertical, Save, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/shared/loading';
import { useToast } from '@/hooks/use-toast';
import type { ColumnSetting } from '@/types';

interface SortableColumnProps {
  column: ColumnSetting;
  onToggleVisible: (key: string) => void;
  onToggleRequired: (key: string) => void;
  onChangeName: (key: string, name: string) => void;
}

function SortableColumn({ 
  column, 
  onToggleVisible, 
  onToggleRequired, 
  onChangeName 
}: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.column_key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-4 p-3 bg-white border rounded-lg
        ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}
        ${!column.is_visible ? 'opacity-60' : ''}
      `}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Order Number */}
      <span className="w-6 text-sm text-muted-foreground text-center">
        {column.display_order}
      </span>

      {/* Visible Checkbox */}
      <Checkbox
        checked={column.is_visible}
        onCheckedChange={() => onToggleVisible(column.column_key)}
      />

      {/* Column Key */}
      <span className="w-32 text-sm font-mono text-muted-foreground truncate">
        {column.column_key}
      </span>

      {/* Display Name Input */}
      <Input
        value={column.display_name}
        onChange={(e) => onChangeName(column.column_key, e.target.value)}
        className="flex-1 max-w-xs"
        placeholder="표시명"
      />

      {/* Required Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id={`required-${column.column_key}`}
          checked={column.is_required}
          onCheckedChange={() => onToggleRequired(column.column_key)}
          disabled={!column.is_visible}
        />
        <Label 
          htmlFor={`required-${column.column_key}`}
          className="text-sm text-muted-foreground"
        >
          필수
        </Label>
      </div>
    </div>
  );
}

export default function ColumnsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/columns');
      const result = await response.json();
      
      if (result.success) {
        setColumns(result.data);
      }
    } catch (error) {
      console.error('Fetch columns error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((i) => i.column_key === active.id);
        const newIndex = items.findIndex((i) => i.column_key === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update display_order
        return newItems.map((item, index) => ({
          ...item,
          display_order: index + 1,
        }));
      });
      setHasChanges(true);
    }
  };

  const toggleVisible = (key: string) => {
    setColumns(prev => prev.map(col => {
      if (col.column_key === key) {
        return {
          ...col,
          is_visible: !col.is_visible,
          is_required: !col.is_visible ? col.is_required : false,
        };
      }
      return col;
    }));
    setHasChanges(true);
  };

  const toggleRequired = (key: string) => {
    setColumns(prev => prev.map(col => {
      if (col.column_key === key && col.is_visible) {
        return { ...col, is_required: !col.is_required };
      }
      return col;
    }));
    setHasChanges(true);
  };

  const changeName = (key: string, name: string) => {
    setColumns(prev => prev.map(col => {
      if (col.column_key === key) {
        return { ...col, display_name: name };
      }
      return col;
    }));
    setHasChanges(true);
  };

  const showAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, is_visible: true })));
    setHasChanges(true);
  };

  const hideAll = () => {
    setColumns(prev => prev.map(col => ({ 
      ...col, 
      is_visible: false,
      is_required: false,
    })));
    setHasChanges(true);
  };

  const resetDefaults = async () => {
    try {
      const response = await fetch('/api/columns', { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        await fetchColumns();
        setHasChanges(false);
        toast({
          title: '초기화 완료',
          description: '컬럼 설정이 기본값으로 초기화되었습니다.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '초기화 중 오류가 발생했습니다.',
      });
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns }),
      });

      const result = await response.json();

      if (result.success) {
        setHasChanges(false);
        toast({
          title: '저장 완료',
          description: '컬럼 설정이 저장되었습니다.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '컬럼 설정 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="컬럼 설정을 불러오는 중..." />;
  }

  const visibleCount = columns.filter(c => c.is_visible).length;
  const requiredCount = columns.filter(c => c.is_required).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Columns className="h-6 w-6" />
            컬럼 설정
          </h1>
          <p className="text-muted-foreground">업체에게 보여줄 컬럼을 설정합니다.</p>
        </div>
        <Button 
          onClick={saveChanges} 
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          저장
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">
          전체: <strong>{columns.length}</strong>개
        </span>
        <span className="text-muted-foreground">
          표시: <strong>{visibleCount}</strong>개
        </span>
        <span className="text-muted-foreground">
          필수: <strong>{requiredCount}</strong>개
        </span>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">일괄 작업</CardTitle>
          <CardDescription>드래그로 순서 변경, 체크박스로 표시 여부 설정</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" size="sm" onClick={showAll}>
            전체 표시
          </Button>
          <Button variant="outline" size="sm" onClick={hideAll}>
            전체 숨김
          </Button>
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            기본값 복원
          </Button>
        </CardContent>
      </Card>

      {/* Column List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
            <span className="w-6"></span>
            <span className="w-6">#</span>
            <span className="w-6">표시</span>
            <span className="w-32">컬럼 키</span>
            <span className="flex-1 max-w-xs">표시명</span>
            <span>필수</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map(c => c.column_key)}
              strategy={verticalListSortingStrategy}
            >
              {columns.map((column) => (
                <SortableColumn
                  key={column.column_key}
                  column={column}
                  onToggleVisible={toggleVisible}
                  onToggleRequired={toggleRequired}
                  onChangeName={changeName}
                />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}
