import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST() {
  try {
    // Get the Clerk user ID
    const { userId } = await auth();
    console.log("API create user: Received userId:", userId);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve the user's details from Clerk
    const clerkUser = await currentUser();
    console.log("API create user: Retrieved Clerk user:", clerkUser);
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found in Clerk' }, { status: 404 });
    }

    // Connect to MongoDB
    await connectDB();

    // Check for an existing user in MongoDB
    const existingUser = await User.findOne({ clerkId: userId });
    if (existingUser) {
      console.log("API create user: User already exists in MongoDB:", existingUser);
      return NextResponse.json({ user: existingUser });
    }

    // Create a new user in MongoDB
    const newUser = await User.create({
      username: clerkUser.username || `${clerkUser.firstName}${clerkUser.lastName}`.toLowerCase(),
      clerkId: userId,
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      wordCountBalance: 5000, // Default word count balance
    });
    console.log("API create user: New user created:", newUser);

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 