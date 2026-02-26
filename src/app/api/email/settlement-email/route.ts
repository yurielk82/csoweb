import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getUserRepository,
  getSettlementRepository,
  getCSOMatchingRepository,
  getColumnSettingRepository,
  getCompanyRepository,
} from '@/infrastructure/supabase';
import { sendEmail, getEmailSendDelay } from '@/lib/email';
import { NUMERIC_COLUMN_KEYS } from '@/types';

export const dynamic = 'force-dynamic';

// GET: 수신 대상 CSO 업체 목록 조회
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
    const yearMonth = url.searchParams.get('year_month');

    if (!yearMonth) {
      return NextResponse.json(
        { success: false, error: '정산월을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 해당 정산월의 모든 CSO관리업체명 추출
    const settlements = await getSettlementRepository().findAll(yearMonth, 'CSO관리업체');
    const csoNames = [...new Set(
      settlements
        .map(s => s.CSO관리업체)
        .filter((name): name is string => !!name)
    )];

    // CSO 매칭으로 각 CSO관리업체 → business_number → user 매핑
    const matchingRepo = getCSOMatchingRepository();
    const userRepo = getUserRepository();
    const allMatches = await matchingRepo.findAll();

    const recipients: {
      cso_name: string;
      business_number: string;
      company_name: string;
      email: string;
    }[] = [];

    for (const csoName of csoNames) {
      const match = allMatches.find(m => m.cso_company_name === csoName);
      if (!match) continue;

      const user = await userRepo.findByBusinessNumber(match.business_number);
      if (!user || !user.is_approved) continue;

      // 이미 추가된 business_number인지 확인 (중복 방지)
      if (recipients.some(r => r.business_number === match.business_number)) continue;

      recipients.push({
        cso_name: csoName,
        business_number: match.business_number,
        company_name: user.company_name,
        email: user.email,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        count: recipients.length,
        recipients,
        cso_names: csoNames,
      },
    });
  } catch (error) {
    console.error('Settlement email GET error:', error);
    return NextResponse.json(
      { success: false, error: '수신 대상 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 정산서 이메일 SSE 발송
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { year_month, subject_template } = await request.json();

    if (!year_month) {
      return NextResponse.json(
        { success: false, error: '정산월을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 컬럼 설정 조회 (visible 컬럼만)
    const allColumns = await getColumnSettingRepository().findAll();
    const visibleColumns = allColumns
      .filter(c => c.is_visible)
      .sort((a, b) => a.display_order - b.display_order)
      .map(c => ({
        key: c.column_key,
        name: c.column_name,
        isNumeric: NUMERIC_COLUMN_KEYS.includes(c.column_key),
      }));

    // 회사 정보 및 Notice 조회
    const companyInfo = await getCompanyRepository().get();
    const notice = companyInfo.notice_content || '';

    // CSO관리업체 목록 추출
    const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
    const allSettlements = await getSettlementRepository().findAll(year_month, selectCols);

    const csoNames = [...new Set(
      allSettlements
        .map(s => s.CSO관리업체)
        .filter((name): name is string => !!name)
    )];

    // CSO 매칭
    const matchingRepo = getCSOMatchingRepository();
    const userRepo = getUserRepository();
    const allMatches = await matchingRepo.findAll();

    // 발송 대상 구성
    interface Recipient {
      cso_name: string;
      business_number: string;
      company_name: string;
      email: string;
    }
    const recipients: Recipient[] = [];
    const processedBNs = new Set<string>();

    for (const csoName of csoNames) {
      const match = allMatches.find(m => m.cso_company_name === csoName);
      if (!match) continue;
      if (processedBNs.has(match.business_number)) continue;

      const user = await userRepo.findByBusinessNumber(match.business_number);
      if (!user || !user.is_approved) continue;

      processedBNs.add(match.business_number);
      recipients.push({
        cso_name: csoName,
        business_number: match.business_number,
        company_name: user.company_name,
        email: user.email,
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: '발송 대상이 없습니다.' },
        { status: 400 }
      );
    }

    const delay = await getEmailSendDelay();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // stream closed
          }
        };

        send({ type: 'start', total: recipients.length, delay });

        let sent = 0;
        let failed = 0;

        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];

          // 해당 CSO관리업체의 매칭 이름 목록 (같은 business_number에 여러 CSO관리업체가 매핑될 수 있음)
          const matchedCSONames = allMatches
            .filter(m => m.business_number === recipient.business_number)
            .map(m => m.cso_company_name);

          // 해당 업체의 정산 데이터 필터링
          const rows = allSettlements.filter(s =>
            matchedCSONames.includes(s.CSO관리업체 || '')
          );

          if (rows.length === 0) {
            failed++;
            send({
              type: 'progress',
              current: i + 1,
              total: recipients.length,
              sent,
              failed,
              company_name: recipient.company_name,
              status: 'skipped',
            });
            continue;
          }

          // 합계 계산
          const summary = {
            총_금액: rows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
            총_수수료: rows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
            데이터_건수: rows.length,
            총_수량: rows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
          };

          // 제목 생성
          const subject = (subject_template || '{{정산월}} 정산서 - {{업체명}}')
            .replace(/\{\{정산월\}\}/g, year_month)
            .replace(/\{\{업체명\}\}/g, recipient.company_name);

          // 이메일 발송
          const result = await sendEmail(recipient.email, 'settlement_email', {
            subject,
            company_name: recipient.company_name,
            year_month,
            notice,
            columns: visibleColumns,
            rows: rows as unknown as Record<string, unknown>[],
            summary,
          });

          if (result.success) {
            sent++;
          } else {
            failed++;
          }

          send({
            type: 'progress',
            current: i + 1,
            total: recipients.length,
            sent,
            failed,
            company_name: recipient.company_name,
            status: result.success ? 'sent' : 'failed',
            error: result.error,
            row_count: rows.length,
          });

          if (i < recipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        send({ type: 'complete', sent, failed, total: recipients.length });
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
    console.error('Settlement email POST error:', error);
    return NextResponse.json(
      { success: false, error: '정산서 이메일 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 미리보기
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { year_month, business_number } = await request.json();

    if (!year_month) {
      return NextResponse.json(
        { success: false, error: '정산월을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 컬럼 설정
    const allColumns = await getColumnSettingRepository().findAll();
    const visibleColumns = allColumns
      .filter(c => c.is_visible)
      .sort((a, b) => a.display_order - b.display_order)
      .map(c => ({
        key: c.column_key,
        name: c.column_name,
        isNumeric: NUMERIC_COLUMN_KEYS.includes(c.column_key),
      }));

    // 회사 정보 및 Notice
    const companyInfo = await getCompanyRepository().get();
    const notice = companyInfo.notice_content || '';

    // 특정 업체 데이터 or 첫 번째 업체 데이터
    let rows;
    let companyName = 'ABC 상사';

    if (business_number) {
      const matchedNames = await getCSOMatchingRepository().getMatchedCompanyNames(business_number);
      if (matchedNames.length > 0) {
        const selectCols = visibleColumns.map(c => c.key).join(', ');
        rows = await getSettlementRepository().findByCSOMatching(matchedNames, year_month, selectCols);
      } else {
        const selectCols = visibleColumns.map(c => c.key).join(', ');
        rows = await getSettlementRepository().findByBusinessNumber(business_number, year_month, selectCols);
      }
      const user = await getUserRepository().findByBusinessNumber(business_number);
      if (user) companyName = user.company_name;
    } else {
      // 첫 번째 CSO업체 데이터 사용
      const selectCols = ['CSO관리업체', ...visibleColumns.map(c => c.key)].join(', ');
      const allData = await getSettlementRepository().findAll(year_month, selectCols);
      const firstCSO = allData.find(s => s.CSO관리업체)?.CSO관리업체;
      if (firstCSO) {
        rows = allData.filter(s => s.CSO관리업체 === firstCSO).slice(0, 20);
        const allMatches = await getCSOMatchingRepository().findAll();
        const match = allMatches.find(m => m.cso_company_name === firstCSO);
        if (match) {
          const user = await getUserRepository().findByBusinessNumber(match.business_number);
          if (user) companyName = user.company_name;
        }
      } else {
        rows = [];
      }
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '미리보기할 데이터가 없습니다.',
      });
    }

    const summary = {
      총_금액: rows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
      총_수수료: rows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
      데이터_건수: rows.length,
      총_수량: rows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        company_name: companyName,
        year_month,
        notice,
        columns: visibleColumns,
        row_count: rows.length,
        summary,
        // 미리보기용 (최대 20행)
        preview_rows: rows.slice(0, 20) as unknown as Record<string, unknown>[],
      },
    });
  } catch (error) {
    console.error('Settlement email preview error:', error);
    return NextResponse.json(
      { success: false, error: '미리보기 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
