'use client';

// Cards that show the Neo4j recommendation results.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, Table } from '@/components/ui';
import { api } from '@/lib/client';

function Offline({ message }) {
  return <p className="muted">{message || 'Recommendations are offline.'}</p>;
}

function BookLink({ book }) {
  return (
    <Link href={`/catalog/${book.BookID}`} className="text-teal-800 hover:underline">
      {book.Title}
    </Link>
  );
}

// "Readers of this book also borrowed" (book detail page)
export function AlsoBorrowed({ bookId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api(`/api/books/${bookId}/also-borrowed`).then(setData).catch(() => setData({ available: false }));
  }, [bookId]);

  return (
    <Card title="Readers of this book also borrowed">
      {!data ? (
        <p className="muted">Loading…</p>
      ) : !data.available ? (
        <Offline message={data.message} />
      ) : data.items.length === 0 ? (
        <p className="muted">No shared readers yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {data.items.map((b) => (
            <li key={b.BookID} className="flex items-center justify-between gap-2">
              <BookLink book={b} />
              <span className="text-xs text-stone-500">
                {b.SharedReaders} shared reader{b.SharedReaders === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// "For you", similar readers and reading profile for one member
export function MemberRecommendations({ memberId, compact = false }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api(`/api/recommendations/${memberId}`).then(setData).catch(() => setData({ available: false }));
  }, [memberId]);

  if (!data) return <p className="muted">Loading recommendations…</p>;
  if (!data.available) return <Card title="Recommendations"><Offline message={data.message} /></Card>;

  const grid = compact ? 'space-y-4' : 'grid gap-4 md:grid-cols-2';

  return (
    <div className={grid}>
      <Card title="For you">
        {data.forYou.length === 0 ? (
          <p className="muted">Borrow a few books to get recommendations.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.forYou.map((b) => (
              <li key={b.BookID} className="flex items-center justify-between gap-2">
                <span>
                  <BookLink book={b} />
                  <span className="block text-xs text-stone-500">{b.ViaGenres.join(', ')}</span>
                </span>
                <Badge tone={b.AvailableCopies > 0 ? 'green' : 'gray'}>
                  {b.AvailableCopies > 0 ? 'Available' : 'All out'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Similar readers">
        {data.similarReaders.length === 0 ? (
          <p className="muted">No overlap with other readers yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.similarReaders.map((r) => (
              <li key={r.memberId}>
                <span className="font-medium">{r.name}</span>
                <span className="text-stone-500"> · {r.sharedBooks} book{r.sharedBooks === 1 ? '' : 's'} in common</span>
                <span className="block text-xs text-stone-500">{r.examples.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Reading profile" className={compact ? '' : 'md:col-span-2'}>
        <Table
          rows={data.readingProfile}
          rowKey={(r) => r.genre}
          empty="No borrowing history yet."
          columns={[
            { key: 'genre', label: 'Genre' },
            { key: 'booksBorrowed', label: 'Books borrowed' },
            { key: 'avgRating', label: 'Your avg rating', render: (r) => (r.avgRating != null ? `★ ${r.avgRating}` : '—') },
            ...(compact ? [] : [{ key: 'titles', label: 'Titles', render: (r) => r.titles.join(', ') }]),
          ]}
        />
      </Card>
    </div>
  );
}
