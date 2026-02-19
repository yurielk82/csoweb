import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getSession } from '@/lib/auth';

// 허용된 태그 목록 (필요시 추가)
const ALLOWED_TAGS = ['footer-data'];

// On-demand Revalidation 엔드포인트
// 사용법: POST /api/revalidate?tag=footer-data
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const tag = request.nextUrl.searchParams.get('tag');

    if (!tag || !ALLOWED_TAGS.includes(tag)) {
      return NextResponse.json(
        { success: false, error: `허용되지 않은 태그입니다. 사용 가능: ${ALLOWED_TAGS.join(', ')}` },
        { status: 400 }
      );
    }

    revalidateTag(tag);

    return NextResponse.json({
      success: true,
      revalidated: true,
      tag,
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { success: false, error: '캐시 갱신 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
