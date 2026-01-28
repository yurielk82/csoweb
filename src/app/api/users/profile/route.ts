import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';
import { getUserByBusinessNumber, updateUserEmail, updateUserPassword, updateUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { company_name, email, current_password, new_password } = await request.json();
    
    const user = await getUserByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 업체명 변경
    if (company_name && company_name !== user.company_name) {
      const success = await updateUser(session.business_number, { company_name });
      if (success) {
        return NextResponse.json({
          success: true,
          message: '업체명이 변경되었습니다.',
        });
      } else {
        return NextResponse.json(
          { success: false, error: '업체명 변경에 실패했습니다.' },
          { status: 400 }
        );
      }
    }
    
    // 이메일 변경
    if (email && email !== user.email) {
      const success = await updateUserEmail(session.business_number, email);
      if (success) {
        return NextResponse.json({
          success: true,
          message: '이메일이 변경되었습니다.',
        });
      } else {
        return NextResponse.json(
          { success: false, error: '이메일 변경에 실패했습니다.' },
          { status: 400 }
        );
      }
    }
    
    // 비밀번호 변경
    if (current_password && new_password) {
      // 현재 비밀번호 확인
      const isValid = await verifyPassword(current_password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: '현재 비밀번호가 일치하지 않습니다.' },
          { status: 400 }
        );
      }
      
      // 새 비밀번호 해시
      const newHash = await hashPassword(new_password);
      const success = await updateUserPassword(session.business_number, newHash);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: '비밀번호가 변경되었습니다.',
        });
      } else {
        return NextResponse.json(
          { success: false, error: '비밀번호 변경에 실패했습니다.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: '변경할 항목이 없습니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: '프로필 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
