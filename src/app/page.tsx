import CTAButton from '@/components/CTAButton';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
  const { userId } = auth();
  if (userId) {
    redirect('/projects');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#3A0CA3] to-[#0D0D0D] animate-gradient flex items-center justify-center">
      <CTAButton />
    </main>
  );
}
