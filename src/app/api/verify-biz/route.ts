import { NextRequest, NextResponse } from 'next/server';

// 국세청 상태조회 API 응답 타입
interface NtsStatusItem {
  b_no: string;
  b_stt: string;      // "계속사업자", "휴업자", "폐업자"
  b_stt_cd: string;   // "01": 계속, "02": 휴업, "03": 폐업
  tax_type: string;    // 과세유형
  tax_type_cd: string;
  end_dt: string;      // 폐업일
  utcc_yn: string;     // 단위과세전환폐업여부
  tax_type_change_dt: string;
  invoice_apply_dt: string;
  rbf_tax_type: string;
  rbf_tax_type_cd: string;
}

interface NtsApiResponse {
  status_code: string;
  match_cnt: number;
  request_cnt: number;
  data: NtsStatusItem[];
}

interface VerifyBizRequest {
  b_no: string;
}

interface VerifyBizSuccessResponse {
  success: true;
  data: {
    b_no: string;
    b_stt: string;
    b_stt_cd: string;
    tax_type: string;
  };
  verified_at: string;
}

interface VerifyBizErrorResponse {
  success: false;
  error: string;
  code: string;
}

type VerifyBizResponse = VerifyBizSuccessResponse | VerifyBizErrorResponse;

const NTS_API_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status';
const NTS_TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest): Promise<NextResponse<VerifyBizResponse>> {
  const apiKey = process.env.NTS_API_KEY;
  if (!apiKey) {
    console.error('[verify-biz] NTS_API_KEY 환경변수 미설정');
    return NextResponse.json(
      { success: false, error: '서버 설정 오류입니다. 관리자에게 문의하세요.', code: 'CONFIG_ERROR' },
      { status: 500 }
    );
  }

  let body: VerifyBizRequest;
  try {
    body = await request.json();
  } catch (error) {
    console.error('사업자 진위확인 API 오류:', error);
    return NextResponse.json(
      { success: false, error: '잘못된 요청 형식입니다.', code: 'INVALID_REQUEST' },
      { status: 400 }
    );
  }

  if (!body.b_no || typeof body.b_no !== 'string') {
    return NextResponse.json(
      { success: false, error: '사업자등록번호가 누락되었습니다.', code: 'MISSING_BNO' },
      { status: 400 }
    );
  }

  // 하이픈 제거 후 10자리 숫자 검증
  const digits = body.b_no.replace(/\D/g, '');
  if (digits.length !== 10 || !/^\d{10}$/.test(digits)) {
    return NextResponse.json(
      { success: false, error: '사업자등록번호는 10자리 숫자여야 합니다.', code: 'INVALID_FORMAT' },
      { status: 400 }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NTS_TIMEOUT_MS);

    const ntsResponse = await fetch(
      `${NTS_API_URL}?serviceKey=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b_no: [digits] }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!ntsResponse.ok) {
      console.error(`[verify-biz] 국세청 API 응답 오류: ${ntsResponse.status} ${ntsResponse.statusText}`);
      return NextResponse.json(
        { success: false, error: '국세청 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.', code: 'NTS_API_ERROR' },
        { status: 502 }
      );
    }

    const ntsData: NtsApiResponse = await ntsResponse.json();

    if (!ntsData.data || ntsData.data.length === 0) {
      return NextResponse.json(
        { success: false, error: '국세청에 등록되지 않은 사업자등록번호입니다.', code: 'NOT_REGISTERED' },
        { status: 200 }
      );
    }

    const item = ntsData.data[0];

    // 미등록 사업자: b_stt_cd가 빈 문자열
    if (!item.b_stt_cd) {
      return NextResponse.json(
        { success: false, error: item.b_stt || '국세청에 등록되지 않은 사업자등록번호입니다.', code: 'NOT_REGISTERED' },
        { status: 200 }
      );
    }

    const verifiedAt = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        b_no: item.b_no,
        b_stt: item.b_stt,
        b_stt_cd: item.b_stt_cd,
        tax_type: item.tax_type,
      },
      verified_at: verifiedAt,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[verify-biz] 국세청 API 타임아웃 (10초 초과)');
      return NextResponse.json(
        { success: false, error: '국세청 API 응답 시간이 초과되었습니다. 다시 시도해주세요.', code: 'TIMEOUT' },
        { status: 504 }
      );
    }

    console.error('[verify-biz] 국세청 API 호출 실패:', err);
    return NextResponse.json(
      { success: false, error: '국세청 API 조회 중 오류가 발생했습니다. 다시 시도해주세요.', code: 'NETWORK_ERROR' },
      { status: 502 }
    );
  }
}
