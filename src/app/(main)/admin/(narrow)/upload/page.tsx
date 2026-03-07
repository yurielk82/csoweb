'use client';

import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFileUpload } from '@/hooks/useFileUpload';
import { DropZone } from '@/components/admin/upload/DropZone';
import { MappingDialog } from '@/components/admin/upload/MappingDialog';
import { UploadResultCard } from '@/components/admin/upload/UploadResultCard';
import { EmailDialog } from '@/components/admin/upload/EmailDialog';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export default function UploadPage() {
  const up = useFileUpload();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: up.onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
  });

  return (
    <div className="space-y-6">
      <PageHeader />

      <DropZone
        file={up.file}
        uploading={up.uploading}
        previewing={up.previewing}
        progress={up.progress}
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
        onRemoveFile={up.removeFile}
      />

      <UploadActionButtons
        file={up.file}
        uploading={up.uploading}
        previewing={up.previewing}
        previewData={up.previewData}
        onPreview={up.handlePreview}
        onUpload={up.handleUpload}
        onShowMapping={() => up.setShowMappingDialog(true)}
      />

      {up.result && <UploadResultCard result={up.result} />}

      <UploadGuide />

      <MappingDialog
        open={up.showMappingDialog}
        onOpenChange={up.setShowMappingDialog}
        previewData={up.previewData}
        mappings={up.mappings}
        requiredColumnsMapped={up.requiredColumnsMapped}
        uploading={up.uploading}
        onMappingChange={up.handleMappingChange}
        onUpload={up.handleUpload}
      />

      <EmailDialog
        open={up.showEmailDialog}
        onOpenChange={up.setShowEmailDialog}
        result={up.result}
        sendingEmail={up.sendingEmail}
        onSendEmail={up.handleSendEmail}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Upload className="h-6 w-6" />
        정산서 업로드
      </h1>
      <p className="text-muted-foreground">정산서 데이터를 업로드합니다.</p>
    </div>
  );
}

interface UploadActionButtonsProps {
  file: File | null;
  uploading: boolean;
  previewing: boolean;
  previewData: unknown;
  onPreview: () => void;
  onUpload: () => void;
  onShowMapping: () => void;
}

function UploadActionButtons({ file, uploading, previewing, previewData, onPreview, onUpload, onShowMapping }: UploadActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={onPreview}
        disabled={!file || uploading || previewing}
        className="flex-1"
        size="lg"
      >
        {previewing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />분석 중...</>
        ) : (
          <><FileSpreadsheet className="mr-2 h-4 w-4" />컬럼 매핑 확인</>
        )}
      </Button>
      <Button
        onClick={previewData ? onShowMapping : onUpload}
        disabled={!file || uploading || previewing}
        className="flex-1"
        size="lg"
      >
        {uploading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />업로드 중...</>
        ) : (
          <><Upload className="mr-2 h-4 w-4" />{previewData ? '매핑 확인 후 업로드' : '바로 업로드'}</>
        )}
      </Button>
    </div>
  );
}

function UploadGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">업로드 안내</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>• 엑셀 파일의 첫 번째 시트 데이터만 업로드됩니다.</p>
        <p>• 필수 컬럼: <strong>사업자번호</strong>, <strong>정산월</strong></p>
        <p>• <strong>컬럼 매핑 확인</strong>을 클릭하면 컬럼을 수동으로 매핑할 수 있습니다.</p>
        <p>• 컬럼명이 다르더라도 자동으로 유사한 컬럼을 찾아 매핑합니다.</p>
        <p>• 같은 정산월 데이터를 다시 업로드하면 기존 데이터가 교체됩니다.</p>
      </CardContent>
    </Card>
  );
}
