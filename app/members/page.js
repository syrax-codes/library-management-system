'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, Drawer, Field, Modal, PageHeader, Table } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { api, formatDate, rupees } from '@/lib/client';

const EMPTY_FORM = {
  fname: '',
  lname: '',
  email: '',
  dob: '',
  phones: '',
  guardianName: '',
  guardianRelationship: '',
  guardianNumber: '',
  password: '',
};

export default function MembersPage() {
  const toast = useToast();
  const [members, setMembers] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(() => {
    api('/api/members')
      .then(setMembers)
      .catch((err) => toast(err.message, 'error'));
  }, [toast]);

  useEffect(load, [load]);

  async function register(e) {
    e.preventDefault();
    try {
      await api('/api/members', { method: 'POST', body: form });
      toast(`Registered ${form.fname} ${form.lname}`);
      setRegistering(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const shown = members?.filter((m) => `${m.Name} ${m.EmailAddress}`.toLowerCase().includes(filter.toLowerCase()));
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <PageHeader title="Members" subtitle="Activity summary from a multi-CTE query">
        <button className="btn btn-primary" onClick={() => setRegistering(true)}>
          Register member
        </button>
      </PageHeader>

      <Card>
        <input className="input mb-3 max-w-xs" placeholder="Filter by name or email" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <Table
          rows={shown}
          rowKey={(m) => m.MemberID}
          columns={[
            {
              key: 'Name',
              label: 'Member',
              render: (m) => (
                <button className="text-left font-medium text-teal-800 hover:underline" onClick={() => setSelected(m.MemberID)}>
                  {m.Name}
                  <span className="block text-xs font-normal text-stone-500">{m.EmailAddress}</span>
                </button>
              ),
            },
            { key: 'Age', label: 'Age' },
            { key: 'TotalLoans', label: 'Loans' },
            { key: 'ActiveLoans', label: 'Active', render: (m) => (m.ActiveLoans >= 3 ? <Badge tone="amber">3 (limit)</Badge> : m.ActiveLoans) },
            {
              key: 'UnpaidFines',
              label: 'Unpaid fines',
              render: (m) => (m.UnpaidFines > 0 ? <Badge tone={m.UnpaidFines > 100 ? 'red' : 'amber'}>{rupees(m.UnpaidFines)}</Badge> : '—'),
            },
            { key: 'Visits', label: 'Visits' },
            { key: 'LastVisit', label: 'Last visit', render: (m) => formatDate(m.LastVisit) },
          ]}
        />
      </Card>

      <MemberPanel memberId={selected} onClose={() => setSelected(null)} onChange={load} />

      <Modal open={registering} title="Register member" onClose={() => setRegistering(false)}>
        <form onSubmit={register} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input className="input" value={form.fname} onChange={set('fname')} required />
            </Field>
            <Field label="Last name">
              <input className="input" value={form.lname} onChange={set('lname')} required />
            </Field>
          </div>
          <Field label="Email (also the login)">
            <input className="input" type="email" value={form.email} onChange={set('email')} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <input className="input" type="date" value={form.dob} onChange={set('dob')} required />
            </Field>
            <Field label="Initial password">
              <input className="input" type="text" value={form.password} onChange={set('password')} required minLength={6} />
            </Field>
          </div>
          <Field label="Phone numbers (10 digits, comma-separated)">
            <input className="input" value={form.phones} onChange={set('phones')} placeholder="9900112233, 9845012345" />
          </Field>
          <p className="muted pt-1">Guardian details are required for members under 18.</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Guardian name">
              <input className="input" value={form.guardianName} onChange={set('guardianName')} />
            </Field>
            <Field label="Relationship">
              <input className="input" value={form.guardianRelationship} onChange={set('guardianRelationship')} />
            </Field>
            <Field label="Guardian number">
              <input className="input" value={form.guardianNumber} onChange={set('guardianNumber')} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={() => setRegistering(false)}>
              Cancel
            </button>
            <button className="btn btn-primary">Register</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// Side panel: profile, loans and fines (with pay / waive)
function MemberPanel({ memberId, onClose, onChange }) {
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    if (!memberId) return;
    setData(null);
    api(`/api/members/${memberId}`)
      .then(setData)
      .catch((err) => toast(err.message, 'error'));
  }, [memberId, toast]);

  useEffect(load, [load]);

  async function settle(fine, status) {
    try {
      await api('/api/fines/pay', { method: 'PUT', body: { loanId: fine.LoanID, fineNumber: fine.FineNumber, status } });
      toast(`Fine marked ${status}`);
      load();
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const m = data?.member;
  return (
    <Drawer open={!!memberId} title={m ? `${m.Fname} ${m.Lname}` : 'Member'} onClose={onClose}>
      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="space-y-5 text-sm">
          <dl className="grid grid-cols-3 gap-y-1">
            <dt className="text-stone-500">Email</dt>
            <dd className="col-span-2">{m.EmailAddress}</dd>
            <dt className="text-stone-500">Age</dt>
            <dd className="col-span-2">
              {m.Age} (born {formatDate(m.DOB)})
            </dd>
            <dt className="text-stone-500">Phones</dt>
            <dd className="col-span-2">{data.phones.join(', ') || '—'}</dd>
            {m.GuardianContactName && (
              <>
                <dt className="text-stone-500">Guardian</dt>
                <dd className="col-span-2">
                  {m.GuardianContactName} ({m.GuardianRelationship}), {m.GuardianContactNumber}
                </dd>
              </>
            )}
            <dt className="text-stone-500">Loans</dt>
            <dd className="col-span-2">{data.totalLoans} in total</dd>
            <dt className="text-stone-500">Unpaid fines</dt>
            <dd className="col-span-2 font-medium">{rupees(m.UnpaidFines)}</dd>
          </dl>

          <div>
            <h3 className="mb-2 font-semibold">Active loans</h3>
            {data.activeLoans.length === 0 ? (
              <p className="muted">None</p>
            ) : (
              <ul className="space-y-1">
                {data.activeLoans.map((l) => (
                  <li key={l.LoanID}>
                    {l.Title} · due {formatDate(l.DueDate)} {l.DaysOverdue > 0 && <Badge tone="red">{l.DaysOverdue}d overdue</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Fines</h3>
            {data.fines.length === 0 ? (
              <p className="muted">None</p>
            ) : (
              <ul className="space-y-2">
                {data.fines.map((f) => (
                  <li key={`${f.LoanID}-${f.FineNumber}`} className="flex items-center justify-between gap-2">
                    <span>
                      {rupees(f.FineAmount)} · {f.Title}
                      <span className="block text-xs text-stone-500">{formatDate(f.AssessedDate)}</span>
                    </span>
                    {f.FineStatus === 'Pending' ? (
                      <span className="flex gap-1">
                        <button className="btn btn-sm" onClick={() => settle(f, 'Paid')}>
                          Paid
                        </button>
                        <button className="btn btn-sm" onClick={() => settle(f, 'Waived')}>
                          Waive
                        </button>
                      </span>
                    ) : (
                      <Badge tone={f.FineStatus === 'Paid' ? 'green' : 'gray'}>{f.FineStatus}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
