// GET  /api/members   (Librarian, Admin)  member list with activity summary (multi-CTE)
// POST /api/members   (Librarian, Admin)  register a member with phones and a login account
import bcrypt from 'bcryptjs';
import { query, transaction } from '@/lib/db';
import { fail, handleError, ok, readBody } from '@/lib/api';
import { STAFF, requireRole } from '@/lib/auth';
import { MEMBER_SUMMARY } from '@/lib/reports';

export async function GET(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;
  try {
    return ok(await query(MEMBER_SUMMARY));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request) {
  const { error } = await requireRole(request, STAFF);
  if (error) return error;

  const body = await readBody(request);
  const fname = (body.fname || '').trim();
  const lname = (body.lname || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const phones = (Array.isArray(body.phones) ? body.phones : String(body.phones || '').split(','))
    .map((p) => p.trim())
    .filter(Boolean);

  if (!fname || !lname || !email || !body.dob) return fail('Name, email and date of birth are required');
  if (password.length < 6) return fail('Password must be at least 6 characters');

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    // Member, phones and account are created together or not at all.
    // trg_ValidateMember and the CHECK constraints reject bad data here.
    const memberId = await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO Members (Fname, Lname, EmailAddress, DOB,
                              GuardianContactName, GuardianRelationship, GuardianContactNumber)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          fname,
          lname,
          email,
          body.dob,
          body.guardianName || null,
          body.guardianRelationship || null,
          body.guardianNumber || null,
        ]
      );
      const id = result.insertId;
      for (const phone of phones) {
        await conn.execute('INSERT INTO Member_Phone_Numbers (MemberID, PhoneNumber) VALUES (?, ?)', [id, phone]);
      }
      await conn.execute(
        "INSERT INTO User_Accounts (Email, PasswordHash, Role, MemberID) VALUES (?, ?, 'Member', ?)",
        [email, passwordHash, id]
      );
      return id;
    });

    return ok({ memberId }, 201);
  } catch (err) {
    return handleError(err);
  }
}
