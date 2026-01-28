import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getUserByBusinessNumber, 
  getAllUsers, 
  getSettlementSummary,
  getBusinessNumbersForSettlementMonth 
} from '@/lib/db';
import { sendEmail } from '@/lib/email';

interface MailMergeData {
  recipients: string[]; // 'all' | 'year_month:YYYY-MM' | business_numbers[]
  subject: string;
  body: string;
  year_month?: string;
}

// Replace template variables
function replaceVariables(
  template: string,
  data: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

// Format currency
function formatCurrency(value: number): string {
  return value.toLocaleString('ko-KR') + '원';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { recipients, subject, body, year_month }: MailMergeData = await request.json();
    
    if (!subject || !body) {
      return NextResponse.json(
        { success: false, error: '제목과 내용을 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // Determine recipient list
    let targetBusinessNumbers: string[] = [];
    
    if (recipients.includes('all')) {
      // All approved users
      const users = await getAllUsers();
      targetBusinessNumbers = users
        .filter(u => u.is_approved && !u.is_admin)
        .map(u => u.business_number);
    } else if (recipients.length === 1 && recipients[0].startsWith('year_month:')) {
      // Users with data in specific settlement_month
      const ym = recipients[0].replace('year_month:', '');
      targetBusinessNumbers = await getBusinessNumbersForSettlementMonth(ym);
    } else {
      // Specific business numbers
      targetBusinessNumbers = recipients;
    }
    
    if (targetBusinessNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: '발송 대상이 없습니다.' },
        { status: 400 }
      );
    }
    
    // Send emails
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const bn of targetBusinessNumbers) {
      const user = await getUserByBusinessNumber(bn);
      if (!user || !user.is_approved) continue;
      
      // Get settlement summary if year_month is specified
      let summary = { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
      if (year_month) {
        summary = await getSettlementSummary(bn, year_month);
      }
      
      // Prepare template variables
      const variables: Record<string, string | number> = {
        '업체명': user.company_name,
        '사업자번호': user.business_number,
        '이메일': user.email,
        '정산월': year_month || '',
        '총_금액': formatCurrency(summary.총_금액),
        '총_수수료': formatCurrency(summary.총_수수료),
        '제약수수료_합계': formatCurrency(summary.제약수수료_합계),
        '담당수수료_합계': formatCurrency(summary.담당수수료_합계),
        '데이터_건수': summary.데이터_건수,
        '총_수량': summary.총_수량.toLocaleString('ko-KR'),
      };
      
      // Replace variables in subject and body
      const personalizedSubject = replaceVariables(subject, variables);
      const personalizedBody = replaceVariables(body, variables);
      
      // Send email
      const result = await sendEmail(user.email, 'mail_merge', {
        subject: personalizedSubject,
        body: personalizedBody,
      });
      
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${user.company_name}: ${result.error}`);
      }
      
      // Rate limiting: 10 emails per second
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return NextResponse.json({
      success: true,
      data: {
        sent,
        failed,
        total: targetBusinessNumbers.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
      message: `${sent}건 발송 완료, ${failed}건 실패`,
    });
  } catch (error) {
    console.error('Mail merge error:', error);
    return NextResponse.json(
      { success: false, error: '메일 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Preview mail merge
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { subject, body, year_month } = await request.json();
    
    // Sample data for preview
    const sampleVariables: Record<string, string | number> = {
      '업체명': 'ABC 상사',
      '사업자번호': '123-45-67890',
      '이메일': 'sample@example.com',
      '정산월': year_month || '2026-01',
      '총_금액': formatCurrency(15234000),
      '총_수수료': formatCurrency(1781729),
      '제약수수료_합계': formatCurrency(1781729),
      '담당수수료_합계': formatCurrency(523400),
      '데이터_건수': 127,
      '총_수량': '1,250',
    };
    
    const previewSubject = replaceVariables(subject || '', sampleVariables);
    const previewBody = replaceVariables(body || '', sampleVariables);
    
    return NextResponse.json({
      success: true,
      data: {
        subject: previewSubject,
        body: previewBody,
        variables: Object.keys(sampleVariables).map(k => `{{${k}}}`),
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { success: false, error: '미리보기 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
