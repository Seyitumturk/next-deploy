"use client";

import { useEffect } from 'react';
import { useClerk, useUser, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const { isSignedIn } = useUser();
  const { openSignUp } = useClerk();

  // Auto open the registration modal for new users on landing
  useEffect(() => {
    if (!isSignedIn) {
      openSignUp({ afterSignUpUrl: '/projects' });
    }
  }, [isSignedIn, openSignUp]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <nav className="p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src="/logo-green.svg" alt="Chartable Logo" className="h-8 w-8" />
            <span className="text-xl font-bold">Chartable</span>
          </div>
          <div className="space-x-4">
            <SignedOut>
              <SignInButton mode="modal" redirectUrl="/projects">
                <button className="px-4 py-2 rounded-lg bg-transparent border border-white hover:bg-white hover:text-gray-900 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" redirectUrl="/projects">
                <button className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">
            Create Beautiful Diagrams with AI
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            Transform your ideas into professional diagrams instantly using AI. Support for ERD, Flowcharts, Sequence diagrams, and more.
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="px-8 py-4 text-lg rounded-lg bg-green-500 hover:bg-green-600 transition-colors">
                Start Creating
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/projects/" className="px-8 py-4 text-lg rounded-lg bg-green-500 hover:bg-green-600 transition-colors inline-block">
              Go to Projects
            </Link>
          </SignedIn>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            <h3 className="text-xl font-bold mb-4">AI-Powered</h3>
            <p className="text-gray-300">
              Let AI understand your requirements and generate professional diagrams automatically.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            <h3 className="text-xl font-bold mb-4">Multiple Diagram Types</h3>
            <p className="text-gray-300">
              Create ERDs, Flowcharts, Sequence diagrams, Class diagrams, and more with ease.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
            <h3 className="text-xl font-bold mb-4">Export & Share</h3>
            <p className="text-gray-300">
              Export your diagrams in multiple formats and share them with your team.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
