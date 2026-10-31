// POST /api/media/access  { bookId, mediaNumber }  (all roles)
// Returns the file's URL. When a member opens it, the access is written to
// the Digital_Media_Access audit log (staff previews are not logged).
import { query } from '@/lib/db';
import { fail, handleError, ok, readBody, toId } from '@/lib/api';
import { requireRole } from '@/lib/auth';

function deviceFrom(userAgent = '') {
  if (/iPad|Tablet/i.test(userAgent)) return 'Tablet';
  if (/Mobi|Android|iPhone/i.test(userAgent)) return 'Mobile';
  return 'Laptop';
}

export async function POST(request) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const body = await readBody(request);
  const bookId = toId(body.bookId);
  const mediaNumber = toId(body.mediaNumber);
  if (!bookId || !mediaNumber) return fail('Book and media number are required');

  try {
    const [media] = await query(
      'SELECT FileFormat, AccessURL FROM Digital_Media WHERE BookID = ? AND MediaNumber = ?',
      [bookId, mediaNumber]
    );
    if (!media) return fail('File not found', 404);

    let logged = false;
    if (user.memberId) {
      // INSERT IGNORE: a double click in the same second does not fail on the PK
      const result = await query(
        `INSERT IGNORE INTO Digital_Media_Access (MemberID, BookID, MediaNumber, AccessTimestamp, DeviceType)
         VALUES (?, ?, ?, NOW(), ?)`,
        [user.memberId, bookId, mediaNumber, deviceFrom(request.headers.get('user-agent') || '')]
      );
      logged = result.affectedRows === 1;
    }

    return ok({ url: media.AccessURL, format: media.FileFormat, logged });
  } catch (err) {
    return handleError(err);
  }
}
