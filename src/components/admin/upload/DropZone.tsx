import { FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BYTES_PER_KB } from '@/constants/defaults';

interface DropZoneProps {
  file: File | null;
  uploading: boolean;
  previewing: boolean;
  progress: number;
  getRootProps: () => Record<string, unknown>;
  getInputProps: () => Record<string, unknown>;
  isDragActive: boolean;
  onRemoveFile: () => void;
}

export function DropZone({
  file,
  uploading,
  previewing,
  progress,
  getRootProps,
  getInputProps,
  isDragActive,
  onRemoveFile,
}: DropZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">파일 업로드</CardTitle>
        <CardDescription>엑셀 파일(.xlsx, .xls)을 선택하거나 드래그하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
            `}
          >
            <input {...getInputProps()} accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" capture={undefined} />
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-primary">파일을 여기에 놓으세요...</p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  .xlsx, .xls (최대 4MB)
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / BYTES_PER_KB / BYTES_PER_KB).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemoveFile}
              disabled={uploading || previewing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              업로드 중... {progress}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
