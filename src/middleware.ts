import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const restrictedRoutes = ['/language', '/mongodb-setup', '/mongodb-setup/database-setup', '/admin'];

export async function middleware(request: NextRequest) {
  const dbConnection = process.env.dbConnection === 'true';
  const token = request.cookies.get('token')?.value;
  const currentPath = request.nextUrl.pathname;

  // Custom logic for the home route ('/')
//   if (currentPath === '/') {
//     if (dbConnection) {
//       const themeUrl = new URL('/themes/my-demo-theme/layouts', request.url);
//       try {
//         return NextResponse.rewrite(themeUrl);
//       } catch {
//         return NextResponse.redirect(new URL('/', request.url));
//       }
//     } else {
//       return NextResponse.redirect(new URL('/language', request.url));
//     }
// }

if (currentPath === '/') {
  if (!dbConnection) {
    return NextResponse.redirect(new URL('/language', request.url));
  }
  return NextResponse.next(); // Let the page component handle the logic
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
    '/login'
  ],
};