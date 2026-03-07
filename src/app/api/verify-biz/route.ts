import { NextRequest, NextResponse } from 'next/server';

// 국세청 상태조회 API 응답 타입
interface NtsStatusItem {
  b_no: string;
  b_stt: string;
  b_stt_cd: string;
  tax_type: string;
  tax_type_cd: string;
  end_dt: string;
  utcc_yn: string;
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

interface VerifyBizSuccessResponse {
  success: true;
  data: { b_no: string; b_stt: string; b_stt_cd: string; tax_type: string };
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
const BIZ_NUMBER_LENGTH = 10;

// ── Helpers ──

function errorResponse(error: string, code: string, status: number): NextResponse<VerifyBizErrorResponse> {
  return NextResponse.json({ success: false, error, code }, { status });
}

function validateBizNumber(rawBNo: string): { digits: string } | NextResponse<VerifyBizErrorResponse> {
  if (!rawBNo || typeof rawBNo !== 'string') {
    return errorResponse('사업자등록번호가 누락되었습니다.', 'MISSING_BNO', 400);
  }
  const digits = rawBNo.replace(/\D/g, '');
  if (digits.length !== BIZ_NUMBER_LENGTH || !/^\d{10}$/.test(digits)) {
    return errorResponse('사업자등록번호는 10자리 숫자여야 합니다.', 'INVALID_FORMAT', 400);
  }
  return { digits };
}

function buildVerifiedAt(): string {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

async function callNtsApi(digits: string, apiKey: string): Promise<NextResponse<VerifyBizResponse>> {
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
    return errorResponse('국세청 API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.', 'NTS_API_ERROR', 502);
  }

  const ntsData: NtsApiResponse = await ntsResponse.json();

  if (!ntsData.data || ntsData.data.length === 0) {
    return errorResponse('국세청에 등록되지 않은 사업자등록번호입니다.', 'NOT_REGISTERED', 200);
  }

  const item = ntsData.data[0];
  if (!item.b_stt_cd) {
    return errorResponse(item.b_stt || '국세청에 등록되지 않은 사업자등록번호입니다.', 'NOT_REGISTERED', 200);
  }

  return NextResponse.json({
    success: true,
    data: { b_no: item.b_no, b_stt: item.b_stt, b_stt_cd: item.b_stt_cd, tax_type: item.tax_type },
    verified_at: buildVerifiedAt(),
  });
}

// ── Route handler ──

export async function POST(request: NextRequest): Promise<NextResponse<VerifyBizResponse>> {
  const apiKey = process.env.NTS_API_KEY;
  if (!apiKey) {
    console.error('[verify-biz] NTS_API_KEY 환경변수 미설정');
    return errorResponse('서버 설정 오류입니다. 관리자에게 문의하세요.', 'CONFIG_ERROR', 500);
  }

  let rawBody: { b_no: string };
  try {
    rawBody = await request.json();
  } catch (error) {
    console.error('사업자 진위확인 API 오류:', error);
    return errorResponse('잘못된 요청 형식입니다.', 'INVALID_REQUEST', 400);
  }

  const validation = validateBizNumber(rawBody.b_no);
  if (validation instanceof NextResponse) return validation;

  try {
    return await callNtsApi(validation.digits, apiKey);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[verify-biz] 국세청 API 타임아웃 (10초 초과)');
      return errorResponse('국세청 API 응답 시간이 초과되었습니다. 다시 시도해주세요.', 'TIMEOUT', 504);
    }
    console.error('[verify-biz] 국세청 API 호출 실패:', err);
    return errorResponse('국세청 API 조회 중 오류가 발생했습니다. 다시 시도해주세요.', 'NETWORK_ERROR', 502);
  }
}
