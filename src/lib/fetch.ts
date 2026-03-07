import { DEFAULT_FETCH_TIMEOUT_MS } from '@/constants/defaults';

/**
 * 타임아웃이 적용된 fetch 래퍼.
 * 지정 시간 내 응답이 없으면 AbortError를 발생시킨다.
 *
 * @param input - fetch URL 또는 Request
 * @param init  - fetch 옵션 + timeoutMs (기본 60초)
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...fetchInit } = init ?? {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...fetchInit, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
