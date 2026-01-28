import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEmailLogs, getEmailStats } from '@/lib/db';
import type { EmailTemplateType, EmailStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const templateType = searchParams.get('template_type') as EmailTemplateType | null;
    const status = searchParams.get('status') as EmailStatus | null;
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const logs = await getEmailLogs({
      template_type: templateType || undefined,
      status: status || undefined,
      limit,
    });
    
    const stats = await getEmailStats();
    
    return NextResponse.json({
      success: true,
      data: {
        logs,
        stats,
      },
    });
  } catch (error) {
    console.error('Get email logs error:', error);
    return NextResponse.json(
      { success: false, error: '이메일 발송 이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
