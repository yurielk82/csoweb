import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

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

    // Supabase 연결 상태 확인
    const supabaseConnected = isSupabaseConfigured();
    
    // Resend 연결 상태 확인
    const resendConnected = !!process.env.RESEND_API_KEY;

    return NextResponse.json({
      success: true,
      data: {
        supabase: supabaseConnected,
        resend: resendConnected,
        version: 'v2.0',
        environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    });
  } catch (error) {
    console.error('System status error:', error);
    return NextResponse.json(
      { success: false, error: '시스템 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
