import React from 'react';

export const metadata = { title: 'Overseas Events Manager' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <header style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5e5' }}>
            <strong>Overseas Events Manager</strong>
          </header>
          <main style={{ flex: 1, padding: '16px' }}>
            {children}
          </main>
          <footer style={{ padding: '12px 16px', borderTop: '1px solid #e5e5e5', fontSize: 12, color: '#666' }}>
            Starter app · Next.js + Supabase + Netlify
          </footer>
        </div>
      </body>
    </html>
  );
}
