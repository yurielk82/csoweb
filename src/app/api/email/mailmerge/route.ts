import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getUserRepository,
  getSettlementRepository,
  getCSOMatchingRepository,
  getColumnSettingRepository,
  getCompanyRepository,
} from '@/infrastructure/supabase';
import { getCachedAvailableMonths } from '@/lib/data-cache';
import {
  sendEmail,
  getEmailSendDelay,
  getTestRecipientEmail,
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

// ── 공통 헬퍼 ──

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceVariables(
  template: string,
  data: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('ko-KR') + '원';
}

function formatYearMonth(ym: string): string {
  if (!ym) return '';
  const [year, month] = ym.split('-');
  return `${year}년 ${month}월`;
}

function formatNextMonth(ym: string): string {
  if (!ym) return '';
  const month = Number(ym.split('-')[1]);
  const next = month === 12 ? 1 : month + 1;
  return `${next}월`;
}

function buildContentHtml(
  orderedSections: SectionConfig[],
  sectionHtmlMap: Record<EmailSectionId, string>,
): string {
  return orderedSections
    .filter(s => s.enabled && sectionHtmlMap[s.id])
    .map(s => sectionHtmlMap[s.id])
    .join('');
}

interface SettlementSummary {
  총_금액: number;
  총_수수료: number;
  제약수수료_합계: number;
  담당수수료_합계: number;
  데이터_건수: number;
  총_수량: number;
}

const EMPTY_SUMMARY: SettlementSummary = {
  총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0,
};

function buildTemplateVariables(
  companyName: string,
  businessNumber: string,
  email: string,
  yearMonth: string,
  ceoName: string,
  summary: SettlementSummary,
): Record<string, string | number> {
  return {
    '업체명': companyName,
    '사업자번호': businessNumber,
    '이메일': email,
    '정산월': formatYearMonth(yearMonth),
    '정산월+1': formatNextMonth(yearMonth),
    '대표자명': ceoName,
    '총_금액': formatCurrency(summary.총_금액),
    '총_수수료': formatCurrency(summary.총_수수료),
    '제약수수료_합계': formatCurrency(summary.제약수수료_합계),
    '담당수수료_합계': formatCurrency(summary.담당수수료_합계),
    '데이터_건수': summary.데이터_건수,
    '총_수량': summary.총_수량.toLocaleString('ko-KR'),
  };
}

async function getVisibleColumns() {
  const allColumns = await getColumnSettingRepository().findAll();
  return allColumns
    .filter(c => c.is_visible)
    .sort((a, b) => a.display_order - b.display_order)
    .map(c => ({
      key: c.column_key,
      name: c.column_name,
      isNumeric: NUMERIC_COLUMN_KEYS.includes(c.column_key),
    }));
}

function calcTableSummary(rows: Record<string, unknown>[]) {
  return {
    총_금액: rows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
    총_수수료: rows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
    데이터_건수: rows.length,
    총_수량: rows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
  };
}

function buildSectionHtmls(
  notice: string,
  variables: Record<string, string | number>,
  rows: Record<string, unknown>[],
  visibleColumns: { key: string; name: string; isNumeric: boolean }[],
  companyName: string,
  yearMonth: string,
  bodyHtml: string,
): { sectionHtmlMap: Record<EmailSectionId, string>; hasWideContent: boolean } {
  const sectionHtmlMap: Record<EmailSectionId, string> = {
    notice: '', dashboard: '', table: '', body: bodyHtml,
  };

  if (rows.length === 0) return { sectionHtmlMap, hasWideContent: false };

  const tableSummary = calcTableSummary(rows);
  sectionHtmlMap.notice = buildNoticeHtml(replaceVariables(notice, variables));
  sectionHtmlMap.dashboard = buildDashboardHtml(tableSummary);
  sectionHtmlMap.table = buildDataTableHtml({
    columns: visibleColumns, rows, company_name: companyName, year_month: yearMonth,
  });
  return { sectionHtmlMap, hasWideContent: true };
}

async function getMatchedCSONames(businessNumber: string) {
  const allMatches = await getCSOMatchingRepository().findAll();
  return allMatches
    .filter(m => m.business_number === businessNumber)
    .map(m => m.cso_company_name);
}

async function getSettlementRows(
  yearMonth: string,
  visibleColumns: { key: string }[],
  matchedCSONames: string[],
) {
  if (matchedCSONames.length === 0) return [];
  const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
  const allData = await getSettlementRepository().findAll(yearMonth, selectCols);
  return allData.filter(s => matchedCSONames.includes((s.CSO관리업체 as string) || ''));
}

function requireAdmin(session: { is_admin: boolean } | null) {
  if (!session || !session.is_admin) {
    return NextResponse.json(
      { success: false, error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    );
  }
  return null;
}

// ── C-1: 수신자 수 조회 ──

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const denied = requireAdmin(session);
    if (denied) return denied;

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const ym = url.searchParams.get('year_month');
    const includeList = url.searchParams.get('include_list') === 'true';

    if (type === 'available_months') {
      const months = await getCachedAvailableMonths('ALL');
      return NextResponse.json({ success: true, data: { months } });
    }

    let count = 0;
    let companies: { business_number: string; company_name: string }[] = [];

    if (type === 'all') {
      const users = await getUserRepository().findAll();
      const filtered = users.filter(u => u.is_approved && !u.is_admin);
      count = filtered.length;
      if (includeList) {
        companies = filtered.map(u => ({ business_number: u.business_number, company_name: u.company_name }));
      }
    } else if (type === 'year_month' && ym) {
      const csoNames = await getSettlementRepository().getCSOCompanyNamesForMonth(ym);
      const allMatches = await getCSOMatchingRepository().findAll();
      const matchedBns = new Set(
        allMatches
          .filter(m => csoNames.includes(m.cso_company_name))
          .map(m => m.business_number)
      );
      const users = await getUserRepository().findAll();
      const validCompanies = users
        .filter(u => u.is_approved && !u.is_admin && matchedBns.has(u.business_number))
        .map(u => ({ business_number: u.business_number, company_name: u.company_name }));
      count = validCompanies.length;
      if (includeList) {
        companies = validCompanies.sort((a, b) => a.company_name.localeCompare(b.company_name));
      }
    }

    return NextResponse.json({ success: true, data: { count, ...(includeList ? { companies } : {}) } });
  } catch (error) {
    console.error('Mailmerge GET error:', error);
    return NextResponse.json(
      { success: false, error: '수신자 수 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// ── C-2: SSE 실시간 발송 ──

async function resolveTargetBusinessNumbers(recipients: string[]): Promise<string[]> {
  if (recipients.includes('all')) {
    const users = await getUserRepository().findAll();
    return users.filter(u => u.is_approved && !u.is_admin).map(u => u.business_number);
  }
  if (recipients.length === 1 && recipients[0].startsWith('year_month:')) {
    const ym = recipients[0].replace('year_month:', '');
    const csoNames = await getSettlementRepository().getCSOCompanyNamesForMonth(ym);
    const allMatches = await getCSOMatchingRepository().findAll();
    const matchedBns = new Set(
      allMatches.filter(m => csoNames.includes(m.cso_company_name)).map(m => m.business_number)
    );
    return [...matchedBns];
  }
  return recipients;
}

async function prepareSSEContext(yearMonth: string | undefined, includeTable: boolean | undefined) {
  const companyInfo = await getCompanyRepository().get();
  const allMatches = yearMonth ? await getCSOMatchingRepository().findAll() : [];

  let visibleColumns: { key: string; name: string; isNumeric: boolean }[] = [];
  let notice = '';
  let allSettlements: Record<string, unknown>[] = [];

  if (includeTable && yearMonth) {
    visibleColumns = await getVisibleColumns();
    notice = companyInfo.notice_content || '';
    const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
    allSettlements = await getSettlementRepository().findAll(yearMonth, selectCols);
  }

  return { companyInfo, allMatches, visibleColumns, notice, allSettlements };
}

function buildSSEMailContent(
  bn: string,
  ctx: Awaited<ReturnType<typeof prepareSSEContext>>,
  yearMonth: string | undefined,
  includeTable: boolean | undefined,
  _summary: SettlementSummary,
  variables: Record<string, string | number>,
  personalizedBody: string,
) {
  const bodyHtml = buildBodyHtml(personalizedBody);
  if (!includeTable || !yearMonth || ctx.visibleColumns.length === 0) {
    return {
      sectionHtmlMap: { notice: '', dashboard: '', table: '', body: bodyHtml } as Record<EmailSectionId, string>,
      hasWideContent: false,
      rowCount: 0,
    };
  }

  const matchedCSONames = ctx.allMatches
    .filter(m => m.business_number === bn)
    .map(m => m.cso_company_name);

  const rows = matchedCSONames.length > 0
    ? ctx.allSettlements.filter(s => matchedCSONames.includes((s.CSO관리업체 as string) || ''))
    : [];

  if (rows.length === 0) {
    return {
      sectionHtmlMap: { notice: '', dashboard: '', table: '', body: bodyHtml } as Record<EmailSectionId, string>,
      hasWideContent: false,
      rowCount: 0,
    };
  }

  const { sectionHtmlMap, hasWideContent } = buildSectionHtmls(
    ctx.notice, variables, rows, ctx.visibleColumns,
    variables['업체명'] as string, yearMonth, bodyHtml,
  );
  return { sectionHtmlMap, hasWideContent, rowCount: rows.length };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const denied = requireAdmin(session);
    if (denied) return denied;

    const { recipients, subject, body, year_month, include_settlement_table, sections }: MailMergeData = await request.json();

    if (!subject || !body) {
      return NextResponse.json({ success: false, error: '제목과 내용을 입력해주세요.' }, { status: 400 });
    }

    const orderedSections = sections || DEFAULT_SECTIONS;
    const targetBusinessNumbers = await resolveTargetBusinessNumbers(recipients);

    if (targetBusinessNumbers.length === 0) {
      return NextResponse.json({ success: false, error: '발송 대상이 없습니다.' }, { status: 400 });
    }

    const ctx = await prepareSSEContext(year_month, include_settlement_table);
    const delay = await getEmailSendDelay();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* SSE 스트림 닫힘 */ }
        };

        send({ type: 'start', total: targetBusinessNumbers.length, delay });
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < targetBusinessNumbers.length; i++) {
          const result = await processOneRecipient(
            targetBusinessNumbers[i], ctx, year_month, include_settlement_table,
            subject, body, orderedSections,
          );

          if (result.skipped) { failed++; }
          else if (result.success) { sent++; }
          else { failed++; }

          send({
            type: 'progress', current: i + 1, total: targetBusinessNumbers.length,
            sent, failed, company_name: result.companyName,
            status: result.skipped ? 'skipped' : result.success ? 'sent' : 'failed',
            error: result.error, row_count: result.rowCount || undefined,
          });

          if (i < targetBusinessNumbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        send({ type: 'complete', sent, failed, total: targetBusinessNumbers.length });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error) {
    console.error('Mail merge error:', error);
    return NextResponse.json({ success: false, error: '메일 발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function processOneRecipient(
  bn: string,
  ctx: Awaited<ReturnType<typeof prepareSSEContext>>,
  yearMonth: string | undefined,
  includeTable: boolean | undefined,
  subject: string,
  body: string,
  orderedSections: SectionConfig[],
) {
  const user = await getUserRepository().findByBusinessNumber(bn);
  if (!user || !user.is_approved) {
    return { skipped: true, success: false, companyName: bn, error: undefined, rowCount: 0 };
  }

  let summary = { ...EMPTY_SUMMARY };
  if (yearMonth) {
    const matchedNames = ctx.allMatches.filter(m => m.business_number === bn).map(m => m.cso_company_name);
    if (matchedNames.length > 0) {
      summary = await getSettlementRepository().getSummaryByCSOMatching(matchedNames, yearMonth);
    }
  }

  const variables = buildTemplateVariables(
    user.company_name, user.business_number, user.email,
    yearMonth || '', ctx.companyInfo.ceo_name || '', summary,
  );

  const personalizedSubject = replaceVariables(subject, variables);
  const personalizedBody = replaceVariables(body, variables);

  const { sectionHtmlMap, hasWideContent, rowCount } = buildSSEMailContent(
    bn, ctx, yearMonth, includeTable, summary, variables, personalizedBody,
  );

  const contentHtml = buildContentHtml(orderedSections, sectionHtmlMap);
  const result = await sendEmail(user.email, 'mail_merge', { subject: personalizedSubject, contentHtml, hasWideContent });

  return { skipped: false, success: result.success, companyName: user.company_name, error: result.error, rowCount };
}

// ── Test send (PATCH) ──

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    const denied = requireAdmin(session);
    if (denied) return denied;

    const { subject, body, year_month, include_settlement_table, sections, test_business_number } = await request.json();
    const orderedSections: SectionConfig[] = sections || DEFAULT_SECTIONS;

    if (!subject || !body) {
      return NextResponse.json({ success: false, error: '제목과 내용을 입력해주세요.' }, { status: 400 });
    }

    const companyInfo = await getCompanyRepository().get();
    const { companyName, businessNumber, summary } = await resolveTestTarget(test_business_number, year_month);
    const variables = buildTemplateVariables(
      companyName, businessNumber, session!.email, year_month || '', companyInfo.ceo_name || '', summary,
    );

    const testSubject = '[테스트] ' + replaceVariables(subject, variables);
    const testBody = replaceVariables(body, variables);

    const { sectionHtmlMap, hasWideContent } = await buildTestSectionHtmls(
      include_settlement_table, year_month, test_business_number, businessNumber,
      companyName, companyInfo.notice_content || '', variables, testBody,
    );

    const contentHtml = buildContentHtml(orderedSections, sectionHtmlMap);
    const testRecipient = await getTestRecipientEmail(session!.email);
    const result = await sendEmail(testRecipient, 'mail_merge', { subject: testSubject, contentHtml, hasWideContent });

    if (result.success) {
      return NextResponse.json({ success: true, data: { email: testRecipient, company_name: companyName } });
    }
    return NextResponse.json({ success: false, error: result.error || '테스트 발송에 실패했습니다.' }, { status: 500 });
  } catch (error) {
    console.error('Test send error:', error);
    return NextResponse.json({ success: false, error: '테스트 발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function resolveTestTarget(testBn: string | undefined, yearMonth: string | undefined) {
  if (!testBn) return { companyName: '[테스트] 샘플 업체', businessNumber: '000-00-00000', summary: { ...EMPTY_SUMMARY } };

  const targetUser = await getUserRepository().findByBusinessNumber(testBn);
  if (!targetUser) throw new Error('해당 업체를 찾을 수 없습니다.');

  let summary = { ...EMPTY_SUMMARY };
  if (yearMonth) {
    const matchedNames = await getMatchedCSONames(targetUser.business_number);
    if (matchedNames.length > 0) {
      summary = await getSettlementRepository().getSummaryByCSOMatching(matchedNames, yearMonth);
    }
  }
  return { companyName: targetUser.company_name, businessNumber: targetUser.business_number, summary };
}

async function buildTestSectionHtmls(
  includeTable: boolean | undefined,
  yearMonth: string | undefined,
  testBn: string | undefined,
  businessNumber: string,
  companyName: string,
  notice: string,
  variables: Record<string, string | number>,
  bodyText: string,
) {
  const bodyHtml = buildBodyHtml(bodyText);
  const defaultMap: Record<EmailSectionId, string> = { notice: '', dashboard: '', table: '', body: bodyHtml };

  if (!includeTable || !yearMonth) return { sectionHtmlMap: defaultMap, hasWideContent: false };

  const visibleColumns = await getVisibleColumns();

  if (testBn) {
    const rows = await getSettlementRows(yearMonth, visibleColumns, await getMatchedCSONames(businessNumber));
    return buildSectionHtmls(notice, variables, rows, visibleColumns, companyName, yearMonth, bodyHtml);
  }

  // 샘플 데이터
  const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
  const allData = await getSettlementRepository().findAll(yearMonth, selectCols);
  const firstCSO = allData.find(s => s.CSO관리업체)?.CSO관리업체;
  if (!firstCSO) return { sectionHtmlMap: defaultMap, hasWideContent: false };

  const sampleRows = allData.filter(s => s.CSO관리업체 === firstCSO).slice(0, 20);
  return buildSectionHtmls(notice, variables, sampleRows, visibleColumns, companyName, yearMonth, bodyHtml);
}

// ── Preview (PUT) ──

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    const denied = requireAdmin(session);
    if (denied) return denied;

    const { subject, body, year_month, include_settlement_table, sections, test_business_number } = await request.json();
    const orderedSections: SectionConfig[] = sections || DEFAULT_SECTIONS;

    const { companyName, businessNumber, email, summary, useRealData } = await resolvePreviewTarget(test_business_number, year_month);

    const sampleYm = year_month || '2026-01';
    const previewVariables = buildTemplateVariables(
      companyName, businessNumber, email, sampleYm, '홍길동', summary,
    );

    const previewSubject = replaceVariables(subject || '', previewVariables);
    const previewBody = replaceVariables(body || '', previewVariables);

    const { sectionHtmlMap, hasWideContent } = await buildPreviewSectionHtmls(
      include_settlement_table, year_month, useRealData, businessNumber,
      companyName, previewVariables, previewBody,
    );

    const contentHtml = buildContentHtml(orderedSections, sectionHtmlMap);

    return NextResponse.json({
      success: true,
      data: {
        subject: previewSubject, contentHtml, hasSettlementData: hasWideContent,
        variables: Object.keys(previewVariables).map(k => `{{${k}}}`),
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ success: false, error: '미리보기 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

async function resolvePreviewTarget(testBn: string | undefined, yearMonth: string | undefined) {
  const defaultSummary: SettlementSummary = {
    총_금액: 15234000, 총_수수료: 1781729, 제약수수료_합계: 1781729,
    담당수수료_합계: 523400, 데이터_건수: 127, 총_수량: 1250,
  };

  if (!testBn) {
    return {
      companyName: 'ABC 상사', businessNumber: '123-45-67890',
      email: 'sample@example.com', summary: defaultSummary, useRealData: false,
    };
  }

  const targetUser = await getUserRepository().findByBusinessNumber(testBn);
  if (!targetUser) {
    return {
      companyName: 'ABC 상사', businessNumber: '123-45-67890',
      email: 'sample@example.com', summary: defaultSummary, useRealData: false,
    };
  }

  let summary = defaultSummary;
  if (yearMonth) {
    const matchedNames = await getMatchedCSONames(targetUser.business_number);
    if (matchedNames.length > 0) {
      summary = await getSettlementRepository().getSummaryByCSOMatching(matchedNames, yearMonth);
    }
  }

  return {
    companyName: targetUser.company_name, businessNumber: targetUser.business_number,
    email: targetUser.email, summary, useRealData: true,
  };
}

async function buildPreviewSectionHtmls(
  includeTable: boolean | undefined,
  yearMonth: string | undefined,
  useRealData: boolean,
  businessNumber: string,
  companyName: string,
  variables: Record<string, string | number>,
  bodyText: string,
) {
  const bodyHtml = buildBodyHtml(bodyText);
  const defaultMap: Record<EmailSectionId, string> = { notice: '', dashboard: '', table: '', body: bodyHtml };

  if (!includeTable || !yearMonth) return { sectionHtmlMap: defaultMap, hasWideContent: false };

  const visibleColumns = await getVisibleColumns();
  const companyInfo = await getCompanyRepository().get();
  const notice = companyInfo.notice_content || '';

  const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
  const allData = await getSettlementRepository().findAll(yearMonth, selectCols);

  if (useRealData) {
    const matchedNames = await getMatchedCSONames(businessNumber);
    const rows = matchedNames.length > 0
      ? allData.filter(s => matchedNames.includes((s.CSO관리업체 as string) || ''))
      : [];
    return buildSectionHtmls(notice, variables, rows, visibleColumns, companyName, yearMonth, bodyHtml);
  }

  // 샘플 데이터
  const firstCSO = allData.find(s => s.CSO관리업체)?.CSO관리업체;
  if (!firstCSO) return { sectionHtmlMap: defaultMap, hasWideContent: false };

  const sampleRows = allData.filter(s => s.CSO관리업체 === firstCSO).slice(0, 20);
  return buildSectionHtmls(notice, variables, sampleRows, visibleColumns, companyName, yearMonth, bodyHtml);
}
