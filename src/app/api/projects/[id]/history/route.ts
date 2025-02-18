import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project from '@/models/Project';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { prompt, diagram, updateType } = await req.json();

    await connectDB();
    
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { params } = await context;
    const { id } = params;
    const project = await Project.findOne({
      _id: id,
      userId: user._id,
    });

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
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
    console.error('Error updating history:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 