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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={session} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
