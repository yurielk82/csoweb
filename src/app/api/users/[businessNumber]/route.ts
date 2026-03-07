import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserRepository } from '@/infrastructure/supabase';
import { invalidateUserCache, invalidateCSOMatchingCache } from '@/lib/data-cache';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** CSO 매핑 삭제 (회원 삭제 시 연쇄 삭제) */
async function deleteCSOMatchingByBN(businessNumber: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error: matchError } = await supabase
      .from('cso_matching')
      .delete()
      .eq('business_number', businessNumber);
    if (matchError) {
      console.error('[Delete User] CSO 매핑 삭제 DB 에러:', matchError.message);
      return;
    }
    invalidateCSOMatchingCache();
    console.log(`[Delete User] CSO 매핑 삭제 완료: ${businessNumber}`);
  } catch (error) {
    console.error('[Delete User] CSO 매핑 삭제 실패:', error);
  }
}

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
    
    const userRepo = getUserRepository();
    const user = await userRepo.findByBusinessNumber(businessNumber);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const success = await userRepo.update(businessNumber, {
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
      invalidateUserCache();
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
    
    const success = await getUserRepository().delete(businessNumber);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '회원 삭제에 실패했습니다.' },
        { status: 400 }
      );
    }

    // 해당 사업자번호의 CSO 매핑도 함께 삭제
    await deleteCSOMatchingByBN(businessNumber);

    invalidateUserCache();
    return NextResponse.json({
      success: true,
      message: '회원이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: '회원 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
