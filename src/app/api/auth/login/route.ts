import { NextRequest, NextResponse } from 'next/server';
import { getUserByBusinessNumber } from '@/lib/db';
import { verifyPassword, setSession, normalizeBusinessNumber } from '@/lib/auth';
import type { UserSession } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { business_number, password } = await request.json();
    
    if (!business_number || !password) {
      return NextResponse.json(
        { success: false, error: '사업자번호와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    const normalizedBN = normalizeBusinessNumber(business_number);
    const user = await getUserByBusinessNumber(normalizedBN);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '등록되지 않은 사업자번호입니다.' },
        { status: 401 }
      );
    }
    
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    if (!user.is_admin && !user.is_approved) {
      return NextResponse.json(
        { success: false, error: '승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.' },
        { status: 403 }
      );
    }
    
    const session: UserSession = {
      id: user.id,
      business_number: user.business_number,
      company_name: user.company_name,
      email: user.email,
      is_admin: user.is_admin,
      is_approved: user.is_approved,
    };
    
    await setSession(session);
    
    return NextResponse.json({
      success: true,
      data: {
        user: session,
        redirect: user.is_admin ? '/admin' : '/dashboard',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
