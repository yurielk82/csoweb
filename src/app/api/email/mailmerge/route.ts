import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getUserRepository,
  getSettlementRepository,
  getCSOMatchingRepository,
  getColumnSettingRepository,
  getCompanyRepository,
} from '@/infrastructure/supabase';
import {
  sendEmail,
  getEmailSendDelay,
  buildBodyHtml,
  buildNoticeHtml,
  buildDashboardHtml,
  buildDataTableHtml,
  type EmailSectionId,
} from '@/lib/email';
import { NUMERIC_COLUMN_KEYS } from '@/types';

export const dynamic = 'force-dynamic';

interface SectionConfig {
  id: EmailSectionId;
  enabled: boolean;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'notice', enabled: true },
  { id: 'dashboard', enabled: true },
  { id: 'table', enabled: true },
  { id: 'body', enabled: true },
];

interface MailMergeData {
  recipients: string[];
  subject: string;
  body: string;
  year_month?: string;
  include_settlement_table?: boolean;
  sections?: SectionConfig[];
}

// Replace template variables
function replaceVariables(
  template: string,
  data: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

// Format currency
function formatCurrency(value: number): string {
  return value.toLocaleString('ko-KR') + '원';
}

// Build content HTML from sections in order
function buildContentHtml(
  orderedSections: SectionConfig[],
  sectionHtmlMap: Record<EmailSectionId, string>,
): string {
  return orderedSections
    .filter(s => s.enabled && sectionHtmlMap[s.id])
    .map(s => sectionHtmlMap[s.id])
    .join('');
}

// C-1: 수신자 수 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const ym = url.searchParams.get('year_month');

    let count = 0;

    if (type === 'all') {
      const users = await getUserRepository().findAll();
      count = users.filter(u => u.is_approved && !u.is_admin).length;
    } else if (type === 'year_month' && ym) {
      const bns = await getSettlementRepository().getBusinessNumbersForMonth(ym);
      count = bns.length;
    }

    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Mailmerge GET error:', error);
    return NextResponse.json(
      { success: false, error: '수신자 수 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// C-2: SSE 실시간 발송 진행률
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { recipients, subject, body, year_month, include_settlement_table, sections }: MailMergeData = await request.json();

    if (!subject || !body) {
      return NextResponse.json(
        { success: false, error: '제목과 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    const orderedSections = sections || DEFAULT_SECTIONS;

    // Determine recipient list
    let targetBusinessNumbers: string[] = [];

    if (recipients.includes('all')) {
      const users = await getUserRepository().findAll();
      targetBusinessNumbers = users
        .filter(u => u.is_approved && !u.is_admin)
        .map(u => u.business_number);
    } else if (recipients.length === 1 && recipients[0].startsWith('year_month:')) {
      const ym = recipients[0].replace('year_month:', '');
      targetBusinessNumbers = await getSettlementRepository().getBusinessNumbersForMonth(ym);
    } else {
      targetBusinessNumbers = recipients;
    }

    if (targetBusinessNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: '발송 대상이 없습니다.' },
        { status: 400 }
      );
    }

    // 정산서 테이블 첨부 시 사전 데이터 로드
    let visibleColumns: { key: string; name: string; isNumeric: boolean }[] = [];
    let notice = '';
    let allSettlements: Record<string, unknown>[] = [];
    let allMatches: { cso_company_name: string; business_number: string }[] = [];

    if (include_settlement_table && year_month) {
      const allColumns = await getColumnSettingRepository().findAll();
      visibleColumns = allColumns
        .filter(c => c.is_visible)
        .sort((a, b) => a.display_order - b.display_order)
        .map(c => ({
          key: c.column_key,
          name: c.column_name,
          isNumeric: NUMERIC_COLUMN_KEYS.includes(c.column_key),
        }));

      const companyInfo = await getCompanyRepository().get();
      notice = companyInfo.notice_content || '';

      const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
      allSettlements = await getSettlementRepository().findAll(year_month, selectCols);

      allMatches = await getCSOMatchingRepository().findAll();
    }

    const delay = await getEmailSendDelay();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // stream already closed
          }
        };

        send({ type: 'start', total: targetBusinessNumbers.length, delay });

        let sent = 0;
        let failed = 0;

        for (let i = 0; i < targetBusinessNumbers.length; i++) {
          const bn = targetBusinessNumbers[i];
          const user = await getUserRepository().findByBusinessNumber(bn);
          if (!user || !user.is_approved) {
            failed++;
            send({
              type: 'progress',
              current: i + 1,
              total: targetBusinessNumbers.length,
              sent,
              failed,
              company_name: bn,
              status: 'skipped',
            });
            continue;
          }

          // Get settlement summary if year_month is specified
          let summary = { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
          if (year_month) {
            summary = await getSettlementRepository().getSummary(bn, year_month);
          }

          // Prepare template variables
          const variables: Record<string, string | number> = {
            '업체명': user.company_name,
            '사업자번호': user.business_number,
            '이메일': user.email,
            '정산월': year_month || '',
            '총_금액': formatCurrency(summary.총_금액),
            '총_수수료': formatCurrency(summary.총_수수료),
            '제약수수료_합계': formatCurrency(summary.제약수수료_합계),
            '담당수수료_합계': formatCurrency(summary.담당수수료_합계),
            '데이터_건수': summary.데이터_건수,
            '총_수량': summary.총_수량.toLocaleString('ko-KR'),
          };

          const personalizedSubject = replaceVariables(subject, variables);
          const personalizedBody = replaceVariables(body, variables);

          // 섹션별 HTML 빌드
          let rowCount = 0;
          let hasWideContent = false;

          const sectionHtmlMap: Record<EmailSectionId, string> = {
            notice: '',
            dashboard: '',
            table: '',
            body: buildBodyHtml(personalizedBody),
          };

          if (include_settlement_table && year_month && visibleColumns.length > 0) {
            const matchedCSONames = allMatches
              .filter(m => m.business_number === bn)
              .map(m => m.cso_company_name);

            const rows = matchedCSONames.length > 0
              ? allSettlements.filter(s => matchedCSONames.includes((s.CSO관리업체 as string) || ''))
              : [];

            if (rows.length > 0) {
              rowCount = rows.length;
              hasWideContent = true;
              const tableSummary = {
                총_금액: rows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
                총_수수료: rows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
                데이터_건수: rows.length,
                총_수량: rows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
              };

              sectionHtmlMap.notice = buildNoticeHtml(notice);
              sectionHtmlMap.dashboard = buildDashboardHtml(tableSummary);
              sectionHtmlMap.table = buildDataTableHtml({
                columns: visibleColumns,
                rows,
                company_name: user.company_name,
                year_month,
              });
            }
          }

          const contentHtml = buildContentHtml(orderedSections, sectionHtmlMap);

          // Send email
          const result = await sendEmail(user.email, 'mail_merge', {
            subject: personalizedSubject,
            contentHtml,
            hasWideContent,
          });

          if (result.success) {
            sent++;
          } else {
            failed++;
          }

          send({
            type: 'progress',
            current: i + 1,
            total: targetBusinessNumbers.length,
            sent,
            failed,
            company_name: user.company_name,
            status: result.success ? 'sent' : 'failed',
            error: result.error,
            row_count: rowCount || undefined,
          });

          if (i < targetBusinessNumbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        send({
          type: 'complete',
          sent,
          failed,
          total: targetBusinessNumbers.length,
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Mail merge error:', error);
    return NextResponse.json(
      { success: false, error: '메일 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Preview mail merge
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { subject, body, year_month, include_settlement_table, sections } = await request.json();
    const orderedSections: SectionConfig[] = sections || DEFAULT_SECTIONS;

    // Sample data for preview
    const sampleVariables: Record<string, string | number> = {
      '업체명': 'ABC 상사',
      '사업자번호': '123-45-67890',
      '이메일': 'sample@example.com',
      '정산월': year_month || '2026-01',
      '총_금액': formatCurrency(15234000),
      '총_수수료': formatCurrency(1781729),
      '제약수수료_합계': formatCurrency(1781729),
      '담당수수료_합계': formatCurrency(523400),
      '데이터_건수': 127,
      '총_수량': '1,250',
    };

    const previewSubject = replaceVariables(subject || '', sampleVariables);
    const previewBody = replaceVariables(body || '', sampleVariables);

    // 섹션별 HTML 미리보기
    const sectionHtmlMap: Record<EmailSectionId, string> = {
      notice: '',
      dashboard: '',
      table: '',
      body: buildBodyHtml(previewBody),
    };

    let hasSettlementData = false;

    if (include_settlement_table && year_month) {
      const allColumns = await getColumnSettingRepository().findAll();
      const visibleColumns = allColumns
        .filter(c => c.is_visible)
        .sort((a, b) => a.display_order - b.display_order)
        .map(c => ({
          key: c.column_key,
          name: c.column_name,
          isNumeric: NUMERIC_COLUMN_KEYS.includes(c.column_key),
        }));

      const companyInfo = await getCompanyRepository().get();
      const notice = companyInfo.notice_content || '';

      const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
      const allData = await getSettlementRepository().findAll(year_month, selectCols);
      const firstCSO = allData.find(s => s.CSO관리업체)?.CSO관리업체;

      if (firstCSO) {
        hasSettlementData = true;
        const sampleRows = allData.filter(s => s.CSO관리업체 === firstCSO).slice(0, 20);
        const summary = {
          총_금액: sampleRows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
          총_수수료: sampleRows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
          데이터_건수: sampleRows.length,
          총_수량: sampleRows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
        };

        sectionHtmlMap.notice = buildNoticeHtml(notice);
        sectionHtmlMap.dashboard = buildDashboardHtml(summary);
        sectionHtmlMap.table = buildDataTableHtml({
          columns: visibleColumns,
          rows: sampleRows,
          company_name: 'ABC 상사',
          year_month,
        });
      }
    }

    const contentHtml = buildContentHtml(orderedSections, sectionHtmlMap);

    return NextResponse.json({
      success: true,
      data: {
        subject: previewSubject,
        contentHtml,
        hasSettlementData,
        variables: Object.keys(sampleVariables).map(k => `{{${k}}}`),
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { success: false, error: '미리보기 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
