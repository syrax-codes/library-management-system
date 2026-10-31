'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader, Table, Badge, Card } from '@/components/ui';
import { api } from '@/lib/client';
import { useToast } from '@/components/Toast';

export default function CatalogPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [available, setAvailable] = useState(false);
  const [data, setData] = useState({ books: null, genres: [] });

  async function load(search = q) {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (genre) params.set('genre', genre);
    if (available) params.set('available', '1');
    try {
      setData(await api(`/api/books?${params}`));
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // Re-run when a filter changes; the search box runs on submit
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, available]);

  const columns = [
    {
      key: 'Title',
      label: 'Title',
      render: (b) => (
        <Link href={`/catalog/${b.BookID}`} className="font-medium text-teal-800 hover:underline">
          {b.Title}
        </Link>
      ),
    },
    { key: 'Genres', label: 'Genres' },
    { key: 'Publisher', label: 'Publisher', render: (b) => `${b.Publisher || '—'}${b.PublicationYear ? `, ${b.PublicationYear}` : ''}` },
    {
      key: 'AvailableCopies',
      label: 'Copies',
      render: (b) => (
        <Badge tone={b.AvailableCopies > 0 ? 'green' : 'red'}>
          {b.AvailableCopies} of {b.TotalCopies} available
        </Badge>
      ),
    },
    { key: 'Formats', label: 'Digital' },
    { key: 'AvgRating', label: 'Rating', render: (b) => (b.AvgRating ? `★ ${b.AvgRating} (${b.ReviewCount})` : '—') },
  ];
  if (q) columns.push({ key: 'Relevance', label: 'Relevance', render: (b) => Number(b.Relevance).toFixed(2) });

  return (
    <>
      <PageHeader title="Catalog" subtitle="Full-text search over titles and descriptions" />

      <Card className="mb-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <label className="min-w-60 flex-1">
            <span className="label">Search</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. database design" />
          </label>
          <label>
            <span className="label">Genre</span>
            <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">All genres</option>
              {data.genres.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            Available only
          </label>
          <button className="btn btn-primary">Search</button>
          {q && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setQ('');
                load('');
              }}
            >
              Clear
            </button>
          )}
        </form>
      </Card>

      <Card>
        <Table columns={columns} rows={data.books} rowKey={(b) => b.BookID} empty="No books match your search" />
      </Card>
    </>
  );
}
