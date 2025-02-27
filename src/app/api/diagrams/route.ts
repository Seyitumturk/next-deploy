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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load diagram definitions from YAML file
const diagramConfigPath = path.join(process.cwd(), 'src/config/diagram-definitions.yml');
const diagramConfig = yaml.parse(fs.readFileSync(diagramConfigPath, 'utf8'));

const ARTIFICIAL_DELAY = 400;

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

  // Add specific instructions to ensure we get proper diagram declarations in the response
  const basePrompt = diagramConfig.prompts.system_template
    .replace('{diagram_type}', diagramType)
    .replace('{description}', config.description || '')
    .replace('{example}', config.example || '');
    
  // Add specific instructions for flowcharts to ensure proper syntax
  if (diagramType === 'flowchart') {
    return `${basePrompt}

Important: Always ensure the diagram code begins with the proper declaration (e.g., "flowchart TD").
Do not start with comments. The diagram declaration MUST be on the very first line of the code.`;
  }
  
  return basePrompt;
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

    console.log("[diagrams API] Incoming request body:", {
      textPrompt: textPrompt ? textPrompt.substring(0, 100) + "..." : "none",
      diagramType,
      projectId,
      clientSvg: clientSvg ? clientSvg.substring(0, 100) + "..." : "none",
    });

    // Normalize the incoming diagram type
    const rawType = diagramType.toString().trim().toLowerCase();
    const effectiveDiagramType = rawType;

    // Validate diagram type
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

    // Create a new ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const systemPrompt = getSystemPromptForDiagramType(effectiveDiagramType);
          const userPrompt = getPromptForDiagramType(effectiveDiagramType, textPrompt);
          
          const messageContent = [
            {
              role: "user" as const,
              content: userPrompt
            }
          ];
          
          const response = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 4000,
            temperature: 0.7,
            system: systemPrompt,
            messages: messageContent,
            stream: true
          });

          let diagram = '';
          let currentChunk = '';
          let isCollectingDiagram = false;
          let lineBuffer: string[] = [];

          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.text) {
              const content = chunk.delta.text;
              currentChunk += content;

              // Check for the start of Mermaid syntax
              if (currentChunk.includes('```mermaid') && !isCollectingDiagram) {
                isCollectingDiagram = true;
                currentChunk = currentChunk.substring(currentChunk.indexOf('```mermaid') + 10);
                await new Promise(resolve => setTimeout(resolve, 1000));
              }

              // Check for the end of Mermaid syntax
              if (isCollectingDiagram && currentChunk.includes('```')) {
                diagram += currentChunk.substring(0, currentChunk.indexOf('```'));
                isCollectingDiagram = false;

                // Process the diagram - ensure it starts with a proper diagram type declaration
                let processedDiagram = diagram.trim();
                
                // Remove any comment lines at the beginning that might interfere with diagram type detection
                const lines = processedDiagram.split('\n');
                let firstNonCommentLineIndex = 0;
                
                // Find the first non-comment line
                for (let i = 0; i < lines.length; i++) {
                  if (!lines[i].trim().startsWith('%')) {
                    firstNonCommentLineIndex = i;
                    break;
                  }
                }
                
                // If the first real line doesn't contain the diagram type, insert it
                if (firstNonCommentLineIndex > 0 || !lines[0].toLowerCase().includes(effectiveDiagramType)) {
                  // For flowcharts, add the proper declaration at the top
                  if (effectiveDiagramType === 'flowchart') {
                    lines.unshift('flowchart TD');
                  } else if (effectiveDiagramType === 'erd') {
                    lines.unshift('erDiagram');
                  } else if (effectiveDiagramType === 'class') {
                    lines.unshift('classDiagram');
                  } else if (effectiveDiagramType === 'sequence') {
                    lines.unshift('sequenceDiagram');
                  } else if (effectiveDiagramType === 'mindmap') {
                    lines.unshift('mindmap');
                  } else if (effectiveDiagramType === 'timeline') {
                    lines.unshift('timeline');
                  } else if (effectiveDiagramType === 'gantt') {
                    lines.unshift('gantt');
                  } else if (effectiveDiagramType === 'state') {
                    lines.unshift('stateDiagram-v2');
                  }
                }
                
                processedDiagram = lines.join('\n');
                
                // Save the processed diagram
                diagram = processedDiagram;

                // Use the client-provided SVG
                const svgOutput = clientSvg;
                console.log('Using SVG for save:', svgOutput ? svgOutput.substring(0, 100) + '...' : 'No SVG to save');

                // Process any remaining lines in the buffer
                if (lineBuffer.length > 0) {
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
                  const partialDiagram = diagram + lineBuffer.join('\n') + '\n';
                  
                  // Ensure we're not sending malformed JSON that could break the stream
                  try {
                    JSON.stringify({ mermaidSyntax: partialDiagram, isComplete: false });
                    
                    // Add the lines to the diagram
                    diagram += lineBuffer.join('\n') + '\n';
                    
                    // Add artificial delay to prevent overwhelming the client
                    await new Promise(resolve => setTimeout(resolve, ARTIFICIAL_DELAY));
                    
                    // Send the update
                    controller.enqueue(
                      `data: ${JSON.stringify({ mermaidSyntax: diagram, isComplete: false })}\n\n`
                    );
                    
                    // Clear the buffer
                    lineBuffer = [];
                  } catch (error) {
                    console.warn('Error stringifying diagram update, skipping this chunk:', error);
                    // Don't clear the buffer, we'll try again with the next chunk
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error in streaming response:', error);
          // Send an error message that the client can handle
          try {
            controller.enqueue(
              `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
            );
          } catch (e) {
            console.error('Failed to send error message:', e);
          }
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