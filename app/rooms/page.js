'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, Field, PageHeader } from '@/components/ui';
import { useUser } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { api, formatDate, today } from '@/lib/client';

export default function RoomsPage() {
  const user = useUser();
  const toast = useToast();
  const isStaff = user?.role !== 'Member';
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ roomId: '', start: '10:00', end: '12:00', memberId: '' });

  const load = useCallback(() => {
    api(`/api/rooms?date=${date}`)
      .then(setData)
      .catch((err) => toast(err.message, 'error'));
  }, [date, toast]);

  useEffect(load, [load]);

  useEffect(() => {
    if (isStaff) api('/api/members').then(setMembers).catch(() => {});
  }, [isStaff]);

  async function book(e) {
    e.preventDefault();
    try {
      await api('/api/rooms/reserve', { method: 'POST', body: { ...form, date } });
      toast('Room booked');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function cancel(id) {
    try {
      await api(`/api/rooms/reservations/${id}/cancel`, { method: 'PUT' });
      toast('Booking cancelled');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const canCancel = (b) => b.BookingStatus === 'Confirmed' && (isStaff || b.MemberID === user?.memberId);

  return (
    <>
      <PageHeader title="Study rooms" subtitle="Open 08:00–20:00 · overlapping bookings are rejected by sp_ReserveRoom" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Book a room" className="h-fit">
          <form onSubmit={book} className="space-y-3">
            <Field label="Date">
              <input className="input" type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            {isStaff && (
              <Field label="For member">
                <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
                  <option value="">Choose…</option>
                  {members.map((m) => (
                    <option key={m.MemberID} value={m.MemberID}>
                      {m.Name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Room">
              <select className="input" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} required>
                <option value="">Choose…</option>
                {data?.rooms.map((r) => (
                  <option key={r.RoomID} value={r.RoomID}>
                    {r.RoomName} (seats {r.Capacity})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <input className="input" type="time" step="1800" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
              </Field>
              <Field label="To">
                <input className="input" type="time" step="1800" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
              </Field>
            </div>
            <button className="btn btn-primary w-full">Book</button>
          </form>
        </Card>

        <Card title={`Bookings for ${formatDate(date)}`} className="lg:col-span-2">
          {!data ? (
            <p className="muted">Loading…</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {data.rooms.map((room) => {
                const slots = data.bookings.filter((b) => b.RoomID === room.RoomID);
                return (
                  <div key={room.RoomID} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-48">
                      <div className="text-sm font-medium">{room.RoomName}</div>
                      <div className="text-xs text-stone-500">
                        Floor {room.Floor}, {room.Wing} wing · {room.Capacity} seats
                      </div>
                      <div className="text-xs text-stone-500">{room.Amenities}</div>
                    </div>
                    <div className="flex flex-1 flex-wrap justify-end gap-2">
                      {slots.length === 0 ? (
                        <Badge tone="green">Free all day</Badge>
                      ) : (
                        slots.map((b) => (
                          <span key={b.ReservationID} className="flex items-center gap-1 rounded border border-stone-200 px-2 py-1 text-xs">
                            {b.StartTime.slice(0, 5)}–{b.EndTime.slice(0, 5)}
                            <span className="text-stone-500">· {b.MemberName}</span>
                            {canCancel(b) && (
                              <button className="ml-1 text-red-700 hover:underline" onClick={() => cancel(b.ReservationID)}>
                                cancel
                              </button>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
