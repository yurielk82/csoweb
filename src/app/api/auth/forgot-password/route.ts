import { NextRequest, NextResponse } from 'next/server';
import { normalizeBusinessNumber, isValidBusinessNumber, isValidEmail, formatBusinessNumber } from '@/lib/auth';
import { getUserByBusinessNumberAndEmail, createPasswordResetToken } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// 토큰 유효 시간 (30분)
const TOKEN_EXPIRY_MINUTES = 30;

/**
 * POST: 비밀번호 재설정 요청
 * - 사업자등록번호 + 이메일 검증
 * - 토큰 생성 및 이메일 발송
 */
export async function POST(request: NextRequest) {
  try {
    const { business_number, email } = await request.json();
    
    // 입력값 검증
    if (!business_number || !email) {
      return NextResponse.json(
        { success: false, error: '사업자번호와 이메일을 모두 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 사업자번호 정규화 (하이픈 제거)
    const normalizedBN = normalizeBusinessNumber(business_number);
    
    if (!isValidBusinessNumber(normalizedBN)) {
      return NextResponse.json(
        { success: false, error: '유효한 사업자번호를 입력해주세요. (10자리 숫자)' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 사업자번호 + 이메일로 사용자 조회
    const user = await getUserByBusinessNumberAndEmail(normalizedBN, normalizedEmail);
    
    if (!user) {
      // 보안: 존재 여부 노출 방지를 위해 성공 메시지 반환
      // 실제로는 이메일이 발송되지 않음
      console.log(`[Password Reset] User not found: ${normalizedBN}, ${normalizedEmail}`);
      return NextResponse.json({
        success: true,
        message: '입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다.',
      });
    }
    
    // 토큰 생성
    const token = await createPasswordResetToken(
      user.id,
      normalizedBN,
      normalizedEmail
    );
    
    // 이메일 발송
    const emailResult = await sendEmail(normalizedEmail, 'password_reset', {
      company_name: user.company_name,
      business_number: formatBusinessNumber(normalizedBN),
      reset_token: token.token,
      expires_in_minutes: TOKEN_EXPIRY_MINUTES,
    });
    
    if (!emailResult.success) {
      console.error('[Password Reset] Email send failed:', emailResult.error);
      return NextResponse.json(
        { success: false, error: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      );
    }
    
    console.log(`[Password Reset] Token created and email sent: ${normalizedBN}`);
    
    return NextResponse.json({
      success: true,
      message: '입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다.',
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: '비밀번호 재설정 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
