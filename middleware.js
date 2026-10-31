// Runs before every page request.
// Logged-out users go to /login; each role only sees its own pages.
// API routes are not handled here: each one checks requireRole() itself and
// answers 401/403 as JSON.
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifyToken } from './lib/auth';

// Which roles may open each page (the first matching prefix wins)
const PAGE_ROLES = [
  ['/admin', ['Admin']],
  ['/loans', ['Admin', 'Librarian']],
  ['/members', ['Admin', 'Librarian']],
  ['/gate', ['Admin', 'Librarian']],
  ['/me', ['Member']],
  ['/catalog', ['Admin', 'Librarian', 'Member']],
  ['/rooms', ['Admin', 'Librarian', 'Member']],
];

function homeFor(role) {
  return role === 'Member' ? '/me' : '/';
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const user = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/login') {
    return user ? NextResponse.redirect(new URL(homeFor(user.role), request.url)) : NextResponse.next();
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // The dashboard at / is for staff; members land on /me
  if (pathname === '/') {
    return user.role === 'Member' ? NextResponse.redirect(new URL('/me', request.url)) : NextResponse.next();
  }

  const rule = PAGE_ROLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (rule && !rule[1].includes(user.role)) {
    return NextResponse.redirect(new URL(homeFor(user.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Every page except API routes, Next.js internals and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
