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

    // Add detailed SVG tracking logs
    console.log('[SVG_TRACKING] save-svg endpoint called:', {
      projectId,
      hasGptResponseId: !!gptResponseId,
      hasSVG: !!svg,
      svgLength: svg ? svg.length : 0
    });

    if (!svg) {
      console.warn('[SVG_TRACKING] No SVG provided to save-svg endpoint');
      return NextResponse.json({ error: 'No SVG provided' }, { status: 400 });
    }

    // First get the project to check its current state
    const project = await Project.findById(projectId);
    if (!project) {
      console.error('[SVG_TRACKING] Project not found for SVG save:', projectId);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update the project's SVG
    project.diagramSVG = svg;
    console.log('[SVG_TRACKING] Updating project SVG:', {
      projectId,
      svgLength: svg.length
    });

    // Update the most recent history item if it exists and doesn't have SVG
    if (project.history && project.history.length > 0 && !project.history[0].diagram_img) {
      console.log('[SVG_TRACKING] Updating most recent history item with SVG');
      project.history[0].diagram_img = svg;
      project.markModified('history');
    }

    await project.save();
    console.log('[SVG_TRACKING] Project saved with updated SVG:', {
      projectId,
      hasSVG: !!project.diagramSVG,
      svgLength: project.diagramSVG ? project.diagramSVG.length : 0,
      historyLength: project.history.length,
      firstItemHasSVG: project.history.length > 0 ? !!project.history[0].diagram_img : false
    });

    // Update the GPT response if provided
    if (gptResponseId) {
      const gptResponse = await GptResponse.findById(gptResponseId);
      if (gptResponse) {
        gptResponse.diagramSvg = svg;
        await gptResponse.save();
        console.log('[SVG_TRACKING] Updated GptResponse with SVG:', {
          gptResponseId,
          hasSVG: true,
          svgLength: svg.length
        });
      } else {
        console.warn('[SVG_TRACKING] GptResponse not found:', gptResponseId);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "SVG saved successfully",
      updatedProject: true,
      updatedGptResponse: !!gptResponseId
    });

  } catch (error) {
    console.error('[SVG_TRACKING] Error saving SVG:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 