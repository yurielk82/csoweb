import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserByBusinessNumber, 
  getUserByEmail, 
  createUser 
} from '@/lib/db';
import { 
  hashPassword, 
  normalizeBusinessNumber, 
  isValidBusinessNumber, 
  isValidEmail, 
  isValidPassword 
} from '@/lib/auth';
import { notifyAdmin } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { 
      business_number, 
      company_name, 
      ceo_name,
      address,
      phone1,
      phone2,
      email, 
      email2,
      password 
    } = await request.json();
    
    // Validation
    if (!business_number || !company_name || !ceo_name || !address || !phone1 || !email || !password) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }
    
    const normalizedBN = normalizeBusinessNumber(business_number);
    
    if (!isValidBusinessNumber(normalizedBN)) {
      return NextResponse.json(
        { success: false, error: '유효한 사업자번호를 입력해주세요. (10자리 숫자)' },
        { status: 400 }
      );
    }
    
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    
    // Check if business number already exists
    const existingByBN = await getUserByBusinessNumber(normalizedBN);
    if (existingByBN) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 사업자번호입니다.' },
        { status: 409 }
      );
    }
    
    // Check if email already exists
    const existingByEmail = await getUserByEmail(email);
    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일 주소입니다.' },
        { status: 409 }
      );
    }
    
    // Create user
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      business_number: normalizedBN,
      company_name,
      ceo_name,
      address,
      phone1,
      phone2: phone2 || undefined,
      email,
      email2: email2 || undefined,
      password_hash: passwordHash,
    });
    
    // Notify admin about new registration
    await notifyAdmin('registration_request', {
      business_number: normalizedBN,
      company_name,
      ceo_name,
      address,
      phone1,
      email,
      created_at: user.created_at,
    });
    
    return NextResponse.json({
      success: true,
      message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
