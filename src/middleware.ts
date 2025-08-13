import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isProtectedAPI = request.nextUrl.pathname.startsWith('/api') && 
                         !request.nextUrl.pathname.startsWith('/api/auth') &&
                         !request.nextUrl.pathname.startsWith('/api/health');

  // If user is not logged in and trying to access protected routes
  if (!token && (isDashboard || isProtectedAPI)) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access auth pages
  if (token && isAuthPage && !request.nextUrl.pathname.includes('verify')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/api/:path*',
  ],
};
