import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';
import { getUserByBusinessNumber, updateUserPassword, updateUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: 현재 사용자 정보 조회
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const user = await getUserByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // password_hash 제외하고 반환
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userData } = user;
    
    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: '프로필 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { 
      company_name, 
      ceo_name,
      address,
      phone1,
      phone2,
      email, 
      email2,
      current_password, 
      new_password 
    } = await request.json();
    
    const user = await getUserByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 기본 정보 변경 (업체명, 대표자명, 주소, 연락처 등)
    const updateData: Record<string, string | undefined> = {};
    if (company_name !== undefined && company_name !== user.company_name) updateData.company_name = company_name;
    if (ceo_name !== undefined && ceo_name !== user.ceo_name) updateData.ceo_name = ceo_name;
    if (address !== undefined && address !== user.address) updateData.address = address;
    if (phone1 !== undefined && phone1 !== user.phone1) updateData.phone1 = phone1;
    if (phone2 !== undefined && phone2 !== user.phone2) updateData.phone2 = phone2;
    if (email !== undefined && email !== user.email) updateData.email = email;
    if (email2 !== undefined && email2 !== user.email2) updateData.email2 = email2;
    
    if (Object.keys(updateData).length > 0) {
      const success = await updateUser(session.business_number, updateData);
      if (success) {
        return NextResponse.json({
          success: true,
          message: '정보가 변경되었습니다.',
        });
      } else {
        return NextResponse.json(
          { success: false, error: '정보 변경에 실패했습니다.' },
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
