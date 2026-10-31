'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, PageHeader, Table } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { api, formatDateTime } from '@/lib/client';

function stay(minutes) {
  if (minutes == null) return '—';
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

export default function GatePage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState('');
  const [date, setDate] = useState('');

  const load = useCallback(() => {
    api(`/api/gate/logs${date ? `?date=${date}` : ''}`)
      .then(setData)
      .catch((err) => toast(err.message, 'error'));
  }, [date, toast]);

  useEffect(load, [load]);
  useEffect(() => {
    api('/api/members').then(setMembers).catch(() => {});
  }, []);

  async function enter(e) {
    e.preventDefault();
    try {
      await api('/api/gate/entry', { method: 'POST', body: { memberId } });
      toast('Entry recorded');
      setMemberId('');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function exit(logId) {
    try {
      const row = await api('/api/gate/exit', { method: 'POST', body: { logId } });
      toast(`Exit recorded · stayed ${stay(row.StayMinutes)}`);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <PageHeader title="Gate log" subtitle="Stay time is a generated column computed by MySQL" />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Record entry" className="h-fit">
          <form onSubmit={enter} className="flex gap-2">
            <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
              <option value="">Choose member…</option>
              {members.map((m) => (
                <option key={m.MemberID} value={m.MemberID}>
                  {m.Name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary">Enter</button>
          </form>
        </Card>

        <Card title={`Inside now (${data?.inside.length ?? 0})`} className="lg:col-span-2">
          <Table
            rows={data?.inside}
            rowKey={(r) => r.LogID}
            empty="Nobody is inside"
            columns={[
              { key: 'MemberName', label: 'Member' },
              { key: 'EntryTime', label: 'Entered', render: (r) => formatDateTime(r.EntryTime) },
              {
                key: 'actions',
                label: '',
                render: (r) => (
                  <button className="btn btn-sm" onClick={() => exit(r.LogID)}>
                    Record exit
                  </button>
                ),
              },
            ]}
          />
        </Card>
      </div>

      <Card
        title="Visit log"
        action={
          <div className="flex items-center gap-2">
            <input className="input py-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {date && (
              <button className="btn btn-sm" onClick={() => setDate('')}>
                All
              </button>
            )}
          </div>
        }
      >
        <Table
          rows={data?.logs}
          rowKey={(r) => r.LogID}
          empty="No visits"
          columns={[
            { key: 'MemberName', label: 'Member' },
            { key: 'EntryTime', label: 'Entry', render: (r) => formatDateTime(r.EntryTime) },
            { key: 'ExitTime', label: 'Exit', render: (r) => (r.ExitTime ? formatDateTime(r.ExitTime) : 'Inside') },
            { key: 'StayMinutes', label: 'Stay', render: (r) => stay(r.StayMinutes) },
          ]}
        />
      </Card>
    </>
  );
}
