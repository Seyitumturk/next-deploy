import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Project from '@/models/Project';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, prompt, diagram, updateType, diagram_img } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram content is required' }, { status: 400 });
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

    console.log(`Saving history for project ${projectId}, updateType: ${updateType}`);
    
    // Add new history item with diagram_img
    project.history.unshift({
      prompt,
      diagram,
      diagram_img,
      updateType,
      updatedAt: new Date(),
    });

    // Also update the current diagram
    project.currentDiagram = diagram;
    
    // Save the diagramSVG field as well for better compatibility
    if (diagram_img) {
      project.diagramSVG = diagram_img;
    }

    await project.save();
    console.log(`Successfully saved history for project ${projectId}`);

    return NextResponse.json({ 
      success: true,
      message: 'History saved successfully'
    });
  } catch (error) {
    console.error('Error in project history API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 