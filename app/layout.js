import './globals.css';

export const metadata = {
  title: 'Generation Regeneration | Online Summit',
  description: 'Generation Regeneration Online Summit — a virtual gathering featuring the world\'s leading names in regeneration.',
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
