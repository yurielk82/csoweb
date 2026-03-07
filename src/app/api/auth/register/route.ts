import { NextRequest, NextResponse } from 'next/server';
import { getUserRepository } from '@/infrastructure/supabase';
import { getSupabase } from '@/lib/supabase';
import {
  hashPassword,
  normalizeBusinessNumber,
  isValidBusinessNumber,
  isValidEmail,
  isValidPassword
} from '@/lib/auth';
import { notifyAdmin } from '@/lib/email';
import { invalidateUserCache, invalidateCSOMatchingCache } from '@/lib/data-cache';

// ── Validation ──

interface RegisterInput {
  business_number: string;
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  password: string;
}

function validateRegisterInput(input: RegisterInput): string | null {
  if (!input.business_number || !input.company_name || !input.ceo_name ||
      !input.zipcode || !input.address1 || !input.phone1 || !input.email || !input.password) {
    return '필수 항목을 모두 입력해주세요.';
  }
  const normalizedBN = normalizeBusinessNumber(input.business_number);
  if (!isValidBusinessNumber(normalizedBN)) return '유효한 사업자번호를 입력해주세요. (10자리 숫자)';
  if (!isValidEmail(input.email)) return '유효한 이메일 주소를 입력해주세요.';
  if (!isValidPassword(input.password)) return '비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.';
  return null;
}

// ── CSO 매핑 자동 생성 ──

async function autoCreateCsoMatching(companyName: string, normalizedBN: string) {
  const supabase = getSupabase();
  const { error: matchError } = await supabase
    .from('cso_matching')
    .upsert(
      {
        cso_company_name: companyName.trim(),
        business_number: normalizedBN,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cso_company_name', ignoreDuplicates: true }
    );
  if (matchError) {
    console.error('CSO 매핑 자동 생성 DB 에러:', matchError.message, matchError.details);
  } else {
    invalidateCSOMatchingCache();
    console.log(`CSO 매핑 자동 생성 (회원가입): ${companyName} → ${normalizedBN}`);
  }
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const input: RegisterInput = await request.json();

    const validationError = validateRegisterInput(input);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const normalizedBN = normalizeBusinessNumber(input.business_number);
    const userRepo = getUserRepository();

    // 중복 검사
    const existingByBN = await userRepo.findByBusinessNumber(normalizedBN);
    if (existingByBN) {
      return NextResponse.json({ success: false, error: '이미 등록된 사업자번호입니다.' }, { status: 409 });
    }

    const existingByEmail = await userRepo.findByEmail(input.email);
    if (existingByEmail) {
      return NextResponse.json({ success: false, error: '이미 등록된 이메일 주소입니다.' }, { status: 409 });
    }

    // 사용자 생성
    const passwordHash = await hashPassword(input.password);
    const user = await userRepo.create({
      business_number: normalizedBN,
      company_name: input.company_name,
      ceo_name: input.ceo_name,
      zipcode: input.zipcode,
      address1: input.address1,
      address2: input.address2 || undefined,
      phone1: input.phone1,
      phone2: input.phone2 || undefined,
      email: input.email,
      email2: input.email2 || undefined,
      password_hash: passwordHash,
    });

    invalidateUserCache();

    // CSO 매핑 자동 생성 (실패해도 가입에 영향 없음)
    try { await autoCreateCsoMatching(input.company_name, normalizedBN); }
    catch (error) { console.error('CSO 매핑 자동 생성 실패 (회원가입은 정상 처리됨):', error); }

    // 관리자 알림
    const fullAddress = input.address2 ? `${input.address1} ${input.address2}` : input.address1;
    await notifyAdmin('registration_request', {
      business_number: normalizedBN,
      company_name: input.company_name,
      ceo_name: input.ceo_name,
      address: `(${input.zipcode}) ${fullAddress}`,
      phone1: input.phone1,
      email: input.email,
      created_at: user.created_at,
    });

    return NextResponse.json({
      success: true,
      message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: '회원가입 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
