import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCompanyRepository } from '@/infrastructure/supabase';
import packageJson from '../../../../../package.json';

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

    // 회사 정보에서 SMTP/프로바이더 설정 조회
    let smtpConfigured = false;
    let smtpHost: string | null = null;
    let emailProvider = 'resend';
    try {
      const companyInfo = await getCompanyRepository().get();
      smtpConfigured = !!(companyInfo.smtp_host && companyInfo.smtp_user);
      smtpHost = companyInfo.smtp_host || null;
      emailProvider = companyInfo.email_provider || 'resend';
    } catch {
      // 회사 정보 조회 실패 시 기본값 유지
    }

    return NextResponse.json({
      success: true,
      data: {
        supabase: supabaseConnected,
        resend: resendConnected,
        smtp: {
          configured: smtpConfigured,
          host: smtpHost,
        },
        email_provider: emailProvider,
        version: `v${packageJson.version}`,
        environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
        nts_api: !!process.env.NTS_API_KEY,
        hira_hospital_api: !!process.env.HIRA_API_KEY,
        hira_pharmacy_api: !!process.env.HIRA_API_KEY,
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
