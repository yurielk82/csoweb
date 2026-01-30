import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CSO 정산서 포털',
  description: 'CSO 업체의 월별 수수료 정산서를 웹으로 조회하고 다운로드할 수 있는 시스템',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" async></script>
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
