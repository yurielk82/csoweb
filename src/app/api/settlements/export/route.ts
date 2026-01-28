import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettlementsByBusinessNumber, getAllSettlements, getColumnSettings } from '@/lib/db';
import { exportToExcel } from '@/lib/excel';

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
    
    let settlements;
    
    if (session.is_admin) {
      // 관리자가 특정 CSO를 선택한 경우 해당 업체의 데이터만 조회
      if (filterBusinessNumber) {
        settlements = await getSettlementsByBusinessNumber(filterBusinessNumber, settlementMonth);
      } else {
        settlements = await getAllSettlements(settlementMonth);
      }
    } else {
      settlements = await getSettlementsByBusinessNumber(
        session.business_number,
        settlementMonth
      );
    }
    
    // Get column settings for display names
    const columnSettings = await getColumnSettings();
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
    
    // Generate Excel file
    const filename = `정산서_${settlementMonth || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buffer = exportToExcel(settlements, exportColumns);
    
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
