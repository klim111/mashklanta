import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isAdvisorDashboard = request.nextUrl.pathname.startsWith('/advisor-dashboard');
  const isProtectedAPI = request.nextUrl.pathname.startsWith('/api') && 
                         !request.nextUrl.pathname.startsWith('/api/auth') &&
                         !request.nextUrl.pathname.startsWith('/api/health') &&
                         !request.nextUrl.pathname.startsWith('/api/analyze-image');

  // If user is not logged in and trying to access protected routes
  if (!token && (isDashboard || isAdvisorDashboard || isProtectedAPI)) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access auth pages
  if (token && isAuthPage && !request.nextUrl.pathname.includes('verify')) {
    // Redirect based on user role
    const userRole = (token as any)?.role;
    if (userRole === 'ADVISOR') {
      return NextResponse.redirect(new URL('/advisor-dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Role-based access control
  if (token) {
    const userRole = (token as any)?.role;
    
    // If advisor tries to access client dashboard
    if (userRole === 'ADVISOR' && isDashboard) {
      return NextResponse.redirect(new URL('/advisor-dashboard', request.url));
    }
    
    // If client tries to access advisor dashboard
    if (userRole === 'CLIENT' && isAdvisorDashboard) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/advisor-dashboard/:path*',
    '/auth/:path*',
    '/api/:path*',
  ],
};
