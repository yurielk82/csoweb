import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, normalizeBusinessNumber, isValidBusinessNumber, isValidEmail } from '@/lib/auth';
import { getUserByBusinessNumberAndEmail, resetPasswordToDefault } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST: 사용자 직접 비밀번호 초기화 (Self-Reset)
 * - 사업자등록번호 + 이메일 검증
 * - 비밀번호를 'u' + 사업자등록번호(숫자만) 으로 초기화
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
    
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 사업자번호 + 이메일로 사용자 조회
    const user = await getUserByBusinessNumberAndEmail(normalizedBN, email.toLowerCase().trim());
    
    if (!user) {
      // 보안: 존재 여부 노출 방지를 위해 동일한 메시지 사용
      return NextResponse.json(
        { success: false, error: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 새 비밀번호 생성: 'u' + 사업자번호(숫자만)
    const newPassword = `u${normalizedBN}`;
    const passwordHash = await hashPassword(newPassword);
    
    // 비밀번호 초기화 (must_change_password = true 설정)
    const success = await resetPasswordToDefault(normalizedBN, passwordHash);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '비밀번호 초기화에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '비밀번호가 사업자번호 조합으로 초기화되었습니다. 로그인 후 반드시 변경해주세요.',
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: '비밀번호 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
