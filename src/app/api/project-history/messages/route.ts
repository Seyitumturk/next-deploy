import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project from '@/models/Project';
import GptResponse from '@/models/GptResponse';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const project = await Project.findOne({
      _id: projectId,
      userId: user._id,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the chat history from GptResponse collection
    const gptResponses = await GptResponse.find({
      projectId: projectId
    }).sort({ createdAt: -1 }).limit(30).lean();
    
    // Convert GPT responses to chat messages
    const chatMessages = [];
    
    for (const item of project.history) {
      if (item.updateType === 'chat') {
        // Add user message
        chatMessages.push({
          role: 'user',
          content: item.prompt || '',
          timestamp: item.updatedAt,
          // Include diagram_img for the user message as well, so it's saved for the initial prompt
          diagram_img: item.diagram_img,
        });
        
        // Add assistant message
        chatMessages.push({
          role: 'assistant',
          content: `Here is your ${item === project.history[0] ? 'diagram' : 'updated diagram'}.`,
          timestamp: item.updatedAt,
          diagramVersion: item.diagram,
          // Include diagram_img in the assistant message
          diagram_img: item.diagram_img,
        });
      }
    }
    
    // Sort messages by timestamp
    chatMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({ 
      success: true,
      chatMessages
    });
  } catch (error) {
    console.error('Error retrieving chat messages:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 