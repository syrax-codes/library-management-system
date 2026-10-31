import './globals.css';
import AppShell from '@/components/AppShell';
import { ToastProvider } from '@/components/Toast';

export const metadata = {
  title: 'Library Management System',
  description: 'Catalog, circulation, study rooms and recommendations',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
