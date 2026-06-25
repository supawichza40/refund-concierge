import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/**
 * Self-hosted fonts (next/font) — no runtime CDN call, so a flaky venue network
 * can't strip the typography mid-pitch. Exposed as CSS variables the design
 * system consumes (--font / --mono in globals.css).
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Refund Concierge — live agentic refund demo',
  description:
    'Voice Refund Concierge — an agent that resolves a refund and confirms it by email + WhatsApp in seconds.',
};

export const viewport: Viewport = {
  themeColor: '#07090e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
