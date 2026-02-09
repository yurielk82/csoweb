import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Header } from '@/components/shared/header';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  if (!session.is_admin && !session.is_approved) {
    redirect('/login');
  }
  
  // 비밀번호 변경이 필요한 경우 강제 리다이렉트
  if (session.must_change_password) {
    redirect('/change-password');
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
