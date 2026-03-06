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
    } catch (error) {
      console.warn('SMTP 상태 확인 실패:', error);
    }

    // Next.js 버전 추출
    const nextVersion = (packageJson.dependencies as Record<string, string>)['next'] || 'unknown';

    // 배포 플랫폼 감지
    const deployPlatform = process.env.VERCEL
      ? 'Vercel'
      : process.env.NETLIFY
        ? 'Netlify'
        : 'Unknown';
    const deployUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.URL || null;

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
        next_version: nextVersion,
        node_version: process.version,
        deploy_platform: deployPlatform,
        deploy_url: deployUrl,
        jwt_configured: !!process.env.JWT_SECRET,
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
