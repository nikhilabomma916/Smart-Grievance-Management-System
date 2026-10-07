import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/server/auth';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't need auth
  const publicPaths = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register'];
  if (publicPaths.some(p => pathname === p || pathname.startsWith('/_next') || pathname.startsWith('/favicon'))) {
    return NextResponse.next();
  }
  
  // Check auth token
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    // Redirect to login for page requests, 401 for API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  const session = await verifyToken(token);
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Role-based route protection
  if (pathname.startsWith('/citizen') && session.role !== 'citizen') {
    return NextResponse.redirect(new URL(
      session.role === 'officer' ? '/officer/dashboard' : '/admin/dashboard',
      request.url,
    ));
  }
  if (pathname.startsWith('/officer') && session.role !== 'officer') {
    return NextResponse.redirect(new URL(
      session.role === 'admin' || session.role === 'department_admin'
        ? '/admin/dashboard'
        : '/citizen/dashboard',
      request.url,
    ));
  }
  if (pathname.startsWith('/admin') && session.role !== 'admin' && session.role !== 'department_admin') {
    return NextResponse.redirect(new URL(
      session.role === 'officer' ? '/officer/dashboard' : '/citizen/dashboard',
      request.url,
    ));
  }
  
  // Add user info to headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-user-id', session.userId);
  response.headers.set('x-user-role', session.role);
  response.headers.set('x-user-name', session.name);
  response.headers.set('x-user-email', session.email);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
