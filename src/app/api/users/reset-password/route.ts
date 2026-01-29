import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, normalizeBusinessNumber } from '@/lib/auth';
import { getUserByBusinessNumber, resetPasswordToDefault } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST: 관리자 비밀번호 초기화
 * - 관리자 권한 필요
 * - 비밀번호를 'u' + 사업자등록번호(숫자만) 으로 초기화
 * - must_change_password = true 설정
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // 관리자 권한 확인
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { business_number } = await request.json();
    
    if (!business_number) {
      return NextResponse.json(
        { success: false, error: '사업자번호를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // 사업자번호 정규화
    const normalizedBN = normalizeBusinessNumber(business_number);
    
    // 사용자 존재 확인
    const user = await getUserByBusinessNumber(normalizedBN);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 자기 자신은 초기화 불가 (관리자 본인)
    if (normalizedBN === session.business_number) {
      return NextResponse.json(
        { success: false, error: '자신의 비밀번호는 이 기능으로 초기화할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    // 새 비밀번호 생성: 'u' + 사업자번호(숫자만)
    const newPassword = `u${normalizedBN}`;
    const passwordHash = await hashPassword(newPassword);
    
    // 비밀번호 초기화 (must_change_password = true 설정)
    const success = await resetPasswordToDefault(normalizedBN, passwordHash);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '비밀번호 초기화에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `${user.company_name}의 비밀번호가 초기화되었습니다.`,
      data: {
        company_name: user.company_name,
        new_password_hint: `u${normalizedBN}`,
      }
    });
    
  } catch (error) {
    console.error('Admin password reset error:', error);
    return NextResponse.json(
      { success: false, error: '비밀번호 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
