import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteSettlementsByMonth } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 특정 정산월 데이터 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { month } = params;
    const decodedMonth = decodeURIComponent(month);
    
    const deletedCount = await deleteSettlementsByMonth(decodedMonth);
    
    return NextResponse.json({
      success: true,
      data: { deletedCount },
      message: `${decodedMonth} 정산 데이터 ${deletedCount}건이 삭제되었습니다.`,
    });
  } catch (error) {
    console.error('Delete settlements error:', error);
    return NextResponse.json(
      { success: false, error: '정산 데이터 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
