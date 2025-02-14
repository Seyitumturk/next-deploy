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

    // Update the project using findOneAndUpdate to avoid version conflicts
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      {
        $set: { diagramSVG: svg },
        $push: {
          history: {
            $each: [{
              diagram_img: svg,
              updateType: 'chat',
              updatedAt: new Date()
            }],
            $position: 0
          }
        }
      },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update the GPT response if provided
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