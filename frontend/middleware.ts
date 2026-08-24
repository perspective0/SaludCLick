import { NextRequest, NextResponse } from 'next/server';

const NO_INDEX_ROUTES = [
  '/admin',
  '/doctor',
  '/patient',
  '/secretary',
  '/appointments',
  '/dashboard',
  '/medical-records',
  '/notifications',
  '/profile',
  '/prescriptions',
  '/teleconsulta',
  '/documents/verify',
  '/login',
  '/register',
  '/forgot-password',
  '/offline',
  '/es',
  '/en',
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  
  const shouldNoIndex = NO_INDEX_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  ) || pathname.startsWith('/booking/');

  if (shouldNoIndex) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|assets/).*)'],
};
