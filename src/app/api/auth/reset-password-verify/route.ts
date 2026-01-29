import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, isValidPassword } from '@/lib/auth';
import { validatePasswordResetToken, markTokenAsUsed, completePasswordChange, getUserByBusinessNumber } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET: 토큰 유효성 검증
 * - 토큰이 유효한지 확인
 * - 유효하면 사용자 정보 일부 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 토큰 유효성 검증
    const validation = await validatePasswordResetToken(token);
    
    if (!validation.valid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || '유효하지 않은 토큰입니다.' },
        { status: 400 }
      );
    }
    
    // 사용자 정보 조회
    const user = await getUserByBusinessNumber(validation.token.business_number);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        company_name: user.company_name,
        business_number: validation.token.business_number,
        email: validation.token.email,
        expires_at: validation.token.expires_at,
      },
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, error: '토큰 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST: 비밀번호 재설정 완료
 * - 토큰 검증 후 새 비밀번호로 변경
 * - 토큰 사용 처리
 */
export async function POST(request: NextRequest) {
  try {
    const { token, new_password, confirm_password } = await request.json();
    
    // 입력값 검증
    if (!token) {
      return NextResponse.json(
        { success: false, error: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }
    
    if (!new_password || !confirm_password) {
      return NextResponse.json(
        { success: false, error: '새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    if (new_password !== confirm_password) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }
    
    if (!isValidPassword(new_password)) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    
    // 토큰 유효성 검증
    const validation = await validatePasswordResetToken(token);
    
    if (!validation.valid || !validation.token) {
      return NextResponse.json(
        { success: false, error: validation.error || '유효하지 않은 토큰입니다.' },
        { status: 400 }
      );
    }
    
    const { business_number } = validation.token;
    
    // 비밀번호 해싱
    const passwordHash = await hashPassword(new_password);
    
    // 비밀번호 변경 (must_change_password = false 설정)
    const success = await completePasswordChange(business_number, passwordHash);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '비밀번호 변경에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 토큰 사용 처리 (만료)
    await markTokenAsUsed(token);
    
    console.log(`[Password Reset] Password changed successfully: ${business_number}`);
    
    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다. 로그인 페이지로 이동합니다.',
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
