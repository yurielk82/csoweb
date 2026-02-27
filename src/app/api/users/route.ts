import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCachedUsers, getCachedPendingUsers } from '@/lib/data-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const pending = searchParams.get('pending') === 'true';

    const safeUsers = pending
      ? await getCachedPendingUsers()
      : await getCachedUsers();

    return NextResponse.json({
      success: true,
      data: safeUsers,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
