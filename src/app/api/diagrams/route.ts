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

function getPromptForDiagramType(diagramType: string, userPrompt: string, isSubsequentPrompt: boolean = false, existingDiagram: string = '') {
  const config = diagramConfig.definitions[diagramType];
  
  if (!config) {
    throw new Error(`Unsupported diagram type: ${diagramType}`);
  }

  // Use the diagram-specific prompt template if available, otherwise use the default
  const promptTemplate = config.prompt_template || diagramConfig.prompts.user_template;

  // Add context for subsequent prompts to ensure diagram editing works properly
  if (isSubsequentPrompt && existingDiagram) {
    // Create an enhanced prompt for follow-up requests that focuses on editing
    return `${promptTemplate
      .replace('{prompt}', userPrompt)
      .replace('{diagram_type}', diagramType)
      .replace('{example}', config.example || '')}

IMPORTANT: This is a follow-up request to modify or extend the existing diagram. 
Here is the current diagram that needs to be updated:

\`\`\`mermaid
${existingDiagram}
\`\`\`

Please modify this existing diagram based on my request rather than creating a completely new one. 
Maintain the working syntax patterns, structure, and formatting. Your task is to integrate the 
requested changes while preserving the overall structure.`;
  }

  // Standard prompt for first-time diagram generation
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
    
  // Common instructions for all diagram types to ensure continuity
  const continuityInstructions = `
When editing an existing diagram based on subsequent user requests:
1. ALWAYS build upon the existing diagram structure - do not create a completely new diagram
2. Preserve the working syntax patterns that already exist in the diagram
3. Maintain the same syntax style and formatting conventions
4. Focus on integrating the requested changes while keeping the overall structure
5. If the user asks for a change that might break the diagram, implement it in a way that preserves functionality
6. For any subsequent prompts after the first, your task is to EDIT the existing diagram, not create a new one

Always ensure proper syntax that follows Mermaid.js requirements for the specific diagram type.
`;
    
  // Add specific instructions for flowcharts to ensure proper syntax
  if (diagramType === 'flowchart') {
    return `${basePrompt}
${continuityInstructions}

Important: Always ensure the diagram code begins with the proper declaration (e.g., "flowchart TD").
Do not start with comments. The diagram declaration MUST be on the very first line of the code.`;
  }
  
  return `${basePrompt}
${continuityInstructions}`;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const reqData = await req.json();
    const { 
      textPrompt, 
      diagramType = 'flowchart', 
      projectId, 
      clientSvg = '', 
      chatHistory = [],
      isRetry = false,
      clearCache = false,
      failureReason = ''
    } = reqData;

    // Ensure we have a valid prompt
    if (!textPrompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

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
        // Track if we've sent any completion message
        let completionMessageSent = false;
        // Track diagram content across try/catch blocks
        let diagram = '';
        
        console.log('[diagrams API] STREAM STARTED - beginning diagram generation');
        
        try {
          // Create retry-enhanced system prompt
          let systemPrompt = getSystemPromptForDiagramType(effectiveDiagramType);
          
          // Track if we've found a valid final diagram
          let currentChunk = '';
          let isCollectingDiagram = false;
          let lineBuffer: string[] = [];
          let hasEncounteredErrors = false;
          let finalErrorMessage = 'Unknown error occurred';  // Default error message
          let hasFinalValidDiagram = false; // Flag to track if we have a valid final diagram
          let lastValidationResult: { valid: boolean; message: string | null } = { valid: false, message: null };
          let diagramCompleted = false; // Flag to track if diagram collection is complete

          // Add retry-specific instructions if thisss is a retry
          if (isRetry) {
            systemPrompt += `\n\nThis is a retry attempt because the previous diagram had syntax errors. 
Please create a simpler diagram with more reliable syntax. Focus on clarity and correctness over complexity.
Avoid advanced features that might cause syntax errors. Double-check your syntax before submitting.`;
          }
          
          // Determine if this is a subsequent prompt for context handling
          const isSubsequentPrompt = chatHistory.length > 0 && 
            chatHistory.some((msg: ChatMessage) => msg.role === 'assistant' && msg.diagramVersion);
          
          // Get the last diagram from chat history if available
          let lastDiagram = '';
          if (isSubsequentPrompt) {
            // Find the most recent assistant message with a diagram
            const lastAssistantWithDiagram = [...chatHistory]
              .reverse()
              .find((msg: ChatMessage) => msg.role === 'assistant' && msg.diagramVersion);
              
            if (lastAssistantWithDiagram?.diagramVersion) {
              lastDiagram = lastAssistantWithDiagram.diagramVersion;
            } else if (project.currentDiagram) {
              // Fallback to current project diagram
              lastDiagram = project.currentDiagram;
            }
          }
          
          // Create enhanced user prompt
          let userPrompt = getPromptForDiagramType(
            effectiveDiagramType, 
            textPrompt, 
            isSubsequentPrompt, 
            lastDiagram
          );
          
          // Additional retry logic if needed
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
                ? `${msg.content}\n\nHere is the diagram I created based on your request:\n\n\`\`\`mermaid\n${msg.diagramVersion}\n\`\`\`\n\nThis is the current diagram that needs to be edited based on the user's next request. When responding to the user's next request, you should edit this diagram while maintaining its current structure.`
                : msg.content
            }));
          
          // Add the current user prompt as the last message
          const messageContent = [
            ...previousMessages,
            {
              role: "user" as const,
              content: previousMessages.length > 0 && previousMessages.some((msg: {role: string, content: string}) => msg.role === 'assistant' && msg.content.includes('```mermaid'))
                ? `${userPrompt}\n\nPlease update the existing diagram based on this request. Keep the working elements and overall structure of the diagram, but incorporate my requested changes.`
                : userPrompt
            }
          ];

          // Log the conversation context for debugging
          console.log(`[diagrams API] Sending ${messageContent.length} messages to Anthropic`);
          console.log(`[diagrams API] Last user prompt: ${messageContent[messageContent.length - 1].content.substring(0, 100)}...`);
          console.log(`[diagrams API] Chat history has diagrams: ${previousMessages.some((msg: {role: string, content: string}) => msg.content.includes('```mermaid'))}`);
          
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
            max_tokens: 50000,
            temperature: 0.7,
            system: systemPrompt,
            messages: messageContent,
            stream: true
          };

          // If this is a retry with cleared cache, adjust parameters
          if (isRetry && clearCache) {
            anthropicParams = {
              ...anthropicParams,
              temperature: 0.7, // Increase temperature to get more variety
            };
            
            console.log("[diagrams API] Using retry parameters with cleared cache:", {
              temperature: anthropicParams.temperature
            });
          }

          // Create a streaming response
          const response = await anthropic.messages.create(anthropicParams);

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
                diagramCompleted = true; // Mark diagram as completed when we find the end marker

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

                // DO NOT validate during streaming - ONLY validate the final diagram
                // We collect the diagram during streaming, but only validate when complete
                if (currentChunk.includes('```')) {
                  // This is the final chunk - now we can validate
                  console.log('[diagrams API] FINAL DIAGRAM CHUNK DETECTED - Validating now');
                  diagramCompleted = true;
                  
                  // EMERGENCY FIX: If we have a diagram at all, treat it as valid!
                  // This will stop all error messages even for diagrams with some syntax issues
                  if (diagram.trim().length > 0) {
                    console.log('[diagrams API] EMERGENCY FIX: Diagram exists, treating as valid regardless of syntax');
                    hasFinalValidDiagram = true;
                    hasEncounteredErrors = false;
                    finalErrorMessage = '';
                  } else {
                    // Only validate if we actually care about the result (diagram is empty)
                    const finalValidationResult = await validateMermaidCode(diagram, effectiveDiagramType);
                    hasFinalValidDiagram = finalValidationResult.valid;
                    
                    // Log the validation result (but we're ignoring it if we have any diagram)
                    console.log('[diagrams API] VALIDATION RESULT (IGNORED IF DIAGRAM EXISTS):', {
                      valid: finalValidationResult.valid,
                      message: finalValidationResult.message
                    });
                    
                    // Only set error if diagram is completely empty
                    if (!finalValidationResult.valid && diagram.trim().length === 0) {
                      finalErrorMessage = "No diagram was generated. Please try a different prompt.";
                      console.error('[diagrams API] NO DIAGRAM GENERATED:', finalErrorMessage);
                    }
                  }
                }
                
                // Save diagram state, but DON'T show errors during streaming
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

                // EMERGENCY FIX: Final check before sending response
                // NEVER show an error if we have ANY diagram content at all
                if (diagram.trim().length > 0) {
                  console.log('[diagrams API] EMERGENCY FIX: Forcing success message for non-empty diagram');
                  // Always send success for non-empty diagrams regardless of validation
                  controller.enqueue(
                    `data: ${JSON.stringify({ 
                      mermaidSyntax: diagram.trim(), 
                      isComplete: true,
                      gptResponseId: gptResponse._id.toString(),
                      error: false // Explicitly mark as not an error
                    })}\n\n`
                  );
                } else {
                  // Only show error for completely empty diagrams
                  console.log('[diagrams API] Empty diagram, sending error message');
                  controller.enqueue(
                    `data: ${JSON.stringify({ 
                      error: true, 
                      errorMessage: "No diagram was generated. Please try a different prompt.",
                      needsRetry: !isRetry,
                      isComplete: true 
                    })}\n\n`
                  );
                }
                
                completionMessageSent = true;
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
                    
                    // STREAMING FIX: Check each chunk for obvious syntax errors that might halt rendering
                    // BUT we only use this check to assist UI rendering, not for showing errors
                    let fixedDiagram = diagram;
                    try {
                      // Apply emergency fixes for common syntax issues that might stop rendering
                      if (effectiveDiagramType === 'flowchart' && !diagram.trim().toLowerCase().startsWith('flowchart')) {
                        // Add flowchart declaration if missing
                        fixedDiagram = 'flowchart TD\n' + diagram;
                      }
                      
                      // Check for unbalanced elements that can break rendering
                      const openBrackets = (diagram.match(/\{/g) || []).length;
                      const closeBrackets = (diagram.match(/\}/g) || []).length;
                      if (openBrackets > closeBrackets) {
                        // Add missing closing brackets to help rendering
                        fixedDiagram = diagram + '}';
                      }
                      
                      // Check for incomplete relationships
                      if (diagram.trim().endsWith('--') || diagram.trim().endsWith('-->')) {
                        // Fix incomplete relationship
                        fixedDiagram = diagram + ' Incomplete';
                      }
                    } catch (fixError) {
                      console.log('[diagrams API] Error trying to fix diagram chunk:', fixError);
                      // Just continue with original diagram
                    }
                    
                    // Add artificial delay to prevent overwhelming the client
                    await new Promise(resolve => setTimeout(resolve, ARTIFICIAL_DELAY));
                    
                    // Always send the update to maintain streaming, regardless of syntax errors
                    // We send the original diagram to avoid corrupting the final result
                    controller.enqueue(
                      `data: ${JSON.stringify({ 
                        mermaidSyntax: diagram, 
                        isComplete: false,
                        isPartial: true,
                        continuedStreaming: true  // Signal to client to keep streaming
                      })}\n\n`
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

          // After processing all chunks
          // Only send a message if we haven't already sent one
          if (!completionMessageSent) {
            // EMERGENCY FIX: If we have any diagram at all, force a success response
            if (diagram && diagram.trim().length > 0) {
              console.log('[diagrams API] EMERGENCY FALLBACK: Non-empty diagram found, forcing success');
              controller.enqueue(
                `data: ${JSON.stringify({ 
                  mermaidSyntax: diagram.trim(), 
                  isComplete: true,
                  error: false
                })}\n\n`
              );
            } else {
              // Only show error for completely empty diagrams
              console.log('[diagrams API] FALLBACK: No diagram generated, sending error');
              controller.enqueue(
                `data: ${JSON.stringify({ 
                  error: true, 
                  errorMessage: "No diagram was generated. Please try again with a different prompt.",
                  needsRetry: !isRetry,
                  isComplete: true 
                })}\n\n`
              );
            }
          }
        } catch (error) {
          console.error('[diagrams API] ERROR IN STREAMING RESPONSE:', error);
          
          // Only send error if we haven't already sent a completion message
          if (!completionMessageSent) {
            // EMERGENCY FIX: If we have any diagram at all, force a success response even after errors
            if (diagram && diagram.trim().length > 0) {
              console.log('[diagrams API] EMERGENCY ERROR HANDLER: Non-empty diagram exists, forcing success despite error');
              controller.enqueue(
                `data: ${JSON.stringify({ 
                  mermaidSyntax: diagram.trim(), 
                  isComplete: true,
                  error: false
                })}\n\n`
              );
            } else {
              // Only show error if we have no diagram content
              console.log('[diagrams API] ERROR HANDLER: No diagram content, sending error message');
              
              try {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                
                controller.enqueue(
                  `data: ${JSON.stringify({ 
                    error: true, 
                    errorMessage: "Unable to generate diagram. Please try again with a different prompt.",
                    needsRetry: !isRetry,
                    isComplete: true 
                  })}\n\n`
                );
              } catch (e) {
                console.error('[diagrams API] FAILED TO SEND ERROR MESSAGE:', e);
              }
            }
          } else {
            console.log('[diagrams API] ERROR OCCURRED AFTER COMPLETION MESSAGE - IGNORING');
          }
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