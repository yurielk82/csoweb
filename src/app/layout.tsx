import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthProvider } from '@/contexts/AuthContext';

const PRETENDARD_CDN =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.min.css';

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
      <head>
        <link rel="stylesheet" href={PRETENDARD_CDN} />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
