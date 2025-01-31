import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of restricted pages
const restrictedRoutes = ['/admin', '/db-name', '/mongodb-setup', '/language', '/mongodb-setup/database-setup'];

export function middleware(request: NextRequest) {
  const isRegistration = request.cookies.get('isRegistrationComplete')?.value;
  const token = request.cookies.get('token')?.value;
  const currentPath = request.nextUrl.pathname;

  // If isRegistration = true, redirect to login page
  if (isRegistration === 'true' && restrictedRoutes.includes(currentPath)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If token exists, allow access to the current page
  if (token) {
    // Prevent access to login page if token is present
    if (currentPath === '/login') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  // Redirect unauthorized users without a token to login
  if (restrictedRoutes.includes(currentPath) || currentPath.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Specify routes where the middleware should apply
export const config = {
  matcher: [
    '/admin',
    '/db-name',
    '/mongodb-setup',
    '/language',
    '/mongodb-setup/database-setup',
    '/dashboard/:path*',
    '/login'
  ],
};
