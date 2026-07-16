import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LegacyPMS',
  description: 'Legacy hotel property management system for InnFlow simulation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
