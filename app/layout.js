import './globals.css';

export const metadata = {
  title: 'Library Management System',
  description: 'Catalog, circulation, study rooms and recommendations',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
