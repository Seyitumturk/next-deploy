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
import { validateMermaidCode } from '@/lib/mermaidUtils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Load diagram definitions from YAML file
const diagramConfigPath = path.join(process.cwd(), 'src/config/diagram-definitions.yml');
const diagramConfig = yaml.parse(fs.readFileSync(diagramConfigPath, 'utf8'));

const ARTIFICIAL_DELAY = 400;

// Add ChatMessage interface for type safety
interface ChatMessage {
  role: string;
  content: string;
  isTyping?: boolean;
  diagramVersion?: string;
  timestamp: Date;
  errorMessage?: string;
}

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
    const { 
      textPrompt, 
      diagramType, 
      projectId, 
      clientSvg, 
      chatHistory = [],
      isRetry = false,
      clearCache = false, 
      failureReason = ''
    } = await req.json();

    // Add detailed logging for SVG tracking
    console.log("[SVG_TRACKING] Request received with SVG:", {
      hasSVG: !!clientSvg,
      svgLength: clientSvg ? clientSvg.length : 0,
      isFirstPrompt: chatHistory.length === 0,
      isRetry,
      clearCache
    });

    console.log("[diagrams API] Incoming request body:", {
      textPrompt: textPrompt ? textPrompt.substring(0, 100) + "..." : "none",
      diagramType,
      projectId,
      clientSvg: clientSvg ? clientSvg.substring(0, 100) + "..." : "none",
      chatHistoryLength: chatHistory.length,
      isRetry,
      clearCache,
      failureReason
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
          // Create retry-enhanced system prompt
          let systemPrompt = getSystemPromptForDiagramType(effectiveDiagramType);
          
          // Add retry-specific instructions if this is a retry
          if (isRetry) {
            systemPrompt += `\n\nThis is a retry attempt because the previous diagram had syntax errors. 
Please create a simpler diagram with more reliable syntax. Focus on clarity and correctness over complexity.
Avoid advanced features that might cause syntax errors. Double-check your syntax before submitting.`;
          }
          
          // Create user prompt with specific retry guidance if needed
          let userPrompt = getPromptForDiagramType(effectiveDiagramType, textPrompt);
          
          if (isRetry && failureReason) {
            userPrompt += `\n\nThe previous attempt failed with this error: "${failureReason}". 
Please create a new diagram from scratch with simpler, more reliable syntax.`;
          } else if (isRetry) {
            userPrompt += `\n\nThe previous attempt failed due to syntax errors. 
Please try again with a completely fresh approach, focusing on simpler, more reliable syntax.`;
          }
          
          // Convert chat history into the format expected by Anthropic
          const previousMessages = chatHistory
            .filter((msg: ChatMessage) => !msg.isTyping && msg.role !== 'document') // Filter out typing indicators and document messages
            .slice(-10) // Limit to last 10 messages to avoid token limits
            .map((msg: ChatMessage) => ({
              role: msg.role as "user" | "assistant",
              content: msg.role === 'assistant' && msg.diagramVersion 
                ? `${msg.content}\n\nHere is the diagram I created based on your request:\n\n\`\`\`mermaid\n${msg.diagramVersion}\n\`\`\``
                : msg.content
            }));
          
          // Add the current user prompt as the last message
          const messageContent = [
            ...previousMessages,
            {
              role: "user" as const,
              content: userPrompt
            }
          ];
          
          // Configure Anthropic API parameters
          let anthropicParams: {
            model: string;
            max_tokens: number;
            temperature: number;
            system: string;
            messages: any[];
            stream: boolean;
          } = {
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 10000,
            temperature: 0.9,
            system: systemPrompt,
            messages: messageContent,
            stream: true
          };

          // If this is a retry with cleared cache, adjust parameters
          if (isRetry && clearCache) {
            anthropicParams = {
              ...anthropicParams,
              temperature: 1.0, // Increase temperature to get more variety
            };
            
            console.log("[diagrams API] Using retry parameters with cleared cache:", {
              temperature: anthropicParams.temperature
            });
          }

          // Create a streaming response
          const response = await anthropic.messages.create(anthropicParams);

          let diagram = '';
          let currentChunk = '';
          let isCollectingDiagram = false;
          let lineBuffer: string[] = [];

          // Use type assertion to handle the response as an async iterable
          for await (const chunk of response as any) {
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
                
                // Check if the diagram already has a proper declaration
                const hasProperDeclaration = lines.some(line => {
                  const lowercaseLine = line.toLowerCase().trim();
                  return lowercaseLine.startsWith('flowchart ') ||
                         lowercaseLine.startsWith('erdiagram') ||
                         lowercaseLine.startsWith('classdiagram') ||
                         lowercaseLine.startsWith('sequencediagram') ||
                         lowercaseLine.startsWith('mindmap') ||
                         lowercaseLine.startsWith('timeline') ||
                         lowercaseLine.startsWith('gantt') ||
                         lowercaseLine.startsWith('statediagram-v2');
                });
                
                console.log(`Diagram type: ${effectiveDiagramType}, Has proper declaration: ${hasProperDeclaration}`);
                
                // If no proper declaration is found, add it based on diagram type
                if (!hasProperDeclaration) {
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
                
                // Special handling for flowcharts - ensure proper direction is specified
                if (effectiveDiagramType === 'flowchart') {
                  const firstLine = processedDiagram.split('\n')[0].trim();
                  if (firstLine === 'flowchart' || firstLine === 'flowChart') {
                    // Add TD (top-down) direction if missing
                    processedDiagram = 'flowchart TD\n' + processedDiagram.split('\n').slice(1).join('\n');
                  } else if (!firstLine.match(/flowchart\s+(TD|TB|LR|RL|BT)/i)) {
                    // Add TD direction if no direction is specified
                    processedDiagram = 'flowchart TD\n' + processedDiagram;
                  }
                }
                
                // Save the processed diagram
                diagram = processedDiagram;

                // Validate the diagram syntax before proceeding
                const validationResult = await validateMermaidCode(diagram, effectiveDiagramType);
                
                if (!validationResult.valid) {
                  // Handle validation failure
                  console.error('[diagrams API] Validation failed:', validationResult.message);
                  
                  // Send error to client
                  controller.enqueue(
                    `data: ${JSON.stringify({ 
                      error: true,
                      errorMessage: validationResult.message,
                      mermaidSyntax: diagram.trim(),
                      needsRetry: !isRetry, // Only auto-retry on first failure
                      isComplete: true
                    })}\n\n`
                  );
                  
                  // Don't save invalid diagrams
                  return;
                }

                // Use the client-provided SVG
                const svgOutput = clientSvg;
                console.log('[SVG_TRACKING] Processing SVG for saving:', {
                  hasSVG: !!svgOutput,
                  svgLength: svgOutput ? svgOutput.length : 0,
                  isFirstPrompt: chatHistory.length === 0,
                  promptText: textPrompt ? textPrompt.substring(0, 50) + "..." : "none"
                });

                // Process any remaining lines in the buffer
                if (lineBuffer.length > 0) {
                  controller.enqueue(
                    `data: ${JSON.stringify({ mermaidSyntax: diagram, isComplete: false })}\n\n`
                  );
                  lineBuffer = [];
                }

                // Add final delay before completion
                await new Promise(resolve => setTimeout(resolve, 800));

                // Make sure we have SVG to save
                if (!svgOutput) {
                  console.warn('[SVG_TRACKING] No SVG provided for saving. This might lead to missing SVG for initial diagram.');
                  // For the first prompt, we could attempt server-side rendering
                  // but this would require additional dependencies and isn't ideal.
                  // Instead, we'll rely on the client to fix the issue by always sending SVG.
                }

                // Try to ensure we have diagram SVG before saving - this is a critical must-fix issue
                let finalSvg = svgOutput;
                if (!finalSvg || finalSvg.length === 0) {
                  console.log('[SVG_TRACKING] No SVG provided - this is a critical issue that must be fixed');
                  
                  // Remove the failing check-svg call and rely on client-side SVG save
                  console.log('[SVG_TRACKING] Will rely on client-side delayed SVG save via save-svg endpoint');
                }

                // Save with logging
                const gptResponse = new GptResponse({
                  prompt: textPrompt,
                  gptResponse: diagram,
                  extractedSyntax: diagram.trim(),
                  diagramSvg: finalSvg,
                  projectId: projectId,
                });
                await gptResponse.save();
                console.log('[SVG_TRACKING] Saved GPT response with SVG:', {
                  gptResponseId: gptResponse._id.toString(),
                  hasSVG: !!gptResponse.diagramSvg,
                  svgLength: gptResponse.diagramSvg ? gptResponse.diagramSvg.length : 0
                });

                // Save to project history
                project.history.unshift({
                  _id: new mongoose.Types.ObjectId(),
                  prompt: textPrompt,
                  diagram: diagram.trim(),
                  diagram_img: finalSvg,
                  updateType: 'chat',
                  updatedAt: new Date()
                });
                console.log('[SVG_TRACKING] Added to project history:', {
                  historyLength: project.history.length,
                  firstItemHasSVG: !!project.history[0].diagram_img,
                  svgLength: project.history[0].diagram_img ? project.history[0].diagram_img.length : 0
                });
                
                if (project.history.length > 30) {
                  project.history.pop();
                }

                // Save the latest diagram state to the project
                project.diagramSVG = finalSvg;
                project.currentDiagram = diagram.trim();
                project.markModified('history');
                console.log("[SVG_TRACKING] Project state before save:", {
                  hasDiagramSVG: !!project.diagramSVG,
                  svgLength: project.diagramSVG ? project.diagramSVG.length : 0,
                  hasDiagram: !!project.currentDiagram
                });
                
                await project.save();
                console.log('[SVG_TRACKING] Saved project with SVG:', {
                  projectId: project._id.toString(),
                  hasSVG: !!project.diagramSVG,
                  svgLength: project.diagramSVG ? project.diagramSVG.length : 0
                });

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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            controller.enqueue(
              `data: ${JSON.stringify({ 
                error: true, 
                errorMessage,
                needsRetry: !isRetry, // Only auto-retry on first failure
                isComplete: true 
              })}\n\n`
            );
          } catch (e) {
            console.error('Failed to send error message:', e);
          }
          
          // Don't throw error here - we've already sent an error response
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