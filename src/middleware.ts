import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const restrictedRoutes = ['/language', '/mongodb-setup', '/mongodb-setup/database-setup', '/admin'];

export async function middleware(request: NextRequest) {
  const dbConnection = process.env.dbConnection === 'true';
  const token = request.cookies.get('token')?.value;
  const currentPath = request.nextUrl.pathname;

  if (currentPath === '/') {
    if (!dbConnection) {
      return NextResponse.redirect(new URL('/language', request.url));
    }
    return NextResponse.next();
  }

  // If dbConnection is true and the route is restricted, redirect to '/login'
  if (dbConnection && restrictedRoutes.includes(currentPath)) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('message', 'Super admin is created\n path is restricted', { path: '/' });
    return response;
  }

  // If a token exists, ensure that '/login' redirects to the dashboard
  if (token) {
    if (currentPath === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // If no token and trying to access restricted routes, redirect to '/login'
  // if (restrictedRoutes.includes(currentPath)) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/language',
    '/mongodb-setup',
    '/mongodb-setup/database-setup',
    '/admin',
    '/dashboard/:path*',
    '/login',
  ],
};
