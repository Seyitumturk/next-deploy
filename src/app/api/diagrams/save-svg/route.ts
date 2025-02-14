import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import GptResponse from '@/models/GptResponse';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { projectId, gptResponseId, svg } = await req.json();

    // Update the project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update the most recent history item with the SVG
    if (project.history.length > 0) {
      project.history[0].diagram_img = svg;
    }
    project.diagramSVG = svg;
    project.markModified('history');
    await project.save();

    // Update the GPT response
    if (gptResponseId) {
      await GptResponse.findByIdAndUpdate(gptResponseId, {
        diagramSvg: svg
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving SVG:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 