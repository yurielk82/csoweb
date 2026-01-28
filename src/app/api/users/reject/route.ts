import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rejectUser, getUserByBusinessNumber } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { business_number, reason } = await request.json();
    
    if (!business_number) {
      return NextResponse.json(
        { success: false, error: '사업자번호를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    const user = await getUserByBusinessNumber(business_number);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // Send rejection notification email before deleting
    await sendEmail(user.email, 'approval_rejected', {
      company_name: user.company_name,
      reason: reason || undefined,
    });
    
    const rejected = await rejectUser(business_number);
    
    if (!rejected) {
      return NextResponse.json(
        { success: false, error: '거부 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `${user.company_name}의 회원가입이 거부되었습니다.`,
    });
  } catch (error) {
    console.error('Reject user error:', error);
    return NextResponse.json(
      { success: false, error: '거부 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
