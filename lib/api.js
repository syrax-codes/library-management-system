// Response helpers shared by every API route.
// Success: { data }   Failure: { error: "message" } with a 400/401/403/404/409/500 status.
import { NextResponse } from 'next/server';

export function ok(data, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Readable messages for our named CHECK constraints
const CHECK_MESSAGES = {
  chk_member_email: 'Invalid email address',
  chk_account_email: 'Invalid email address',
  chk_guardian_phone: 'Guardian number must be exactly 10 digits',
  chk_phone_format: 'Phone numbers must be exactly 10 digits',
  chk_isbn_format: 'ISBN must be a 13-digit ISBN starting with 978 or 979',
  chk_pub_year: 'Publication year must be between 1450 and 2100',
  chk_loan_due: 'Due date must be after the issue date',
  chk_loan_return: 'Return date cannot be before the issue date',
  chk_star_rating: 'Rating must be between 1 and 5 stars',
  chk_reservation_time: 'End time must be after start time',
  chk_gate_exit: 'Exit time must be after entry time',
  chk_room_capacity: 'Capacity must be greater than 0',
  chk_fine_amount: 'Fine amount must be greater than 0',
  chk_copy_status: 'Invalid copy status',
  chk_account_role: 'Invalid role',
};

// Turn a MySQL error into a response the UI can show.
export function handleError(err) {
  // SIGNAL SQLSTATE '45000' from our procedures and triggers: show the message as-is
  if (err.sqlState === '45000') return fail(err.message, 400);

  switch (err.errno) {
    case 3819: {
      // CHECK constraint violated
      const name = err.message.match(/'([^']+)'/)?.[1];
      return fail(CHECK_MESSAGES[name] || `Invalid value (${name})`, 400);
    }
    case 1062: // duplicate key (UNIQUE / PRIMARY KEY)
      return fail(duplicateMessage(err.message), 409);
    case 1451:
    case 1217: // FK refuses delete of a parent row
      return fail('Cannot delete: this record has history linked to it', 409);
    case 1452: // FK refuses a child row with no parent
      return fail('A referenced record does not exist', 400);
    case 1213: // deadlock: InnoDB rolled this session back
    case 1205: // lock wait timeout
      return fail('The record is busy, please retry', 409);
    default:
      console.error(err);
      return fail('Something went wrong on the server', 500);
  }
}

function duplicateMessage(message) {
  if (message.includes('uq_review_member_book')) return 'You have already reviewed this book';
  if (message.includes('email')) return 'That email address is already registered';
  if (message.includes('uq_books_isbn')) return 'A book with this ISBN already exists';
  if (message.includes('PRIMARY')) return 'This record already exists';
  return 'Duplicate value';
}

// Read a JSON body, returning {} if it is missing or malformed
export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// Parse a positive integer id from the URL, or return null
export function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
