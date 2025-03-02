import CTAButton from '@/components/CTAButton';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function Home() {
  const { userId } = auth();
  if (userId) {
    redirect('/projects');
  }

  return (
    <main className="min-h-screen bg-[#201c1c] flex flex-col items-center justify-center">
      <CTAButton />
      
      <div className="mt-12 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 flex flex-col gap-4">
        <Link 
          href="/diagram-test" 
          className="text-white hover:text-blue-300 transition-colors flex items-center gap-2"
        >
          <span>Try our improved diagram tester</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        
        <Link 
          href="/diagram-test?version=latest" 
          className="text-white hover:text-blue-300 transition-colors flex items-center gap-2"
        >
          <span>View this version</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </main>
  );
}
