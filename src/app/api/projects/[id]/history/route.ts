import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project from '@/models/Project';

// Update the params type to match Next.js expectations
type Context = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(
  request: NextRequest,
  context: Context
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, diagram, updateType } = await request.json();
    
    // Handle both Promise and direct object cases
    const params = await Promise.resolve(context.params);
    const { id } = params;

    await connectDB();
    
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const project = await Project.findOne({
      _id: id,
      userId: user._id,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Add new history item
    project.history.unshift({
      prompt,
      diagram,
      updateType,
      updatedAt: new Date(),
    });

    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in project history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 