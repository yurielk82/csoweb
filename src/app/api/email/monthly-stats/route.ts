import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEmailLogRepository } from '@/infrastructure/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const stats = await getEmailLogRepository().getMonthlyStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get email monthly stats error:', error);
    return NextResponse.json(
      { success: false, error: '이메일 월별 통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
