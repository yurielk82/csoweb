import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAvailableYearMonths } from '@/application/settlement';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const months = await getAvailableYearMonths(
      session.is_admin ? undefined : session.business_number,
      session.is_admin
    );

    return NextResponse.json({
      success: true,
      data: months,
    });
  } catch (error) {
    console.error('Get settlement months error:', error);
    return NextResponse.json(
      { success: false, error: '정산월 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
