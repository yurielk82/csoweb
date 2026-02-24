# API Reference

## 외부 API

### 국세청 사업자등록정보 진위확인 및 상태조회 서비스

| 항목 | 값 |
|------|-----|
| 출처 | [공공데이터포털](https://www.data.go.kr/data/15081808/openapi.do) |
| Base URL | `https://api.odcloud.kr/api/nts-businessman/v1` |
| 프로토콜 | REST (POST only) |
| 데이터 포맷 | JSON / XML |
| 일 호출 제한 | 1,000,000건 |
| 1회 최대 요청 | 100건 (초과 시 `TOO_LARGE_REQUEST`) |
| 환경변수 | `NTS_API_KEY` |
| Swagger | https://infuser.odcloud.kr/api/stages/28493/api-docs |
| 버전 | v1.1.0 |

#### 엔드포인트

| API | Method | Path | 용도 |
|-----|--------|------|------|
| 진위확인 | POST | `/validate` | 사업자번호+개업일자+대표자명 등 일치여부 확인 |
| 상태조회 | POST | `/status` | 사업자번호로 운영상태(계속/휴업/폐업), 과세유형 조회 |

#### 인증

- `serviceKey`를 **URL query string**으로 전달 (body 아님)
- `returnType=JSON` (기본값) 또는 `returnType=XML`

```
POST https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey={NTS_API_KEY}
Content-Type: application/json
```

#### 상태조회 API (`/status`)

**Request Body:**
```json
{
  "b_no": ["0000000000"]
}
```

**Response (200):**
```json
{
  "status_code": "OK",
  "match_cnt": 1,
  "request_cnt": 1,
  "data": [
    {
      "b_no": "0000000000",
      "b_stt": "계속사업자",
      "b_stt_cd": "01",
      "tax_type": "부가가치세 일반과세자",
      "tax_type_cd": "01",
      "end_dt": "",
      "utcc_yn": "N",
      "tax_type_change_dt": "",
      "invoice_apply_dt": "",
      "rbf_tax_type": "부가가치세 일반과세자",
      "rbf_tax_type_cd": "01"
    }
  ]
}
```

| 필드 | 설명 |
|------|------|
| `b_stt` | 납세자상태 (계속사업자, 휴업자, 폐업자) |
| `b_stt_cd` | 납세자상태코드 (`01`: 계속, `02`: 휴업, `03`: 폐업) |
| `tax_type` | 과세유형 메시지 |
| `tax_type_cd` | 과세유형코드 (`01`: 일반, `02`: 간이, `03`: 면세 등) |
| `end_dt` | 폐업일자 (YYYYMMDD, 폐업자만) |
| `utcc_yn` | 단위과세전환폐업여부 (Y/N) |
| `tax_type_change_dt` | 최근 과세유형 전환일자 |
| `invoice_apply_dt` | 세금계산서 적용일자 |
| `rbf_tax_type` | 직전 과세유형 메시지 |
| `rbf_tax_type_cd` | 직전 과세유형코드 |

미등록 사업자 응답: `"국세청에 등록되지 않은 사업자등록번호입니다"`

#### 진위확인 API (`/validate`)

**Request Body:**
```json
{
  "businesses": [
    {
      "b_no": "0000000000",
      "start_dt": "20000101",
      "p_nm": "홍길동",
      "p_nm2": "",
      "b_nm": "",
      "corp_no": "",
      "b_sector": "",
      "b_type": "",
      "b_adr": ""
    }
  ]
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `b_no` | O | 사업자등록번호 (10자리 숫자, `-` 제거) |
| `start_dt` | O | 개업일자 (YYYYMMDD, `-` 제거) |
| `p_nm` | O | 대표자성명 (외국인: 영문명) |
| `p_nm2` | | 대표자성명2 (외국인 사업자만 한글명) |
| `b_nm` | | 상호 |
| `corp_no` | | 법인등록번호 (13자리 숫자, `-` 제거) |
| `b_sector` | | 주업태명 |
| `b_type` | | 주종목명 |
| `b_adr` | | 사업장주소 (v1.1 추가) |

**Response (200):**
```json
{
  "status_code": "OK",
  "request_cnt": 1,
  "valid_cnt": 1,
  "data": [
    {
      "b_no": "0000000000",
      "valid": "01",
      "valid_msg": "",
      "request_param": { ... },
      "status": { ... }
    }
  ]
}
```

| `valid` 값 | 의미 |
|------------|------|
| `01` | 일치 (일치 시 status 정보도 함께 반환) |
| `02` | 불일치 (`valid_msg`: "확인할 수 없습니다") |

#### 에러 코드

| HTTP Status | `status_code` | 설명 |
|-------------|---------------|------|
| 400 | `BAD_JSON_REQUEST` | JSON 포맷 오류 |
| 411 | `REQUEST_DATA_MALFORMED` | 필수 파라미터 누락 |
| 413 | `TOO_LARGE_REQUEST` | 100건 초과 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

#### 활용 목적

- 회원가입 시 사업자번호 유효성 검증
- 사업자 상태(폐업/휴업) 사전 확인
