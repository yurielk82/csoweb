'use client';

import { MailPlus, Send, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMailMerge } from '@/hooks/mailmerge';
import { RecipientCard, EmailContentCard } from '@/components/admin/mailmerge/MailMergeForm';
import { PreviewDialog } from '@/components/admin/mailmerge/PreviewDialog';
import { ProgressPanel } from '@/components/admin/mailmerge/ProgressPanel';
import { SendResult } from '@/components/admin/mailmerge/SendResult';

export default function MailMergePage() {
  const mm = useMailMerge();

  return (
    <div className="space-y-6">
      <PageHeader />

      <RecipientCard
        recipientType={mm.recipientType}
        setRecipientType={mm.setRecipientType}
        selectedYearMonth={mm.selectedYearMonth}
        setSelectedYearMonth={mm.setSelectedYearMonth}
        includeSettlementTable={mm.includeSettlementTable}
        setIncludeSettlementTable={mm.setIncludeSettlementTable}
        sections={mm.sections}
        yearMonthOptions={mm.yearMonthOptions}
        toggleSection={mm.toggleSection}
        moveSection={mm.moveSection}
        recipientCount={mm.recipientCount}
        loadingCount={mm.loadingCount}
        sending={mm.sending}
      />

      <EmailContentCard
        subject={mm.subject}
        setSubject={mm.setSubject}
        body={mm.body}
        setBody={mm.setBody}
        insertVariable={mm.insertVariable}
        sending={mm.sending}
      />

      {(mm.sending || mm.result) && mm.progress && (
        <ProgressPanel
          sending={mm.sending}
          progress={mm.progress}
          result={mm.result}
          sendLogs={mm.sendLogs}
          logsEndRef={mm.logsEndRef}
          progressPercent={mm.progressPercent}
          remainingTime={mm.remainingTime}
          formatTime={mm.formatTime}
          onCancel={mm.handleCancel}
        />
      )}

      <ActionButtons
        sending={mm.sending}
        recipientType={mm.recipientType}
        selectedYearMonth={mm.selectedYearMonth}
        onPreview={mm.handlePreview}
        onSend={mm.handleSend}
      />

      {mm.result && !mm.sending && <SendResult result={mm.result} />}

      <PreviewDialog
        open={mm.previewOpen}
        onOpenChange={mm.setPreviewOpen}
        preview={mm.preview}
        testCompanies={mm.testCompanies}
        selectedTestBn={mm.selectedTestBn}
        onTestCompanyChange={mm.handleTestCompanyChange}
        testSending={mm.testSending}
        onTestSend={mm.handleTestSend}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MailPlus className="h-6 w-6" />
        메일머지
      </h1>
      <p className="text-muted-foreground">업체들에게 개인화된 이메일을 일괄 발송합니다.</p>
    </div>
  );
}

interface ActionButtonsProps {
  sending: boolean;
  recipientType: string;
  selectedYearMonth: string;
  onPreview: () => void;
  onSend: () => void;
}

function ActionButtons({ sending, recipientType, selectedYearMonth, onPreview, onSend }: ActionButtonsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onPreview} disabled={sending}>
        <Eye className="h-4 w-4 mr-2" />미리보기
      </Button>
      <Button onClick={onSend} disabled={sending || (recipientType === 'year_month' && !selectedYearMonth)}>
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        발송하기
      </Button>
    </div>
  );
}
