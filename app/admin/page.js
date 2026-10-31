'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, Field, PageHeader, Table } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { api, formatDateTime } from '@/lib/client';

const EMPTY_BOOK = { title: '', isbn: '', publisher: '', year: '', genres: '', description: '', copies: 1, floor: '', aisle: '', shelf: '' };

export default function AdminPage() {
  const toast = useToast();
  const [staff, setStaff] = useState(null);
  const [idle, setIdle] = useState(null);
  const [newStaff, setNewStaff] = useState({ email: '', password: '' });
  const [book, setBook] = useState(EMPTY_BOOK);

  const load = useCallback(() => {
    api('/api/admin/staff').then(setStaff).catch((err) => toast(err.message, 'error'));
    api('/api/stats').then((s) => setIdle(s.idleBooks)).catch(() => {});
  }, [toast]);

  useEffect(load, [load]);

  async function addStaff(e) {
    e.preventDefault();
    try {
      await api('/api/admin/staff', { method: 'POST', body: newStaff });
      toast(`Librarian account created for ${newStaff.email}`);
      setNewStaff({ email: '', password: '' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function toggle(account) {
    try {
      await api(`/api/admin/staff/${account.UserID}`, { method: 'PUT', body: { isActive: !account.IsActive } });
      toast(account.IsActive ? 'Account deactivated' : 'Account reactivated');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function addBook(e) {
    e.preventDefault();
    try {
      const { bookId } = await api('/api/books', { method: 'POST', body: book });
      toast(`Book added (ID ${bookId})`);
      setBook(EMPTY_BOOK);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const setB = (key) => (e) => setBook({ ...book, [key]: e.target.value });

  return (
    <>
      <PageHeader title="Admin" subtitle="Staff accounts, new books and the idle-books report" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Staff accounts">
          <Table
            rows={staff}
            rowKey={(a) => a.UserID}
            columns={[
              { key: 'Email', label: 'Email' },
              { key: 'Role', label: 'Role' },
              { key: 'LastLoginAt', label: 'Last login', render: (a) => formatDateTime(a.LastLoginAt) },
              {
                key: 'IsActive',
                label: 'Status',
                render: (a) =>
                  a.Role === 'Admin' ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <button className={`btn btn-sm ${a.IsActive ? 'btn-danger' : ''}`} onClick={() => toggle(a)}>
                      {a.IsActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  ),
              },
            ]}
          />
          <form onSubmit={addStaff} className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4">
            <label className="min-w-48 flex-1">
              <span className="label">New librarian email</span>
              <input className="input" type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} required />
            </label>
            <label className="w-36">
              <span className="label">Password</span>
              <input className="input" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} required minLength={6} />
            </label>
            <button className="btn btn-primary">Add</button>
          </form>
        </Card>

        <Card title="Idle books (no loans in 90 days)">
          <Table
            rows={idle}
            rowKey={(b) => b.BookID}
            empty="Every book has been borrowed recently"
            columns={[
              { key: 'Title', label: 'Book', render: (b) => <Link href={`/catalog/${b.BookID}`} className="text-teal-800 hover:underline">{b.Title}</Link> },
              { key: 'Genres', label: 'Genres' },
              { key: 'TotalCopies', label: 'Copies' },
            ]}
          />
        </Card>

        <Card title="Add a book" className="lg:col-span-2">
          <form onSubmit={addBook} className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Field label="Title">
                <input className="input" value={book.title} onChange={setB('title')} required />
              </Field>
            </div>
            <Field label="ISBN-13">
              <input className="input" value={book.isbn} onChange={setB('isbn')} placeholder="978-0000000000" required />
            </Field>
            <Field label="Genres (comma-separated)">
              <input className="input" value={book.genres} onChange={setB('genres')} />
            </Field>
            <Field label="Publisher">
              <input className="input" value={book.publisher} onChange={setB('publisher')} />
            </Field>
            <Field label="Year">
              <input className="input" type="number" value={book.year} onChange={setB('year')} />
            </Field>
            <Field label="Copies">
              <input className="input" type="number" min={1} max={20} value={book.copies} onChange={setB('copies')} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Floor">
                <input className="input" value={book.floor} onChange={setB('floor')} />
              </Field>
              <Field label="Aisle">
                <input className="input" value={book.aisle} onChange={setB('aisle')} />
              </Field>
              <Field label="Shelf">
                <input className="input" value={book.shelf} onChange={setB('shelf')} />
              </Field>
            </div>
            <div className="md:col-span-4">
              <Field label="Description (searchable)">
                <textarea className="input" rows={3} value={book.description} onChange={setB('description')} />
              </Field>
            </div>
            <div className="md:col-span-4">
              <button className="btn btn-primary">Add book</button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
