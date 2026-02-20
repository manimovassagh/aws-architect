import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AWSArchitect',
  description: 'Visualize AWS infrastructure as interactive architecture diagrams',
};

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">{children}</body>
    </html>
  );
}
