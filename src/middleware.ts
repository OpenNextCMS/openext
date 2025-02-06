import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const restrictedRoutes = ['/language', '/mongodb-setup', '/mongodb-setup/database-setup', '/admin'];

export async function middleware(request: NextRequest) {
  const dbConnection = process.env.dbConnection === 'true';
  const token = request.cookies.get('token')?.value;
  const currentPath = request.nextUrl.pathname;

  if (!dbConnection && restrictedRoutes.includes(currentPath)) {
    return NextResponse.next();
  }

  if (dbConnection && restrictedRoutes.includes(currentPath)) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('message', 'Super admin is created\n path is restricted', { path: '/' });
    return response;
  }

  if (token) {
    if (currentPath === '/login') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/language',
    '/mongodb-setup',
    '/mongodb-setup/database-setup',
    '/admin',
    '/dashboard/:path*',
    '/login'
  ],
};
