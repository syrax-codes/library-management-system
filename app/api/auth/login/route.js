// POST /api/auth/login  { email, password }  (public)
// Checks the bcrypt hash in User_Accounts and sets the session cookie.
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody } from '@/lib/api';
import { createToken, setSessionCookie } from '@/lib/auth';

export async function POST(request) {
  const { email, password } = await readBody(request);
  if (!email || !password) return fail('Email and password are required', 400);

  try {
    const rows = await query(
      `SELECT a.UserID, a.Email, a.PasswordHash, a.Role, a.MemberID, a.IsActive,
              CONCAT(m.Fname, ' ', m.Lname) AS MemberName
       FROM User_Accounts a
       LEFT JOIN Members m ON m.MemberID = a.MemberID
       WHERE a.Email = ?`,
      [String(email).trim().toLowerCase()]
    );
    const account = rows[0];

    // Same message for "no such email" and "wrong password", so the form
    // does not reveal which emails are registered
    if (!account || !(await bcrypt.compare(String(password), account.PasswordHash))) {
      return fail('Incorrect email or password', 401);
    }
    if (!account.IsActive) return fail('This account has been deactivated', 403);

    await query('UPDATE User_Accounts SET LastLoginAt = NOW() WHERE UserID = ?', [account.UserID]);

    const user = {
      userId: account.UserID,
      role: account.Role,
      memberId: account.MemberID,
      email: account.Email,
      name: account.MemberName || account.Email.split('@')[0],
    };
    const response = ok(user);
    setSessionCookie(response, await createToken(user));
    return response;
  } catch (err) {
    return handleError(err);
  }
}
