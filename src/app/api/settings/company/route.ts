import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompanyInfo, updateCompanyInfo } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 회사 정보 조회 (로그인 필요 없음 - 로그인 화면에서 사용)
export async function GET() {
  try {
    const companyInfo = await getCompanyInfo();
    
    return NextResponse.json({
      success: true,
      data: companyInfo,
    });
  } catch (error) {
    console.error('Get company info error:', error);
    return NextResponse.json(
      { success: false, error: '회사 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 회사 정보 수정 (관리자만)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    await updateCompanyInfo(data);
    
    return NextResponse.json({
      success: true,
      message: '회사 정보가 저장되었습니다.',
    });
  } catch (error) {
    console.error('Update company info error:', error);
    return NextResponse.json(
      { success: false, error: '회사 정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
