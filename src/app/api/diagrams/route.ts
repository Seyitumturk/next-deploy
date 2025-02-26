import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Anthropic } from '@anthropic-ai/sdk';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import User from '@/models/User';
import GptResponse from '@/models/GptResponse';
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import mermaid from 'mermaid';
import { Configuration, OpenAIApi } from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ARTIFICIAL_DELAY = 400;

// Load diagram definitions from YAML file
const diagramConfigPath = path.join(process.cwd(), 'src/config/diagram-definitions.yml');
const diagramConfig = yaml.parse(fs.readFileSync(diagramConfigPath, 'utf8'));

// Initialize mermaid configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'var(--font-geist-sans)',
  suppressErrorsInDOM: true,
  errorLabelColor: 'transparent',
});

// Add 'architecture' to the diagramTypes array or object if it exists
const diagramTypes = [
  'flowchart',
  'class',
  'erd',
  'sequence',
  'mindmap',
  'timeline',
  'gantt',
  'sankey',
  'git',
  'state',
  'architecture'  // Add architecture here
];

// Look for any mapping or alias handling for diagram types
// Add 'architecture' to any such mapping if it exists

// Add architecture to any diagramTypeAliases object if it exists
const diagramTypeAliases: Record<string, string> = {
  // ... existing aliases
  'architecture': 'architecture'
};

function getPromptForDiagramType(diagramType: string, userPrompt: string) {
  const config = diagramConfig.definitions[diagramType];
  
  if (!config) {
    throw new Error(`Unsupported diagram type: ${diagramType}`);
  }

  // Use the diagram-specific prompt template if available, otherwise use the default
  const promptTemplate = config.prompt_template || diagramConfig.prompts.user_template;

  return promptTemplate
    .replace('{prompt}', userPrompt)
    .replace('{diagram_type}', diagramType)
    .replace('{example}', config.example || '');
}

function getSystemPromptForDiagramType(diagramType: string) {
  const config = diagramConfig.definitions[diagramType];
  
  if (!config) {
    throw new Error(`Unsupported diagram type: ${diagramType}`);
  }

  return diagramConfig.prompts.system_template
    .replace('{diagram_type}', diagramType)
    .replace('{description}', config.description || '')
    .replace('{example}', config.example || '');
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Destructure the request body
    const { textPrompt, diagramType, projectId, clientSvg } = await req.json();

    // --- Added detailed logging for debugging ---
    console.log("[diagrams API] Incoming request body:", {
      textPrompt: textPrompt ? textPrompt.substring(0, 100) + "..." : "none",
      diagramType,
      projectId,
      clientSvg: clientSvg ? clientSvg.substring(0, 100) + "..." : "none",
    });

    // Normalize the incoming diagram type
    const rawType = diagramType.toString().trim().toLowerCase();

    // No alias mapping needed for state; use the raw diagram type directly.
    const effectiveDiagramType = rawType;

    console.log("[diagrams API] Raw diagram type:", rawType);
    console.log("[diagrams API] Effective diagram type after alias mapping:", effectiveDiagramType);
    console.log("[diagrams API] Available diagram definitions:", Object.keys(diagramConfig.definitions));
    // --- End added logging ---

    // Validate diagram type using the effective type
    if (!diagramConfig.definitions[effectiveDiagramType]) {
      console.error("[diagrams API] Unsupported diagram type:", effectiveDiagramType);
      return NextResponse.json(
        { error: `Unsupported diagram type: ${effectiveDiagramType}` },
        { status: 400 }
      );
    }

    // Get user and check token balance
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.wordCountBalance < 1000) {
      return NextResponse.json({ error: 'Insufficient token balance' }, { status: 403 });
    }

    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Add more detailed logging for architecture diagrams
    if (effectiveDiagramType === 'architecture') {
      console.log("[diagrams API] Processing architecture diagram");
      console.log("[diagrams API] System prompt:", getSystemPromptForDiagramType(effectiveDiagramType));
      console.log("[diagrams API] User prompt:", getPromptForDiagramType(effectiveDiagramType, textPrompt));
    }

    // Create a new ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            system: getSystemPromptForDiagramType(effectiveDiagramType),
            messages: [
              {
                role: "user",
                content: getPromptForDiagramType(effectiveDiagramType, textPrompt)
              }
            ],
            stream: true,
            max_tokens: 4000,
            temperature: 0.7,
            top_p: 0.95,
          });

          let diagram = '';
          let currentChunk = '';
          let isCollectingDiagram = false;
          let lineBuffer: string[] = [];

          for await (const chunk of completion) {
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              const content = chunk.delta.text;
              currentChunk += content;

              // Check for the start of Mermaid syntax
              if (currentChunk.includes('```mermaid') && !isCollectingDiagram) {
                isCollectingDiagram = true;
                currentChunk = currentChunk.substring(currentChunk.indexOf('```mermaid') + 10);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }

              // Check for the end of Mermaid syntax
              if (currentChunk.includes('```') && isCollectingDiagram) {
                diagram += currentChunk.substring(0, currentChunk.indexOf('```'));
                isCollectingDiagram = false;

                // Use the client-provided SVG
                const svgOutput = clientSvg;
                console.log('Using SVG for save:', svgOutput ? svgOutput.substring(0, 100) + '...' : 'No SVG to save');

                // Process any remaining lines in the buffer
                if (lineBuffer.length > 0) {
                  diagram += lineBuffer.join('\n') + '\n';
                  await new Promise(resolve => setTimeout(resolve, ARTIFICIAL_DELAY));
                  controller.enqueue(
                    `data: ${JSON.stringify({ mermaidSyntax: diagram, isComplete: false })}\n\n`
                  );
                  lineBuffer = [];
                }

                // Add final delay before completion
                await new Promise(resolve => setTimeout(resolve, 800));

                // Save with logging
                const gptResponse = new GptResponse({
                  prompt: textPrompt,
                  gptResponse: diagram,
                  extractedSyntax: diagram.trim(),
                  diagramSvg: svgOutput,
                  projectId: projectId,
                });
                await gptResponse.save();
                console.log('Saved GPT response with SVG:', gptResponse._id);

                // Save to project history
                project.history.unshift({
                  _id: new mongoose.Types.ObjectId(),
                  prompt: textPrompt,
                  diagram: diagram.trim(),
                  diagram_img: svgOutput,
                  updateType: 'chat',
                  updatedAt: new Date()
                });
                if (project.history.length > 30) {
                  project.history.pop();
                }

                // Save the latest diagram state to the project
                project.diagramSVG = svgOutput;
                project.currentDiagram = diagram.trim();
                project.markModified('history');
                console.log(">> diagrams API: Saved project.currentDiagram:", project.currentDiagram);
                await project.save();
                console.log('Saved project with SVG:', project._id);

                // Update user's token balance
                await User.findByIdAndUpdate(user._id, {
                  $inc: { wordCountBalance: -1000 }
                });

                // Send complete message
                controller.enqueue(
                  `data: ${JSON.stringify({ 
                    mermaidSyntax: diagram.trim(), 
                    isComplete: true,
                    gptResponseId: gptResponse._id.toString()
                  })}\n\n`
                );
                break;
              }

              // If we're collecting the diagram and have a complete line
              if (isCollectingDiagram && currentChunk.includes('\n')) {
                const lines = currentChunk.split('\n');
                currentChunk = lines.pop() || '';

                lineBuffer.push(...lines);

                if (lineBuffer.length >= 2) {
                  diagram += lineBuffer.join('\n') + '\n';
                  await new Promise(resolve => setTimeout(resolve, ARTIFICIAL_DELAY));
                  controller.enqueue(
                    `data: ${JSON.stringify({ mermaidSyntax: diagram, isComplete: false })}\n\n`
                  );
                  lineBuffer = [];
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in diagrams API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 