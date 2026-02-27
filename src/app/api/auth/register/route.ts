import { NextRequest, NextResponse } from 'next/server';
import { getUserRepository } from '@/infrastructure/supabase';
import { 
  hashPassword, 
  normalizeBusinessNumber, 
  isValidBusinessNumber, 
  isValidEmail, 
  isValidPassword 
} from '@/lib/auth';
import { notifyAdmin } from '@/lib/email';
import { invalidateUserCache } from '@/lib/data-cache';

export async function POST(request: NextRequest) {
  try {
    const { 
      business_number, 
      company_name, 
      ceo_name,
      zipcode,
      address1,
      address2,
      phone1,
      phone2,
      email, 
      email2,
      password 
    } = await request.json();
    
    // Validation
    if (!business_number || !company_name || !ceo_name || !zipcode || !address1 || !phone1 || !email || !password) {
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
        { success: false, error: '비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }
    
    const userRepo = getUserRepository();

    // Check if business number already exists
    const existingByBN = await userRepo.findByBusinessNumber(normalizedBN);
    if (existingByBN) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 사업자번호입니다.' },
        { status: 409 }
      );
    }
    
    // Check if email already exists
    const existingByEmail = await userRepo.findByEmail(email);
    if (existingByEmail) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일 주소입니다.' },
        { status: 409 }
      );
    }
    
    // Create user
    const passwordHash = await hashPassword(password);
    const user = await userRepo.create({
      business_number: normalizedBN,
      company_name,
      ceo_name,
      zipcode,
      address1,
      address2: address2 || undefined,
      phone1,
      phone2: phone2 || undefined,
      email,
      email2: email2 || undefined,
      password_hash: passwordHash,
    });
    
    invalidateUserCache();

    // Notify admin about new registration
    const fullAddress = address2 ? `${address1} ${address2}` : address1;
    await notifyAdmin('registration_request', {
      business_number: normalizedBN,
      company_name,
      ceo_name,
      address: `(${zipcode}) ${fullAddress}`,
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
