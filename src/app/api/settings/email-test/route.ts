import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSession } from '@/lib/auth';
import { getCompanyRepository } from '@/infrastructure/supabase';
import { DEFAULT_SMTP_PORT } from '@/constants/defaults';

export const dynamic = 'force-dynamic';

// ── Helpers ──

function testResend() {
  const hasKey = !!process.env.RESEND_API_KEY;
  return NextResponse.json({
    success: true,
    data: {
      connected: hasKey,
      message: hasKey ? 'Resend API 키가 설정되어 있습니다.' : 'RESEND_API_KEY 환경변수가 설정되지 않았습니다.',
    },
  });
}

function createSmtpTransporter(config: {
  host: string;
  port: number | null;
  secure: boolean | null;
  user: string;
  password: string;
}) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port || DEFAULT_SMTP_PORT,
    secure: config.secure ?? true,
    auth: { user: config.user, pass: config.password },
    authMethod: 'LOGIN',
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
}

function formatSmtpVerifyError(msg: string): string {
  if (msg.includes('IP is not allowed') || (msg.includes('IP') && msg.includes('not allowed'))) {
    return `SMTP 연결 실패: 서버 IP가 메일 서버에서 허용되지 않았습니다. 메일 서버(하이웍스 등) 관리자 페이지에서 발송 서버 IP를 허용 목록에 추가해 주세요. (${msg})`;
  }
  if (msg.includes('authentication failed') || msg.includes('Invalid login')) {
    return `SMTP 인증 실패: 계정 또는 비밀번호를 확인해 주세요. 설정을 변경한 경우 먼저 저장 후 다시 테스트하세요. (${msg})`;
  }
  return `SMTP 연결 실패: ${msg}`;
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { provider, send_test_email } = body;

    if (provider === 'resend') return testResend();

    if (provider === 'smtp') {
      const companyInfo = await getCompanyRepository().get();
      const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from_name, smtp_from_email } = companyInfo;

      if (!smtp_host || !smtp_user || !smtp_password) {
        return NextResponse.json({
          success: false,
          error: 'SMTP 설정이 불완전합니다. 호스트, 계정, 비밀번호를 확인하세요.',
        });
      }

      const transporter = createSmtpTransporter({
        host: smtp_host, port: smtp_port, secure: smtp_secure,
        user: smtp_user, password: smtp_password,
      });

      try {
        await transporter.verify();
      } catch (verifyError) {
        const msg = verifyError instanceof Error ? verifyError.message : 'SMTP 연결 실패';
        return NextResponse.json({ success: false, error: formatSmtpVerifyError(msg) });
      }

      if (send_test_email) {
        const testRecipient = companyInfo.test_recipient_email || session.email;
        const fromName = smtp_from_name || 'CSO 정산서 포털';
        const fromEmail = smtp_from_email || smtp_user;

        await transporter.sendMail({
          from: `${fromName} <${fromEmail}>`,
          to: testRecipient,
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
          data: { connected: true, message: `SMTP 연결 성공. 테스트 메일이 ${testRecipient}로 발송되었습니다.` },
        });
      }

      return NextResponse.json({
        success: true,
        data: { connected: true, message: `SMTP 연결 성공 (${smtp_host}:${smtp_port})` },
      });
    }

    return NextResponse.json({ success: false, error: '알 수 없는 프로바이더입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({ success: false, error: '이메일 테스트 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
