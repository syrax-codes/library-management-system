// GET  /api/admin/staff  (Admin)  list staff accounts
// POST /api/admin/staff  (Admin)  { email, password }  create a Librarian account
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody } from '@/lib/api';
import { ADMIN, requireRole } from '@/lib/auth';

export async function GET(request) {
  const { error } = await requireRole(request, ADMIN);
  if (error) return error;
  try {
    const rows = await query(
      `SELECT UserID, Email, Role, IsActive, CreatedAt, LastLoginAt
       FROM User_Accounts
       WHERE Role IN ('Admin', 'Librarian')
       ORDER BY Role, Email`
    );
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request) {
  const { error } = await requireRole(request, ADMIN);
  if (error) return error;

  const body = await readBody(request);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email) return fail('Email is required');
  if (password.length < 6) return fail('Password must be at least 6 characters');

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO User_Accounts (Email, PasswordHash, Role) VALUES (?, ?, 'Librarian')",
      [email, hash]
    );
    return ok({ userId: result.insertId }, 201);
  } catch (err) {
    return handleError(err);
  }
}
