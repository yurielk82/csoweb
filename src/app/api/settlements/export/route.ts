import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettlementRepository, getCSOMatchingRepository, getColumnSettingRepository } from '@/infrastructure/supabase';
import { exportToExcel } from '@/lib/excel';
import { supabase } from '@/infrastructure/supabase/client';
import { MAX_DAILY_EXPORTS } from '@/constants/defaults';

export const dynamic = 'force-dynamic';

async function fetchSettlementsByCSOMatching(businessNumber: string, settlementMonth?: string, selectColumns?: string) {
  const matchedNames = await getCSOMatchingRepository().getMatchedCompanyNames(businessNumber);
  if (matchedNames.length === 0) return [];
  return getSettlementRepository().findByCSOMatching(matchedNames, settlementMonth, selectColumns);
}

/** 오늘 0시(UTC) 기준 다운로드 횟수 조회 */
async function getTodayExportCount(businessNumber: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('export_logs')
    .select('*', { count: 'exact', head: true })
    .eq('business_number', businessNumber)
    .gte('created_at', todayStart.toISOString());

  if (error) {
    console.error('[export] export_logs COUNT 실패:', error);
    return 0;
  }
  return count ?? 0;
}

/** 다운로드 로그 기록 */
async function logExport(businessNumber: string, settlementMonth?: string): Promise<void> {
  const { error } = await supabase
    .from('export_logs')
    .insert({ business_number: businessNumber, settlement_month: settlementMonth ?? null });

  if (error) {
    console.error('[export] export_logs INSERT 실패:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const settlementMonth = searchParams.get('settlement_month') || searchParams.get('year_month') || undefined;
    const selectedColumns = searchParams.get('columns')?.split(',') || [];
    // 관리자용: 특정 CSO의 business_number로 필터링
    const filterBusinessNumber = searchParams.get('business_number') || undefined;

    // 일반 회원: 일일 다운로드 횟수 제한
    if (!session.is_admin) {
      const todayCount = await getTodayExportCount(session.business_number);
      if (todayCount >= MAX_DAILY_EXPORTS) {
        const remaining = 0;
        return NextResponse.json(
          {
            success: false,
            error: `일일 다운로드 횟수(${MAX_DAILY_EXPORTS}회)를 초과했습니다.`,
            remaining,
          },
          { status: 429 }
        );
      }
    }

    // Get column settings for display names
    const columnSettings = await getColumnSettingRepository().findAll();
    const visibleColumns = columnSettings.filter(c => c.is_visible);

    // Determine which columns to export
    let exportColumns: { key: string; name: string }[];

    if (selectedColumns.length > 0) {
      exportColumns = selectedColumns
        .map(key => {
          const setting = columnSettings.find(c => c.column_key === key);
          return setting ? { key: setting.column_key, name: setting.column_name } : null;
        })
        .filter((c): c is { key: string; name: string } => c !== null);
    } else {
      exportColumns = visibleColumns.map(c => ({
        key: c.column_key,
        name: c.column_name,
      }));
    }

    // SELECT 최적화: 내보내기에 필요한 컬럼만 조회
    const exportColumnKeys = exportColumns.map(c => c.key);
    const selectColumns = [...new Set(['id', 'business_number', '정산월', 'CSO관리업체', ...exportColumnKeys])].join(',');

    let settlements;

    if (session.is_admin) {
      if (filterBusinessNumber) {
        settlements = await fetchSettlementsByCSOMatching(filterBusinessNumber, settlementMonth, selectColumns);
      } else {
        settlements = await getSettlementRepository().findAll(settlementMonth, selectColumns);
      }
    } else {
      settlements = await fetchSettlementsByCSOMatching(
        session.business_number,
        settlementMonth,
        selectColumns
      );
    }

    // Generate Excel file
    const filename = `정산서_${settlementMonth || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buffer = exportToExcel(settlements, exportColumns);

    // 다운로드 로그 기록
    await logExport(session.business_number, settlementMonth);

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: '엑셀 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
