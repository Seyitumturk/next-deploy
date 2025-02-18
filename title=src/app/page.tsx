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
    <SignedOut>
      <SignInButton mode="modal" forceRedirectUrl="/projects">
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
  );
} 