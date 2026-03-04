import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettlementRepository, getColumnSettingRepository } from '@/infrastructure/supabase';

export const dynamic = 'force-dynamic';

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json(
        { success: false, error: 'month 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 표시 컬럼 설정 조회 (visible 컬럼 기준)
    const columnSettings = await getColumnSettingRepository().findAll();
    const visibleColumns = columnSettings
      .filter(c => c.is_visible)
      .map(c => ({ key: c.column_key, name: c.column_name }));

    // 사업자번호를 첫 컬럼으로 고정, 중복 방지
    const dataColumns = visibleColumns.filter(c => c.key !== 'business_number');
    const allColumns = [
      { key: 'business_number', name: '사업자번호' },
      ...dataColumns,
    ];

    // 필요한 컬럼만 SELECT
    const selectKeys = [...new Set(['id', ...allColumns.map(c => c.key)])].join(',');
    const settlements = await getSettlementRepository().findAll(month, selectKeys);

    // CSV 생성
    const headerRow = allColumns.map(c => escapeCsvValue(c.name)).join(',');
    const dataRows = settlements.map(row =>
      allColumns.map(c => escapeCsvValue(row[c.key] as string | number | null)).join(',')
    );
    const csv = [headerRow, ...dataRows].join('\r\n');

    const filename = `정산서_${month}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { success: false, error: 'CSV 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
