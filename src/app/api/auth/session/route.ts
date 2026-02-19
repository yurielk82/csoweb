import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, data: null });
    }
    
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { success: false, error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
