import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Markus',
  description: 'Markus - Dein persönlicher AI-Assistent',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-gray-950 text-gray-100 min-h-screen flex flex-col">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-12 w-full flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}