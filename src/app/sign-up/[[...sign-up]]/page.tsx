"use client";

import { useEffect } from "react";
import { useUser, SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If the user is already signed in, redirect them away from the sign-up page.
    if (isLoaded && isSignedIn) {
      router.push("/projects");
    }
  }, [isLoaded, isSignedIn, router]);

  // Optionally, return null or a spinner while Clerk loads the user
  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {!isSignedIn && (
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
      )}
    </div>
  );
} 