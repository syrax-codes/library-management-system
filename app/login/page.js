'use client';

import { useState } from 'react';
import { api } from '@/lib/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      // Full reload so the layout picks up the new session
      window.location.href = user.role === 'Member' ? '/me' : '/';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Library Management System</h1>
          <p className="muted mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={submit} className="card space-y-4">
          <label className="block">
            <span className="label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-stone-500">
          Demo: admin@library.com, librarian1@library.com or aarav.sharma@example.com · password library123
        </p>
      </div>
    </div>
  );
}
