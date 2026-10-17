import type { Metadata } from 'next';
import './globals.css';
import FloatingAIBot from '@/components/chat/FloatingAIBot';

export const metadata: Metadata = {
  title: 'TataDana — Catat Keuangan Semudah Chat Langsung dari Telegram',
  description: 'Aplikasi manajemen keuangan pribadi modern terintegrasi dengan Telegram Bot, OCR foto struk, multi-wallet, laporan cerdas, dan AI Financial Advisor.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-orange-100 selection:text-orange-900">
        {children}
        <FloatingAIBot />
      </body>
    </html>
  );
}
