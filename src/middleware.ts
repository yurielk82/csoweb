import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password'];

// Route for password change (accessible when must_change_password is true)
const passwordChangeRoute = '/change-password';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Check for session cookie
  const sessionCookie = request.cookies.get('cso_session');
  
  // Redirect to login if no session
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Parse session to check must_change_password
  try {
    const session = JSON.parse(sessionCookie.value);
    
    // If user must change password and not already on change-password page
    if (session.must_change_password && !pathname.startsWith(passwordChangeRoute)) {
      const changePasswordUrl = new URL(passwordChangeRoute, request.url);
      return NextResponse.redirect(changePasswordUrl);
    }
    
    // If user is on change-password page but doesn't need to change password
    if (!session.must_change_password && pathname.startsWith(passwordChangeRoute)) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  } catch {
    // Invalid session cookie, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // For admin routes, we'll do a more detailed check in the layout
  // The middleware just ensures there's a session cookie
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
