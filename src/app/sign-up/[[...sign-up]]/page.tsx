import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <SignUp 
        routing="path" 
        signInUrl="/sign-in"
        signUpRedirectOptions={{
          signUpForceRedirectUrl: '/projects',
          signUpFallbackRedirectUrl: '/projects'
        }}
      />
    </div>
  );
} 