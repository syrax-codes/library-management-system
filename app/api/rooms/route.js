// GET /api/rooms?date=YYYY-MM-DD  (all roles)
// Rooms with their amenities, the bookings for that date, and (for members)
// their own upcoming bookings.
import { query } from '@/lib/db';
import { fail, handleError, ok } from '@/lib/api';
import { isStaff, requireRole } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireRole(request);
  if (error) return error;

  const params = new URL(request.url).searchParams;
  try {
    const [{ today }] = await query('SELECT CURDATE() AS today');
    const date = params.get('date') || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Date must be YYYY-MM-DD');

    const rooms = await query(
      `SELECT r.RoomID, r.RoomName, r.Capacity, r.Floor, r.Wing,
              GROUP_CONCAT(a.Amenity ORDER BY a.Amenity SEPARATOR ', ') AS Amenities
       FROM Study_Rooms r
       LEFT JOIN Room_Amenities a ON a.RoomID = r.RoomID
       GROUP BY r.RoomID, r.RoomName, r.Capacity, r.Floor, r.Wing
       ORDER BY r.RoomName`
    );

    // Bookings for the chosen date (uses idx_reservations_room_date)
    const bookings = await query(
      `SELECT rr.ReservationID, rr.RoomID, rr.MemberID, rr.StartTime, rr.EndTime, rr.BookingStatus,
              CONCAT(m.Fname, ' ', m.Lname) AS MemberName
       FROM Room_Reservations rr
       JOIN Members m ON m.MemberID = rr.MemberID
       WHERE rr.ReservationDate = ? AND rr.BookingStatus <> 'Cancelled'
       ORDER BY rr.RoomID, rr.StartTime`,
      [date]
    );

    // Members do not see who booked other slots
    const visible = isStaff(user)
      ? bookings
      : bookings.map((b) => (b.MemberID === user.memberId ? b : { ...b, MemberID: null, MemberName: 'Booked' }));

    let myBookings = [];
    if (user.memberId) {
      myBookings = await query(
        `SELECT rr.ReservationID, s.RoomName, rr.ReservationDate, rr.StartTime, rr.EndTime, rr.BookingStatus
         FROM Room_Reservations rr
         JOIN Study_Rooms s ON s.RoomID = rr.RoomID
         WHERE rr.MemberID = ? AND rr.ReservationDate >= CURDATE()
         ORDER BY rr.ReservationDate, rr.StartTime`,
        [user.memberId]
      );
    }

    return ok({ date, rooms, bookings: visible, myBookings });
  } catch (err) {
    return handleError(err);
  }
}
