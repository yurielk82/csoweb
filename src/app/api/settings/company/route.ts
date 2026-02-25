import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import { getSession } from '@/lib/auth';
import { getCompanyRepository } from '@/infrastructure/supabase';
import { invalidateEmailSettingsCache } from '@/lib/email';

export const dynamic = 'force-dynamic';

const PASSWORD_MASK = '••••••••';

// 회사 정보를 footer-data 태그로 캐싱 (무기한, 수동 갱신만)
const getCachedCompanyInfo = unstable_cache(
  async () => getCompanyRepository().get(),
  ['company-info'],
  { tags: ['footer-data'] }
);

// 회사 정보 조회 (로그인 필요 없음 - 로그인 화면에서 사용)
export async function GET() {
  try {
    const companyInfo = await getCachedCompanyInfo();

    // smtp_password 마스킹
    const maskedData = {
      ...companyInfo,
      smtp_password: companyInfo.smtp_password ? PASSWORD_MASK : '',
    };

    return NextResponse.json({
      success: true,
      data: maskedData,
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

    // 마스킹된 비밀번호가 전송되면 해당 필드 제거 (기존값 유지)
    if (data.smtp_password === PASSWORD_MASK) {
      delete data.smtp_password;
    }

    console.log('PUT /api/settings/company - Saving data (password masked)');

    await getCompanyRepository().update(data);

    // 캐시 갱신: footer-data 태그 무효화
    revalidateTag('footer-data');

    // 이메일 설정 캐시 무효화
    invalidateEmailSettingsCache();

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
