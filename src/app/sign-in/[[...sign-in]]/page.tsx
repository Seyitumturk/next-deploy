"use client";

import { useEffect } from "react";
import { useUser, SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If user is loaded and signed in, redirect them away from the sign-in page
    if (isLoaded && isSignedIn) {
      router.push("/projects");
    }
  }, [isLoaded, isSignedIn, router]);

  // Optionally, return null or a loading spinner while Clerk data is loading
  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {!isSignedIn && (
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      )}
    </div>
  );
} 