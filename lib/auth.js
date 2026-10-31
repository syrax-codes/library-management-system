// Login tokens and role checks.
// After login we store a signed JWT (userId, role, memberId, name) in an
// httpOnly cookie, so page scripts cannot read it. Every API route calls
// requireRole(); a member's own ID always comes from this token, never from
// the request body.
import { SignJWT, jwtVerify } from 'jose';
import { fail } from './api';

export const SESSION_COOKIE = 'library_session';
const SESSION_HOURS = 8;

export const ALL = ['Admin', 'Librarian', 'Member'];
export const STAFF = ['Admin', 'Librarian'];
export const ADMIN = ['Admin'];

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in .env.local');
  return new TextEncoder().encode(secret);
}

export async function createToken(user) {
  return new SignJWT({
    userId: user.userId,
    role: user.role,
    memberId: user.memberId ?? null,
    name: user.name,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

// Returns the token's payload, or null if it is missing, tampered with or expired
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

export async function getUser(request) {
  return verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
}

// Usage in a route:
//   const { user, error } = await requireRole(request, STAFF);
//   if (error) return error;
export async function requireRole(request, roles = ALL) {
  const user = await getUser(request);
  if (!user) return { error: fail('Please log in', 401) };
  if (!roles.includes(user.role)) {
    return { error: fail('You do not have permission to do this', 403) };
  }
  return { user };
}

export function isStaff(user) {
  return STAFF.includes(user.role);
}

export function setSessionCookie(response, token) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}
