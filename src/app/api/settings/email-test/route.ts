import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSession } from '@/lib/auth';
import { getCompanyInfo } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { provider, send_test_email } = await request.json();

    if (provider === 'resend') {
      const hasKey = !!process.env.RESEND_API_KEY;
      return NextResponse.json({
        success: true,
        data: {
          connected: hasKey,
          message: hasKey ? 'Resend API 키가 설정되어 있습니다.' : 'RESEND_API_KEY 환경변수가 설정되지 않았습니다.',
        },
      });
    }

    if (provider === 'smtp') {
      const companyInfo = await getCompanyInfo();
      const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password } = companyInfo;

      if (!smtp_host || !smtp_user || !smtp_password) {
        return NextResponse.json({
          success: false,
          error: 'SMTP 설정이 불완전합니다. 호스트, 계정, 비밀번호를 확인하세요.',
        });
      }

      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port || 465,
        secure: smtp_secure ?? true,
        auth: {
          user: smtp_user,
          pass: smtp_password,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
      });

      try {
        await transporter.verify();
      } catch (verifyError) {
        const msg = verifyError instanceof Error ? verifyError.message : 'SMTP 연결 실패';
        return NextResponse.json({
          success: false,
          error: `SMTP 연결 실패: ${msg}`,
        });
      }

      // 테스트 메일 발송 (선택적)
      if (send_test_email && session.business_number) {
        const { getUserByBusinessNumber } = await import('@/lib/db');
        const user = await getUserByBusinessNumber(session.business_number);
        if (user?.email) {
          const fromName = companyInfo.smtp_from_name || 'CSO 정산서 포털';
          const fromEmail = companyInfo.smtp_from_email || smtp_user;

          await transporter.sendMail({
            from: `${fromName} <${fromEmail}>`,
            to: user.email,
            subject: '[테스트] SMTP 연결 테스트',
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>SMTP 연결 테스트 성공</h2>
                <p>이 메일은 SMTP 설정 테스트를 위해 발송되었습니다.</p>
                <p style="color: #6b7280; font-size: 12px;">호스트: ${smtp_host}:${smtp_port}</p>
              </div>
            `,
          });

          return NextResponse.json({
            success: true,
            data: {
              connected: true,
              message: `SMTP 연결 성공. 테스트 메일이 ${user.email}로 발송되었습니다.`,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          message: `SMTP 연결 성공 (${smtp_host}:${smtp_port})`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: '알 수 없는 프로바이더입니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { success: false, error: '이메일 테스트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
