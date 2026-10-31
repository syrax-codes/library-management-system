'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { Badge, Card, PageHeader, Table } from '@/components/ui';
import { DigitalFiles, BookReviews } from '@/components/BookExtras';
import { useUser } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { api, formatDate } from '@/lib/client';

const STATUS_TONE = { Available: 'green', 'Checked Out': 'amber', Lost: 'red', 'Under Repair': 'gray' };

export default function BookPage({ params }) {
  const { id } = use(params);
  const user = useUser();
  const toast = useToast();
  const [data, setData] = useState(null);
  const isStaff = user?.role !== 'Member';
  const isAdmin = user?.role === 'Admin';

  const load = useCallback(() => {
    api(`/api/books/${id}`)
      .then(setData)
      .catch((err) => toast(err.message, 'error'));
  }, [id, toast]);

  useEffect(load, [load]);

  async function deleteCopy(copyNumber) {
    if (!confirm(`Delete copy #${copyNumber}?`)) return;
    try {
      await api(`/api/books/${id}/copies/${copyNumber}`, { method: 'DELETE' });
      toast('Copy deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!data) return <p className="muted">Loading…</p>;
  const { book, copies } = data;

  const copyColumns = [
    { key: 'CopyNumber', label: 'Copy', render: (c) => `#${c.CopyNumber}` },
    { key: 'Shelf', label: 'Location', render: (c) => `Floor ${c.Floor} · Aisle ${c.Aisle} · ${c.ShelfNumber}` },
    { key: 'AvailabilityStatus', label: 'Status', render: (c) => <Badge tone={STATUS_TONE[c.AvailabilityStatus]}>{c.AvailabilityStatus}</Badge> },
    { key: 'DueDate', label: 'Due back', render: (c) => (c.DueDate ? formatDate(c.DueDate) : '—') },
  ];
  if (isStaff) copyColumns.splice(3, 0, { key: 'HolderName', label: 'Held by' });
  if (isAdmin) {
    copyColumns.push({
      key: 'actions',
      label: '',
      render: (c) => (
        <button className="btn btn-danger btn-sm" onClick={() => deleteCopy(c.CopyNumber)}>
          Delete
        </button>
      ),
    });
  }

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/catalog" className="text-stone-500 hover:underline">
          ← Catalog
        </Link>
      </p>
      <PageHeader title={book.Title} subtitle={`${book.Publisher || ''}${book.PublicationYear ? `, ${book.PublicationYear}` : ''} · ISBN ${book.ISBN}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="About this book">
            <p className="text-sm leading-relaxed text-stone-700">{book.Description || 'No description.'}</p>
            <p className="mt-3 text-xs text-stone-500">
              {book.Genres} · {book.AvgRating ? `★ ${book.AvgRating} from ${book.ReviewCount} reviews` : 'No ratings yet'}
            </p>
          </Card>

          <Card title={`Copies (${book.AvailableCopies} of ${book.TotalCopies} available)`}>
            <Table columns={copyColumns} rows={copies} rowKey={(c) => c.CopyNumber} empty="No physical copies" />
          </Card>

          <BookReviews bookId={book.BookID} reviews={data.reviews} onChange={load} />
        </div>

        <div className="space-y-4">
          <DigitalFiles bookId={book.BookID} media={data.media} />
        </div>
      </div>
    </>
  );
}
