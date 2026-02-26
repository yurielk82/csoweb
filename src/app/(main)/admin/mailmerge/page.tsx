'use client';

import { MailPlus, Send, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMailMerge } from '@/hooks/useMailMerge';
import { RecipientCard, EmailContentCard } from '@/components/admin/mailmerge/MailMergeForm';
import { PreviewDialog } from '@/components/admin/mailmerge/PreviewDialog';
import { ProgressPanel } from '@/components/admin/mailmerge/ProgressPanel';
import { SendResult } from '@/components/admin/mailmerge/SendResult';

export default function MailMergePage() {
  const {
    // 수신 대상 상태
    recipientType,
    setRecipientType,
    selectedYearMonth,
    setSelectedYearMonth,
    includeSettlementTable,
    setIncludeSettlementTable,
    sections,
    yearMonthOptions,

    // 메일 내용 상태
    subject,
    setSubject,
    body,
    setBody,

    // 미리보기 상태
    preview,
    previewOpen,
    setPreviewOpen,
    testSending,
    testCompanies,
    selectedTestBn,

    // 수신 대상 수
    recipientCount,
    loadingCount,

    // 발송 상태
    sending,
    progress,
    sendLogs,
    result,
    logsEndRef,

    // 계산값
    progressPercent,
    remainingTime,

    // 핸들러
    insertVariable,
    toggleSection,
    moveSection,
    handlePreview,
    handleTestCompanyChange,
    handleTestSend,
    handleSend,
    handleCancel,
    formatTime,
  } = useMailMerge();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MailPlus className="h-6 w-6" />
          메일머지
        </h1>
        <p className="text-muted-foreground">업체들에게 개인화된 이메일을 일괄 발송합니다.</p>
      </div>

      {/* 수신 대상 선택 */}
      <RecipientCard
        recipientType={recipientType}
        setRecipientType={setRecipientType}
        selectedYearMonth={selectedYearMonth}
        setSelectedYearMonth={setSelectedYearMonth}
        includeSettlementTable={includeSettlementTable}
        setIncludeSettlementTable={setIncludeSettlementTable}
        sections={sections}
        yearMonthOptions={yearMonthOptions}
        toggleSection={toggleSection}
        moveSection={moveSection}
        recipientCount={recipientCount}
        loadingCount={loadingCount}
        sending={sending}
      />

      {/* 메일 작성 */}
      <EmailContentCard
        subject={subject}
        setSubject={setSubject}
        body={body}
        setBody={setBody}
        insertVariable={insertVariable}
        sending={sending}
      />

      {/* 진행률 패널 */}
      {(sending || result) && progress && (
        <ProgressPanel
          sending={sending}
          progress={progress}
          result={result}
          sendLogs={sendLogs}
          logsEndRef={logsEndRef}
          progressPercent={progressPercent}
          remainingTime={remainingTime}
          formatTime={formatTime}
          onCancel={handleCancel}
        />
      )}

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handlePreview} disabled={sending}>
          <Eye className="h-4 w-4 mr-2" />미리보기
        </Button>
        <Button onClick={handleSend} disabled={sending || (recipientType === 'year_month' && !selectedYearMonth)}>
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          발송하기
        </Button>
      </div>

      {/* 발송 결과 */}
      {result && !sending && <SendResult result={result} />}

      {/* 미리보기 다이얼로그 */}
      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        testCompanies={testCompanies}
        selectedTestBn={selectedTestBn}
        onTestCompanyChange={handleTestCompanyChange}
        testSending={testSending}
        onTestSend={handleTestSend}
      />
    </div>
  );
}
