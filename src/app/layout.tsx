import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Pythoughts',
    default: 'Pythoughts - Share Your Thoughts',
  },
  description: 'A modern platform for sharing thoughts, ideas, and stories.',
  keywords: ['blog', 'thoughts', 'ideas', 'writing', 'community'],
  authors: [{ name: 'Pythoughts' }],
  creator: 'Pythoughts',
  publisher: 'Pythoughts',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://pythoughts.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://pythoughts.com',
    siteName: 'Pythoughts',
    title: 'Pythoughts - Share Your Thoughts',
    description: 'A modern platform for sharing thoughts, ideas, and stories.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pythoughts',
    description: 'A modern platform for sharing thoughts, ideas, and stories.',
    creator: '@pythoughts',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0d1117] text-terminal-green antialiased">
        {children}
      </body>
    </html>
  );
}
