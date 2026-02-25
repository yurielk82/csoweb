/**
 * NextRequest 생성 헬퍼
 * API Route 통합 테스트에서 사용
 */
export function createMockNextRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = 'GET', body, headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new Request(`http://localhost:3000${url}`, init);
}
