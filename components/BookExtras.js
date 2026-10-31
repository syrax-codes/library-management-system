'use client';

// Digital files and reviews sections of the book detail page.
import { useState } from 'react';
import { Card, Modal } from '@/components/ui';
import { useUser } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { api, formatDate } from '@/lib/client';

// Opening a file logs the access in Digital_Media_Access
export function DigitalFiles({ bookId, media }) {
  const toast = useToast();
  const [opened, setOpened] = useState(null);

  async function open(item) {
    try {
      const result = await api('/api/media/access', {
        method: 'POST',
        body: { bookId, mediaNumber: item.MediaNumber },
      });
      setOpened(result);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <Card title="Digital copies">
      {media.length === 0 ? (
        <p className="muted">No digital versions.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {media.map((m) => (
            <li key={m.MediaNumber} className="flex items-center justify-between gap-2">
              <span>
                {m.FileFormat} <span className="text-stone-500">· {m.FileSizeMB} MB</span>
              </span>
              <button className="btn btn-sm" onClick={() => open(m)}>
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!opened} title={`Opening ${opened?.format}`} onClose={() => setOpened(null)}>
        <p className="text-sm">File link:</p>
        <p className="mt-1 break-all rounded bg-stone-100 p-2 font-mono text-xs">{opened?.url}</p>
        <p className="muted mt-3">
          {opened?.logged ? 'This access was recorded in the access log.' : 'Staff previews are not logged.'}
        </p>
      </Modal>
    </Card>
  );
}

// Reviews list; members can add one review per book and delete their own
export function BookReviews({ bookId, reviews, onChange }) {
  const user = useUser();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const isMember = user?.role === 'Member';
  const mine = reviews.find((r) => r.MemberID === user?.memberId);

  async function submit(e) {
    e.preventDefault();
    try {
      await api('/api/reviews', { method: 'POST', body: { bookId, rating, text } });
      toast('Review added');
      setText('');
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function remove(reviewId) {
    if (!confirm('Delete this review?')) return;
    try {
      await api(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      toast('Review deleted');
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <Card title={`Reviews (${reviews.length})`}>
      {isMember && !mine && (
        <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2 border-b border-stone-100 pb-4">
          <label>
            <span className="label">Rating</span>
            <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-48 flex-1">
            <span className="label">Your review</span>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional" />
          </label>
          <button className="btn btn-primary">Post</button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="muted">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.ReviewID} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="text-amber-600">{'★'.repeat(r.StarRating)}</span>
                  <span className="text-stone-300">{'★'.repeat(5 - r.StarRating)}</span>
                  <span className="ml-2 font-medium">{r.MemberName}</span>
                  <span className="ml-2 text-xs text-stone-500">{formatDate(r.SubmissionTimestamp)}</span>
                </span>
                {(r.MemberID === user?.memberId || user?.role === 'Admin') && (
                  <button className="btn btn-danger btn-sm" onClick={() => remove(r.ReviewID)}>
                    Delete
                  </button>
                )}
              </div>
              {r.ReviewText && <p className="mt-1 text-stone-700">{r.ReviewText}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
