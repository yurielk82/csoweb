import { NextRequest, NextResponse } from 'next/server';
import { isValidPassword } from '@/lib/auth';
import { verifyResetToken, completePasswordReset } from '@/application/auth';

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

    const validation = await verifyResetToken(token);

    if (!validation.valid || !validation.user || !validation.tokenData) {
      return NextResponse.json(
        { success: false, error: validation.error || '유효하지 않은 토큰입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        company_name: validation.user.company_name,
        business_number: validation.tokenData.business_number,
        email: validation.tokenData.email,
        expires_at: validation.tokenData.expires_at,
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
        { success: false, error: '비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const result = await completePasswordReset(token, new_password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '비밀번호 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(`[Password Reset] Password changed successfully via token`);

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
