import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, verifyPassword, isValidPassword } from '@/lib/auth';
import { getUserRepository } from '@/infrastructure/supabase';
import { invalidateUserCache } from '@/lib/data-cache';
import type { User } from '@/domain/user/types';

export const dynamic = 'force-dynamic';

// ── Helpers ──

const PROFILE_FIELDS = ['company_name', 'ceo_name', 'zipcode', 'address1', 'address2', 'phone1', 'phone2', 'email', 'email2'] as const;

type ProfileField = typeof PROFILE_FIELDS[number];

function buildUpdateData(
  body: Record<string, string | undefined>,
  user: User,
): Record<string, string | undefined> {
  const updateData: Record<string, string | undefined> = {};

  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined && body[field] !== user[field as ProfileField]) {
      updateData[field] = body[field];
    }
  }

  return updateData;
}

interface HandlePasswordChangeOptions {
  currentPassword: string;
  newPassword: string;
  passwordHash: string;
  businessNumber: string;
  isTest: boolean;
  userRepo: ReturnType<typeof getUserRepository>;
}

async function handlePasswordChange({
  currentPassword, newPassword, passwordHash, businessNumber, isTest, userRepo,
}: HandlePasswordChangeOptions) {
  if (!isValidPassword(newPassword, isTest)) {
    const msg = isTest
      ? '비밀번호는 4자 이상이어야 합니다.'
      : '비밀번호는 영문+숫자 조합 6자 이상이어야 합니다.';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  const isValid = await verifyPassword(currentPassword, passwordHash);
  if (!isValid) {
    return NextResponse.json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  const success = await userRepo.updatePassword(businessNumber, newHash);

  if (success) {
    return NextResponse.json({ success: true, message: '비밀번호가 변경되었습니다.' });
  }
  return NextResponse.json({ success: false, error: '비밀번호 변경에 실패했습니다.' }, { status: 400 });
}

// ── Route handlers ──

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userRepo = getUserRepository();
    const user = await userRepo.findByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userData } = user;
    return NextResponse.json({ success: true, data: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ success: false, error: '프로필 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const userRepo = getUserRepository();
    const user = await userRepo.findByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 비밀번호 변경 (별도 처리)
    if (body.current_password && body.new_password) {
      return handlePasswordChange({
        currentPassword: body.current_password, newPassword: body.new_password,
        passwordHash: user.password_hash, businessNumber: session.business_number,
        isTest: session.is_test, userRepo,
      });
    }

    // 기본 정보 변경
    const updateData = buildUpdateData(body, user);
    if (Object.keys(updateData).length > 0) {
      const success = await userRepo.update(session.business_number, updateData);
      if (success) {
        invalidateUserCache();
        return NextResponse.json({ success: true, message: '정보가 변경되었습니다.' });
      }
      return NextResponse.json({ success: false, error: '정보 변경에 실패했습니다.' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: '변경할 항목이 없습니다.' }, { status: 400 });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, error: '프로필 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
