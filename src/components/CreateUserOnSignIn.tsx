'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

export function CreateUserOnSignIn() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    async function createUser() {
      try {
        const response = await fetch('/api/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('Failed to create user in MongoDB');
        }
      } catch (error) {
        console.error('Error creating user:', error);
      }
    }

    if (isLoaded && isSignedIn) {
      createUser();
    }
  }, [isLoaded, isSignedIn]);

  return null;
} 