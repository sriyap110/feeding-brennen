import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Brennen's Table Diary",
  description: 'A journal of memorable meals, favorite plates, and shared ratings.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <a href="#top" className="wordmark">feeding<br /><em>Brennen</em></a>
            <nav aria-label="Main navigation"><a href="#photos">Favorite plates</a><a href="#visits">Meal log</a></nav>
          </div>
        </header>
        <main id="top">{children}</main>
        <footer><span>Made with full plates &amp; good company.</span><span>Los Angeles · 2026</span></footer>
      </body>
    </html>
  );
}
