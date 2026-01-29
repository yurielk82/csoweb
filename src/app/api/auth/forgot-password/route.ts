import { NextRequest, NextResponse } from 'next/server';
import { normalizeBusinessNumber, isValidBusinessNumber, isValidEmail, formatBusinessNumber } from '@/lib/auth';
import { getUserByBusinessNumber, getUserByBusinessNumberAndEmail, createPasswordResetToken } from '@/lib/db';
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
    
    // 1단계: 사업자번호로 사용자 조회
    const userByBN = await getUserByBusinessNumber(normalizedBN);
    
    if (!userByBN) {
      // 사업자번호가 등록되지 않음
      console.log(`[Password Reset] Business number not found: ${normalizedBN}`);
      return NextResponse.json(
        { success: false, error: '등록되지 않은 사업자번호입니다. 회원가입 여부를 확인해주세요.' },
        { status: 404 }
      );
    }
    
    // 2단계: 사업자번호 + 이메일로 정확한 매칭 확인
    const user = await getUserByBusinessNumberAndEmail(normalizedBN, normalizedEmail);
    
    if (!user) {
      // 사업자번호는 있지만 이메일이 일치하지 않음
      console.log(`[Password Reset] Email mismatch for business number: ${normalizedBN}, input: ${normalizedEmail}`);
      return NextResponse.json(
        { success: false, error: '입력하신 이메일이 등록된 이메일과 일치하지 않습니다. 가입 시 등록한 이메일을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 토큰 생성 (제한 없음)
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
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { success: false, error: `비밀번호 재설정 요청 중 오류가 발생했습니다: ${errorMessage}` },
      { status: 500 }
    );
  }
}
