import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'CSO 정산서 포털',
    template: '%s | CSO 정산서 포털',
  },
  description: 'CSO 업체의 월별 수수료 정산서를 웹으로 조회하고 다운로드할 수 있는 시스템',
  openGraph: {
    title: 'CSO 정산서 포털',
    description: 'CSO 업체의 월별 수수료 정산서를 웹으로 조회하고 다운로드할 수 있는 시스템',
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
