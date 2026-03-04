import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCachedUploadSnapshot, getCachedUploadSnapshots } from '@/lib/data-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const month = request.nextUrl.searchParams.get('month');

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json(
          { success: false, error: '정산월(YYYY-MM) 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }

      const snapshot = await getCachedUploadSnapshot(month);
      return NextResponse.json({
        success: true,
        data: snapshot,
      });
    }

    const snapshots = await getCachedUploadSnapshots();
    return NextResponse.json({
      success: true,
      data: snapshots,
    });
  } catch (error) {
    console.error('Get upload snapshots error:', error);
    return NextResponse.json(
      { success: false, error: '업로드 스냅샷 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
