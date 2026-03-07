import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME } from '@/constants/auth';
import { MS_PER_SECOND } from '@/constants/defaults';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/change-password', '/complete-profile'];

// In-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * MS_PER_SECOND; // 1분
const RATE_LIMIT_MAX_REQUESTS: Record<string, number> = {
  '/api/auth/login': 10,
  '/api/auth/register': 5,
  '/api/auth/forgot-password': 5,
  '/api/auth/reset-password': 5,
  '/api/upload': 10,
};

function getRateLimitKey(ip: string, path: string): string {
  return `${ip}:${path}`;
}

function checkRateLimit(ip: string, path: string): { allowed: boolean; remaining: number } {
  // rate limit 대상 경로인지 확인
  const matchedPath = Object.keys(RATE_LIMIT_MAX_REQUESTS).find(p => path.startsWith(p));
  if (!matchedPath) return { allowed: true, remaining: -1 };

  const maxRequests = RATE_LIMIT_MAX_REQUESTS[matchedPath];
  const key = getRateLimitKey(ip, matchedPath);
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining };
}

// 오래된 rate limit 항목 정리 (5분마다)
let lastCleanup = Date.now();
function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * MS_PER_SECOND) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://t1.daumcdn.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com",
      "frame-src https://t1.daumcdn.net https://postcode.map.daum.net",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting (API 라우트 대상)
  if (pathname.startsWith('/api/')) {
    cleanupRateLimitMap();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const { allowed, remaining } = checkRateLimit(ip, pathname);

    if (!allowed) {
      const response = NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', '60');
      return setSecurityHeaders(response);
    }

    const response = NextResponse.next();
    if (remaining >= 0) {
      response.headers.set('X-RateLimit-Remaining', String(remaining));
    }
    return setSecurityHeaders(response);
  }

  // Check if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return setSecurityHeaders(NextResponse.next());
  }

  // Check for session cookie (JWT token)
  const sessionCookie = request.cookies.get(COOKIE_NAME);

  // Redirect to login if no session
  if (!sessionCookie || !sessionCookie.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return setSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // JWT 토큰의 유효성은 서버 사이드에서 검증
  // 미들웨어에서는 쿠키 존재 여부만 체크
  // must_change_password 체크는 각 페이지 레이아웃에서 처리

  return setSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
