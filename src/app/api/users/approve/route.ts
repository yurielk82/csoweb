import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { approveUser, getUserByBusinessNumber } from '@/lib/db';
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
    
    const { business_number } = await request.json();
    
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
    
    const approved = await approveUser(business_number);
    
    if (!approved) {
      return NextResponse.json(
        { success: false, error: '승인 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // Send approval notification email
    console.log(`[Approve] Sending email to: ${user.email}, company: ${user.company_name}`);
    const emailResult = await sendEmail(user.email, 'approval_complete', {
      company_name: user.company_name,
      business_number: user.business_number,
    });
    
    if (!emailResult.success) {
      console.error(`[Approve] Email failed for ${user.email}: ${emailResult.error}`);
    } else {
      console.log(`[Approve] Email sent successfully to: ${user.email}`);
    }
    
    return NextResponse.json({
      success: true,
      message: `${user.company_name}의 회원가입이 승인되었습니다.`,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json(
      { success: false, error: '승인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
