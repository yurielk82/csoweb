import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByBusinessNumber, updateUser, deleteUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 회원 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { businessNumber: string } }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { businessNumber } = params;
    const { 
      company_name, 
      ceo_name,
      zipcode,
      address1,
      address2,
      phone1,
      phone2,
      email, 
      email2,
      is_admin, 
      is_approved 
    } = await request.json();
    
    const user = await getUserByBusinessNumber(businessNumber);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    const success = await updateUser(businessNumber, {
      company_name,
      ceo_name,
      zipcode,
      address1,
      address2,
      phone1,
      phone2,
      email,
      email2,
      is_admin,
      is_approved,
    });
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '회원 정보가 수정되었습니다.',
      });
    } else {
      return NextResponse.json(
        { success: false, error: '회원 정보 수정에 실패했습니다.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: '회원 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 회원 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { businessNumber: string } }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { businessNumber } = params;
    
    // 자기 자신은 삭제 불가
    if (businessNumber === session.business_number) {
      return NextResponse.json(
        { success: false, error: '자신의 계정은 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }
    
    const success = await deleteUser(businessNumber);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '회원이 삭제되었습니다.',
      });
    } else {
      return NextResponse.json(
        { success: false, error: '회원 삭제에 실패했습니다.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: '회원 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
