'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, PageHeader, Stat, Table } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { api, formatDate, rupees } from '@/lib/client';

export default function DashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/api/stats')
      .then(setStats)
      .catch((err) => toast(err.message, 'error'));
  }, [toast]);

  if (!stats) return <p className="muted">Loading…</p>;
  const { counts } = stats;

  // Group the RANK() rows by genre for display
  const byGenre = stats.topBooks.reduce((acc, row) => {
    (acc[row.Genre] ||= []).push(row);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Library at a glance" />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Members" value={counts.Members} />
        <Stat label="Books" value={counts.Books} />
        <Stat label="Active loans" value={counts.ActiveLoans} />
        <Stat label="Overdue" value={counts.OverdueLoans} tone={counts.OverdueLoans ? 'warn' : 'default'} />
        <Stat label="Pending fines" value={rupees(counts.PendingFines)} />
        <Stat label="In library now" value={counts.InsideNow} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Overdue loans" action={<Link href="/loans" className="text-xs text-brand-800 hover:underline">Go to loans</Link>}>
          <Table
            rows={stats.overdue}
            rowKey={(l) => l.LoanID}
            empty="Nothing overdue"
            columns={[
              { key: 'MemberName', label: 'Member' },
              { key: 'Title', label: 'Book' },
              { key: 'DueDate', label: 'Due', render: (l) => formatDate(l.DueDate) },
              { key: 'DaysOverdue', label: 'Late', render: (l) => <Badge tone="red">{l.DaysOverdue} day{l.DaysOverdue === 1 ? '' : 's'}</Badge> },
            ]}
          />
        </Card>

        <Card title="Members with dues above ₹20">
          <Table
            rows={stats.dues}
            rowKey={(d) => d.MemberID}
            empty="No outstanding dues"
            columns={[
              { key: 'Name', label: 'Member' },
              { key: 'PendingFines', label: 'Fines' },
              { key: 'AmountDue', label: 'Amount', render: (d) => rupees(d.AmountDue) },
            ]}
          />
        </Card>

        <Card title="Top books per genre (RANK)">
          <div className="grid max-h-96 gap-4 overflow-y-auto sm:grid-cols-2">
            {Object.entries(byGenre).map(([genre, rows]) => (
              <div key={genre}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{genre}</h3>
                <ol className="space-y-0.5 text-sm">
                  {rows.map((r) => (
                    <li key={r.BookID}>
                      <span className="text-stone-400">{r.GenreRank}.</span> {r.Title}{' '}
                      <span className="text-xs text-stone-500">({r.LoanCount})</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Popular genres (5+ loans)">
          <Table
            rows={stats.popularGenres}
            rowKey={(g) => g.Genre}
            columns={[
              { key: 'Genre', label: 'Genre' },
              { key: 'LoanCount', label: 'Loans' },
              { key: 'Readers', label: 'Readers' },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
