import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, getPendingUsers } from '@/lib/db';

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
    
    const users = pending 
      ? await getPendingUsers() 
      : await getAllUsers();
    
    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const safeUsers = users.map(({ password_hash, ...user }) => user);
    
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
