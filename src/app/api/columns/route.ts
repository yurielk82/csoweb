import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getColumnSettingRepository } from '@/infrastructure/supabase';
import { DEFAULT_COLUMN_SETTINGS } from '@/types';
import { getCachedColumns, invalidateColumnCache } from '@/lib/data-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const columns = await getCachedColumns();
    
    return NextResponse.json({
      success: true,
      data: columns,
    });
  } catch (error) {
    console.error('Get columns error:', error);
    return NextResponse.json(
      { success: false, error: '컬럼 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { columns } = await request.json();
    
    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, error: '유효한 컬럼 설정을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    await getColumnSettingRepository().update(columns);
    invalidateColumnCache();

    return NextResponse.json({
      success: true,
      message: '컬럼 설정이 저장되었습니다.',
    });
  } catch (error) {
    console.error('Update columns error:', error);
    return NextResponse.json(
      { success: false, error: '컬럼 설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Reset to defaults
export async function DELETE() {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    // Re-initialize with defaults
    await getColumnSettingRepository().update(DEFAULT_COLUMN_SETTINGS.map((c, index) => ({
      ...c,
      display_order: index + 1,
    })));
    invalidateColumnCache();

    return NextResponse.json({
      success: true,
      message: '컬럼 설정이 기본값으로 초기화되었습니다.',
    });
  } catch (error) {
    console.error('Reset columns error:', error);
    return NextResponse.json(
      { success: false, error: '컬럼 설정 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
