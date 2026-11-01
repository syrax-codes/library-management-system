'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, PageHeader, Stat, Table } from '@/components/ui';
import { MemberRecommendations } from '@/components/Recommendations';
import { useUser } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { api, formatDate, rupees } from '@/lib/client';

export default function MyLibraryPage() {
  const user = useUser();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null);
  const [bookings, setBookings] = useState(null);

  const load = useCallback(() => {
    if (!user?.memberId) return;
    api(`/api/members/${user.memberId}`).then(setProfile).catch((err) => toast(err.message, 'error'));
    api('/api/loans?history=1').then(setHistory).catch(() => {});
    api('/api/rooms').then((d) => setBookings(d.myBookings)).catch(() => {});
  }, [user, toast]);

  useEffect(load, [load]);

  async function cancel(id) {
    try {
      await api(`/api/rooms/reservations/${id}/cancel`, { method: 'PUT' });
      toast('Booking cancelled');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!profile) return <p className="muted">Loading…</p>;
  const pendingFines = profile.fines.filter((f) => f.FineStatus === 'Pending');

  return (
    <>
      <PageHeader title={`Hello, ${profile.member.Fname}`} subtitle="Your loans, fines, bookings and recommendations" />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Books on loan" value={`${profile.activeLoans.length} of 3`} />
        <Stat label="Unpaid fines" value={rupees(profile.member.UnpaidFines)} tone={profile.member.UnpaidFines > 100 ? 'warn' : 'default'} />
        <Stat label="Books borrowed" value={profile.totalLoans} />
        <Stat label="Upcoming bookings" value={bookings ? bookings.filter((b) => b.BookingStatus === 'Confirmed').length : '…'} />
      </div>

      {profile.member.UnpaidFines > 100 && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          You cannot borrow more books until your unpaid fines are ₹100 or less. Please pay at the front desk.
        </p>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title="On loan now">
          <Table
            rows={profile.activeLoans}
            rowKey={(l) => l.LoanID}
            empty="No books on loan"
            columns={[
              { key: 'Title', label: 'Book', render: (l) => <Link href={`/catalog/${l.BookID}`} className="text-brand-800 hover:underline">{l.Title}</Link> },
              { key: 'DueDate', label: 'Due', render: (l) => formatDate(l.DueDate) },
              { key: 'DaysOverdue', label: '', render: (l) => (l.DaysOverdue > 0 ? <Badge tone="red">{l.DaysOverdue} day{l.DaysOverdue === 1 ? '' : 's'} late</Badge> : null) },
            ]}
          />
        </Card>

        <Card title="My study room bookings" action={<Link href="/rooms" className="text-xs text-brand-800 hover:underline">Book a room</Link>}>
          <Table
            rows={bookings}
            rowKey={(b) => b.ReservationID}
            empty="No upcoming bookings"
            columns={[
              { key: 'RoomName', label: 'Room' },
              { key: 'ReservationDate', label: 'Date', render: (b) => formatDate(b.ReservationDate) },
              { key: 'time', label: 'Time', render: (b) => `${b.StartTime.slice(0, 5)}–${b.EndTime.slice(0, 5)}` },
              {
                key: 'actions',
                label: '',
                render: (b) =>
                  b.BookingStatus === 'Confirmed' ? (
                    <button className="btn btn-sm" onClick={() => cancel(b.ReservationID)}>
                      Cancel
                    </button>
                  ) : (
                    <Badge>{b.BookingStatus}</Badge>
                  ),
              },
            ]}
          />
        </Card>

        <Card title={`Fines${pendingFines.length ? ` (${pendingFines.length} pending)` : ''}`}>
          <Table
            rows={profile.fines}
            rowKey={(f) => `${f.LoanID}-${f.FineNumber}`}
            empty="No fines"
            columns={[
              { key: 'Title', label: 'Book' },
              { key: 'AssessedDate', label: 'Date', render: (f) => formatDate(f.AssessedDate) },
              { key: 'FineAmount', label: 'Amount', render: (f) => rupees(f.FineAmount) },
              {
                key: 'FineStatus',
                label: 'Status',
                render: (f) => <Badge tone={f.FineStatus === 'Pending' ? 'red' : f.FineStatus === 'Paid' ? 'green' : 'gray'}>{f.FineStatus}</Badge>,
              },
            ]}
          />
        </Card>

        <Card title="Borrowing history">
          <Table
            rows={history}
            rowKey={(l) => l.LoanID}
            empty="Nothing returned yet"
            columns={[
              { key: 'Title', label: 'Book', render: (l) => <Link href={`/catalog/${l.BookID}`} className="text-brand-800 hover:underline">{l.Title}</Link> },
              { key: 'ActualReturnDate', label: 'Returned', render: (l) => formatDate(l.ActualReturnDate) },
              { key: 'DaysLate', label: '', render: (l) => (l.DaysLate > 0 ? <Badge tone="amber">{l.DaysLate} day{l.DaysLate === 1 ? '' : 's'} late</Badge> : null) },
            ]}
          />
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold">Recommended for you</h2>
      <MemberRecommendations memberId={user.memberId} />
    </>
  );
}
