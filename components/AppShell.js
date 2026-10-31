'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/client';

const UserContext = createContext(null);

// The logged-in user ({ userId, role, memberId, name, email }) for any page
export function useUser() {
  return useContext(UserContext);
}

const NAV = [
  { href: '/', label: 'Dashboard', roles: ['Admin', 'Librarian'] },
  { href: '/me', label: 'My library', roles: ['Member'] },
  { href: '/catalog', label: 'Catalog', roles: ['Admin', 'Librarian', 'Member'] },
  { href: '/loans', label: 'Loans', roles: ['Admin', 'Librarian'] },
  { href: '/members', label: 'Members', roles: ['Admin', 'Librarian'] },
  { href: '/rooms', label: 'Study rooms', roles: ['Admin', 'Librarian', 'Member'] },
  { href: '/gate', label: 'Gate log', roles: ['Admin', 'Librarian'] },
  { href: '/admin', label: 'Admin', roles: ['Admin'] },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (pathname === '/login') return;
    api('/api/auth/me')
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname]);

  if (pathname === '/login') return children;

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }

  const links = NAV.filter((item) => user && item.roles.includes(user.role));
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <UserContext.Provider value={user}>
      <div className="flex min-h-screen">
        <aside className="hidden w-56 shrink-0 border-r border-stone-200 bg-white md:block">
          <div className="border-b border-stone-200 px-5 py-4">
            <div className="text-sm font-semibold text-stone-900">Library</div>
            <div className="text-xs text-stone-500">Management System</div>
          </div>
          <nav className="flex flex-col gap-0.5 p-3">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  isActive(item.href) ? 'bg-stone-100 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-6 py-3">
            <nav className="flex gap-3 overflow-x-auto text-sm md:hidden">
              {links.map((item) => (
                <Link key={item.href} href={item.href} className={isActive(item.href) ? 'font-medium' : 'text-stone-500'}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {user && (
                <span className="text-sm text-stone-600">
                  {user.name} <span className="text-stone-400">· {user.role}</span>
                </span>
              )}
              <button className="btn btn-sm" onClick={logout}>
                Log out
              </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 p-6">{user ? children : <p className="muted">Loading…</p>}</main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
