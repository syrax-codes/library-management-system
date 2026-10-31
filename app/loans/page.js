'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, Modal, PageHeader, Table } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { api, formatDate, rupees, today } from '@/lib/client';

export default function LoansPage() {
  const toast = useToast();
  const [view, setView] = useState('active'); // active | overdue | history
  const [loans, setLoans] = useState(null);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [copies, setCopies] = useState([]);
  const [form, setForm] = useState({ memberId: '', bookId: '', copyNumber: '' });
  const [returning, setReturning] = useState(null); // loan being returned
  const [returnDate, setReturnDate] = useState(today());

  const loadLoans = useCallback(() => {
    setLoans(null);
    const url = view === 'history' ? '/api/loans?history=1' : view === 'overdue' ? '/api/loans?overdue=1' : '/api/loans';
    api(url)
      .then(setLoans)
      .catch((err) => toast(err.message, 'error'));
  }, [view, toast]);

  useEffect(loadLoans, [loadLoans]);

  useEffect(() => {
    api('/api/members').then(setMembers).catch(() => {});
    api('/api/books').then((d) => setBooks(d.books)).catch(() => {});
  }, []);

  // When a book is chosen, list its available copies
  useEffect(() => {
    setCopies([]);
    setForm((f) => ({ ...f, copyNumber: '' }));
    if (!form.bookId) return;
    api(`/api/books/${form.bookId}`)
      .then((d) => setCopies(d.copies.filter((c) => c.AvailabilityStatus === 'Available')))
      .catch(() => {});
  }, [form.bookId]);

  async function issue(e) {
    e.preventDefault();
    try {
      const loan = await api('/api/loans/issue', { method: 'POST', body: form });
      toast(`Issued "${loan.Title}" to ${loan.MemberName}, due ${formatDate(loan.DueDate)}`);
      setForm({ memberId: '', bookId: '', copyNumber: '' });
      loadLoans();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function confirmReturn() {
    try {
      const result = await api('/api/loans/return', {
        method: 'POST',
        body: { loanId: returning.LoanID, returnDate },
      });
      toast(result.fine > 0 ? `Returned late: fine of ${rupees(result.fine)} added` : 'Returned on time, no fine');
      setReturning(null);
      loadLoans();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const activeColumns = [
    { key: 'LoanID', label: 'Loan' },
    { key: 'MemberName', label: 'Member' },
    { key: 'Title', label: 'Book', render: (l) => `${l.Title} (#${l.CopyNumber})` },
    { key: 'IssueDate', label: 'Issued', render: (l) => formatDate(l.IssueDate) },
    { key: 'DueDate', label: 'Due', render: (l) => formatDate(l.DueDate) },
    {
      key: 'DaysOverdue',
      label: 'Status',
      render: (l) => (l.DaysOverdue > 0 ? <Badge tone="red">{l.DaysOverdue} day{l.DaysOverdue === 1 ? '' : 's'} overdue</Badge> : <Badge tone="green">On time</Badge>),
    },
    {
      key: 'actions',
      label: '',
      render: (l) => (
        <button
          className="btn btn-sm"
          onClick={() => {
            setReturning(l);
            setReturnDate(today());
          }}
        >
          Return
        </button>
      ),
    },
  ];

  const historyColumns = [
    { key: 'LoanID', label: 'Loan' },
    { key: 'MemberName', label: 'Member' },
    { key: 'Title', label: 'Book' },
    { key: 'IssueDate', label: 'Issued', render: (l) => formatDate(l.IssueDate) },
    { key: 'ActualReturnDate', label: 'Returned', render: (l) => formatDate(l.ActualReturnDate) },
    { key: 'DaysLate', label: 'Late', render: (l) => (l.DaysLate > 0 ? <Badge tone="amber">{l.DaysLate} day{l.DaysLate === 1 ? '' : 's'}</Badge> : '—') },
  ];

  return (
    <>
      <PageHeader title="Loans" subtitle="14-day loans · max 3 per member · ₹5 per late day · blocked above ₹100 unpaid" />

      <Card title="Issue a book" className="mb-4">
        <form onSubmit={issue} className="grid gap-3 md:grid-cols-4 md:items-end">
          <label>
            <span className="label">Member</span>
            <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
              <option value="">Choose…</option>
              {members.map((m) => (
                <option key={m.MemberID} value={m.MemberID}>
                  {m.Name} ({m.ActiveLoans} active)
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Book</span>
            <select className="input" value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })} required>
              <option value="">Choose…</option>
              {books.map((b) => (
                <option key={b.BookID} value={b.BookID}>
                  {b.Title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Copy</span>
            <select className="input" value={form.copyNumber} onChange={(e) => setForm({ ...form, copyNumber: e.target.value })} required>
              <option value="">{form.bookId && copies.length === 0 ? 'No copy available' : 'Choose…'}</option>
              {copies.map((c) => (
                <option key={c.CopyNumber} value={c.CopyNumber}>
                  #{c.CopyNumber} · {c.Aisle}/{c.ShelfNumber}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary">Issue</button>
        </form>
      </Card>

      <Card
        title={view === 'history' ? 'Recently returned' : view === 'overdue' ? 'Overdue loans' : 'Active loans'}
        action={
          <div className="flex gap-1">
            {['active', 'overdue', 'history'].map((v) => (
              <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : ''}`} onClick={() => setView(v)}>
                {v === 'active' ? 'Active' : v === 'overdue' ? 'Overdue' : 'Returned'}
              </button>
            ))}
          </div>
        }
      >
        <Table
          columns={view === 'history' ? historyColumns : activeColumns}
          rows={loans}
          rowKey={(l) => l.LoanID}
          empty={view === 'overdue' ? 'No overdue loans' : 'No loans'}
        />
      </Card>

      <Modal open={!!returning} title="Return book" onClose={() => setReturning(null)}>
        {returning && (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{returning.Title}</span> from {returning.MemberName}, due {formatDate(returning.DueDate)}.
            </p>
            <label className="block">
              <span className="label">Return date</span>
              <input className="input" type="date" value={returnDate} max={today()} onChange={(e) => setReturnDate(e.target.value)} />
            </label>
            <p className="muted">A late return creates a ₹5/day fine automatically (trg_BookReturned).</p>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setReturning(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmReturn}>
                Confirm return
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
