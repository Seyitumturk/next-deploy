import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import CreateForm from './create-form';
import Image from 'next/image';

async function getUser(userId: string) {
  await connectDB();
  
  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    throw new Error('User not found');
  }

  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    wordCountBalance: user.wordCountBalance
  };
}

export default async function NewProjectPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  const user = await getUser(userId);

  return (
    <main className="min-h-screen bg-background">
      <nav className="bg-gray-900 text-white p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/projects" className="flex items-center space-x-2 hover:opacity-80">
              <Image src="/logo-green.svg" alt="Chartable Logo" width={32} height={32} className="h-8 w-8" />
              <span className="text-xl font-bold">Chartable</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-sm">
                <span className="text-gray-400">Credits:</span>
                <span className="ml-1 font-mono">{user.wordCountBalance.toLocaleString()}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Create New Diagram</h1>
          <CreateForm />
        </div>
      </div>
    </main>
  );
} 