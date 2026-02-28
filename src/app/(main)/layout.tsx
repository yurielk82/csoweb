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

  // 프로필 미완성인 경우 강제 리다이렉트
  if (!session.profile_complete) {
    redirect('/complete-profile');
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />
      <main className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-6 max-w-screen-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
