import './globals.css';

export const metadata = {
  title: 'Tony Cho Brand Dashboard',
  description: 'Unified dashboard for managing Team, Podcast, Summit, and Marketing Assets',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
