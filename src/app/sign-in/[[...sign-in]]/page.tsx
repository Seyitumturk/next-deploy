import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <SignIn 
        routing="path" 
        signUpUrl="/sign-up"
        signInRedirectOptions={{
          signInForceRedirectUrl: '/projects',
          signInFallbackRedirectUrl: '/projects'
        }}
      />
    </div>
  );
} 