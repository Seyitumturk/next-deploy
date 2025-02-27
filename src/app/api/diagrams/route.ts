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

// Available diagram types
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
  'architecture'
];

// Add architecture to any diagramTypeAliases object if it exists
const diagramTypeAliases: Record<string, string> = {
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

// Add this function for basic server-side validation
function validateDiagramSyntax(code: string): { valid: boolean; message: string | null } {
  if (!code || code.trim() === '') {
    return { valid: false, message: 'No diagram code provided' };
  }

  // Basic syntax checks (similar to performBasicValidation in mermaidUtils.ts)
  const openBrackets = (code.match(/\{/g) || []).length;
  const closeBrackets = (code.match(/\}/g) || []).length;
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  const openSquare = (code.match(/\[/g) || []).length;
  const closeSquare = (code.match(/\]/g) || []).length;
  
  if (openBrackets !== closeBrackets) {
    return { valid: false, message: 'Unbalanced curly braces {} in diagram code' };
  }
  
  if (openParens !== closeParens) {
    return { valid: false, message: 'Unbalanced parentheses () in diagram code' };
  }
  
  if (openSquare !== closeSquare) {
    return { valid: false, message: 'Unbalanced square brackets [] in diagram code' };
  }

  // Check for valid diagram type at the beginning
  const firstLine = code.split('\n')[0].trim().toLowerCase();
  const validDiagramTypes = [
    'graph', 'flowchart', 'sequencediagram', 'classDiagram', 
    'statediagram', 'erdiagram', 'journey', 'gantt', 'pie',
    'gitgraph', 'mindmap', 'timeline', 'c4context', 'architecture-beta',
    'sankey'
  ];
  
  let hasDiagramType = false;
  for (const type of validDiagramTypes) {
    if (firstLine.includes(type)) {
      hasDiagramType = true;
      break;
    }
  }
  
  if (!hasDiagramType) {
    return { 
      valid: false, 
      message: 'Missing or invalid diagram type declaration. Diagram should start with a valid type like flowchart, erDiagram, etc.' 
    };
  }
  
  // Diagram-specific validations
  if (firstLine.includes('erdiagram')) {
    // Check for ERD relationship syntax
    const hasRelationship = code.match(/\|\|--[o|]?{|\}[o|]?--\|\|/);
    if (!hasRelationship && code.includes(' : ')) {
      return { 
        valid: false, 
        message: 'ERD diagram has relationships but is missing proper syntax (||--o{, }|--|, etc.)' 
      };
    }
  } else if (firstLine.includes('flowchart') || firstLine.includes('graph')) {
    // Check for direction
    if (!firstLine.match(/TD|BT|LR|RL/i)) {
      return { 
        valid: false, 
        message: 'Flowchart is missing direction (TD, BT, LR, or RL)' 
      };
    }
    
    // Check for node definitions
    const hasNodes = code.match(/[A-Za-z0-9_-]+\s*(\[|\(|\{|\>)/);
    if (!hasNodes) {
      return { 
        valid: false, 
        message: 'Flowchart is missing node definitions' 
      };
    }
    
    // Check for classDef syntax errors
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('classDef')) {
        // Check for common classDef syntax errors
        
        // Missing colon in style definitions
        if (line.match(/\s+fill\s+[^:]/)) {
          return {
            valid: false,
            message: `Invalid classDef syntax: Missing colon after 'fill'. Use 'fill:' instead of 'fill '`
          };
        }
        
        if (line.match(/\s+stroke\s+[^:]/)) {
          return {
            valid: false,
            message: `Invalid classDef syntax: Missing colon after 'stroke'. Use 'stroke:' instead of 'stroke '`
          };
        }
        
        if (line.match(/\s+color\s+[^:]/)) {
          return {
            valid: false,
            message: `Invalid classDef syntax: Missing colon after 'color'. Use 'color:' instead of 'color '`
          };
        }
        
        // Check for the specific "end" keyword error
        if (line.includes(' end ')) {
          return {
            valid: false,
            message: `Invalid classDef syntax: Invalid 'end' keyword. Use 'end:' or add a comma before 'end'`
          };
        }
        
        // Missing commas between style definitions
        const styleDefinitions = line.split(/\s+/).slice(2); // Skip 'classDef' and class name
        for (let j = 0; j < styleDefinitions.length; j++) {
          const def = styleDefinitions[j];
          if (j > 0 && !styleDefinitions[j-1].endsWith(',') && !def.includes(':')) {
            return {
              valid: false,
              message: `Invalid classDef syntax: Missing comma between style definitions or missing colon in '${def}'`
            };
          }
        }
      }
    }
  } else if (firstLine.includes('timeline')) {
    // Check for title and dates
    const hasTitle = code.match(/title\s+/);
    if (!hasTitle) {
      return { 
        valid: false, 
        message: 'Timeline is missing a title' 
      };
    }
    
    // Check for at least one date entry
    const hasDateEntry = code.match(/\d{4}\s*:/);
    if (!hasDateEntry) {
      return { 
        valid: false, 
        message: 'Timeline should have at least one date entry (YYYY :)' 
      };
    }
  }

  return { valid: true, message: null };
}

/**
 * Generate a fallback SVG with a message
 */
function getFallbackSvg(message: string = 'Diagram visualization is being prepared...'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 800 300">
    <rect width="100%" height="100%" fill="#F7FAFC" rx="8" ry="8" />
    <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="16px" fill="#718096">
      ${message}
    </text>
  </svg>`;
}

export async function POST(req: Request) {
  console.log('[diagrams API] Incoming request');
  
  try {
    await connectDB();
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    console.log('[diagrams API] Incoming request body:', body);
    
    const { textPrompt, diagramType, projectId, clientSvg } = body;
    
    if (!textPrompt || !diagramType || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate diagram type
    const effectiveDiagramType = diagramTypeAliases[diagramType] || diagramType;
    if (!diagramTypes.includes(effectiveDiagramType)) {
      return NextResponse.json({ error: `Unsupported diagram type: ${diagramType}` }, { status: 400 });
    }
    
    // Get user
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
    
    // Create initial fallback SVG
    const loadingSvg = getFallbackSvg(`Creating your ${effectiveDiagramType} diagram...`);
    
    // Create a new ReadableStream with improved error handling
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the initial fallback visualization immediately
          controller.enqueue(
            `data: ${JSON.stringify({ 
              mermaidSyntax: '', 
              isComplete: false, 
              fallbackSvg: loadingSvg 
            })}\n\n`
          );
          
          // Get the prompt for the diagram type
          const systemPrompt = getSystemPromptForDiagramType(effectiveDiagramType);
          const userPrompt = getPromptForDiagramType(effectiveDiagramType, textPrompt);
          
          // Enhanced system prompt with more specific instructions for problematic diagram types
          let enhancedSystemPrompt = systemPrompt + `\n\nImportant: Always start your diagram with the proper diagram type declaration.`;
          
          // Add specific instructions for problematic diagram types
          if (effectiveDiagramType === 'erd') {
            enhancedSystemPrompt += `\n\nFor ERD diagrams, always start with "erDiagram" and use proper relationship syntax like "CUSTOMER ||--o{ ORDER : places".`;
          } else if (effectiveDiagramType === 'flowchart') {
            enhancedSystemPrompt += `\n\nFor flowcharts, always start with "flowchart TD" or another direction (LR, RL, BT) and use proper node and edge syntax.`;
            
            // Add specific instructions for classDef syntax
            enhancedSystemPrompt += `\n\nWhen using classDef for styling, follow this exact syntax:
            classDef className fill:#color,stroke:#color,stroke-width:2px,color:#color
            
            Important classDef rules:
            1. Always use colons between style property and value (e.g., 'fill:#F44336' NOT 'fill #F44336')
            2. Always use commas between different style properties (e.g., 'fill:#F44336,stroke:#000')
            3. Never use spaces between property and value
            4. For the 'end' property, use 'end:value' with a colon, not 'end value'`;
          } else if (effectiveDiagramType === 'timeline') {
            enhancedSystemPrompt += `\n\nFor timeline diagrams, always start with "timeline" and use proper date and event syntax.`;
          }
          
          // Create completion with simulated streaming first
          let diagram = '';
          let completionSuccessful = false;
          
          // Function to simulate streaming for non-streaming responses
          const simulateStreaming = async (fullDiagram: string) => {
            const lines = fullDiagram.split('\n');
            let currentDiagram = '';
            
            // Send updates every few lines to simulate streaming
            for (let i = 0; i < lines.length; i++) {
              currentDiagram += lines[i] + '\n';
              
              // Send an update every 2-3 lines
              if (i > 0 && (i % 2 === 0 || i === lines.length - 1)) {
                controller.enqueue(
                  `data: ${JSON.stringify({ 
                    mermaidSyntax: currentDiagram.trim(), 
                    isComplete: false,
                    processingMessage: `Building diagram (${i}/${lines.length} lines)...`
                  })}\n\n`
                );
                
                // Add a small delay to simulate streaming
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            return currentDiagram.trim();
          };
          
          // Try different approaches in sequence with proper error handling
          try {
            // First approach: Try streaming API with a timeout
            controller.enqueue(
              `data: ${JSON.stringify({ 
                mermaidSyntax: '', 
                isComplete: false, 
                processingMessage: 'Generating diagram with streaming...' 
              })}\n\n`
            );
            
            try {
              // Set a timeout for the streaming request
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API request timed out')), 15000); // 15 second timeout
              });
              
              const completion = await Promise.race([
                anthropic.messages.create({
                  model: "claude-3-5-sonnet-20240620",
                  system: enhancedSystemPrompt,
                  messages: [
                    {
                      role: "user",
                      content: userPrompt
                    }
                  ],
                  stream: true,
                  max_tokens: 4000,
                  temperature: 0.7,
                  top_p: 0.95,
                }),
                timeoutPromise
              ]);
              
              let currentChunk = '';
              let isCollectingDiagram = false;
              let completeLines: string[] = [];
              
              for await (const chunk of completion as AsyncIterable<any>) {
                if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                  const content = chunk.delta.text;
                  currentChunk += content;
                  
                  // Check for the start of Mermaid syntax
                  if (currentChunk.includes('```mermaid') && !isCollectingDiagram) {
                    isCollectingDiagram = true;
                    // Extract only what comes after ```mermaid
                    currentChunk = currentChunk.substring(currentChunk.indexOf('```mermaid') + 10);
                    
                    // Send a processing message
                    controller.enqueue(
                      `data: ${JSON.stringify({ 
                        mermaidSyntax: '', 
                        isComplete: false, 
                        processingMessage: 'Found diagram syntax, processing...' 
                      })}\n\n`
                    );
                  }
                  
                  // Process diagram content only when we're collecting it
                  if (isCollectingDiagram) {
                    // Check if we've reached the end of the diagram
                    if (currentChunk.includes('```')) {
                      // Extract everything up to the closing backticks
                      const diagramContent = currentChunk.substring(0, currentChunk.indexOf('```'));
                      diagram = completeLines.join('\n') + (completeLines.length > 0 ? '\n' : '') + diagramContent;
                      isCollectingDiagram = false;
                      
                      // Reset for potential additional diagrams
                      currentChunk = currentChunk.substring(currentChunk.indexOf('```') + 3);
                      
                      // Process the diagram
                      completionSuccessful = true;
                      break;
                    } else if (currentChunk.includes('\n')) {
                      // Process line by line
                      const lines = currentChunk.split('\n');
                      // Keep the last line which might be incomplete
                      const lastLine = lines.pop();
                      
                      // Add complete lines to our collection
                      completeLines = [...completeLines, ...lines];
                      
                      // Reset currentChunk to just the last incomplete line
                      currentChunk = lastLine || '';
                      
                      // Send progressive updates for better UX
                      if (completeLines.length > 0 && completeLines.length % 2 === 0) {
                        const partialDiagram = completeLines.join('\n');
                        controller.enqueue(
                          `data: ${JSON.stringify({ 
                            mermaidSyntax: partialDiagram, 
                            isComplete: false,
                            processingMessage: `Building diagram (${completeLines.length} lines)...`
                          })}\n\n`
                        );
                      }
                    }
                  }
                }
              }
            } catch (streamError) {
              console.error("[diagrams API] Streaming error, trying non-streaming API with simulated streaming:", streamError);
              
              controller.enqueue(
                `data: ${JSON.stringify({ 
                  mermaidSyntax: '', 
                  isComplete: false, 
                  processingMessage: 'Streaming failed, trying alternative approach...' 
                })}\n\n`
              );
              
              // Second approach: Try non-streaming API with retries and backoff
              let retryCount = 0;
              const maxRetries = 3;
              let response;
              
              while (retryCount < maxRetries && !completionSuccessful) {
                try {
                  // Add exponential backoff
                  if (retryCount > 0) {
                    const backoffTime = Math.pow(2, retryCount) * 1000;
                    console.log(`[diagrams API] Retry ${retryCount}/${maxRetries} with backoff ${backoffTime}ms`);
                    
                    controller.enqueue(
                      `data: ${JSON.stringify({ 
                        mermaidSyntax: '', 
                        isComplete: false, 
                        processingMessage: `Retrying (attempt ${retryCount + 1}/${maxRetries})...` 
                      })}\n\n`
                    );
                    
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                  }
                  
                  // Use a different model for retries to avoid overloading the same model
                  const modelToUse = retryCount === 0 
                    ? "claude-3-5-sonnet-20240620" 
                    : "claude-3-opus-20240229";
                  
                  response = await anthropic.messages.create({
                    model: modelToUse,
                    system: enhancedSystemPrompt,
                    messages: [
                      {
                        role: "user",
                        content: userPrompt
                      }
                    ],
                    stream: false,
                    max_tokens: 4000,
                    temperature: 0.7,
                    top_p: 0.95,
                  });
                  
                  const content = response.content[0].text;
                  
                  // Extract the diagram code
                  if (content.includes('```mermaid') && content.includes('```', content.indexOf('```mermaid') + 10)) {
                    const start = content.indexOf('```mermaid') + 10;
                    const end = content.indexOf('```', start);
                    diagram = content.substring(start, end).trim();
                    
                    // Simulate streaming for better UX
                    await simulateStreaming(diagram);
                    
                    completionSuccessful = true;
                    break;
                  } else {
                    throw new Error('No mermaid diagram found in response');
                  }
                } catch (retryError) {
                  console.error(`[diagrams API] Retry ${retryCount + 1}/${maxRetries} failed:`, retryError);
                  retryCount++;
                  
                  // If we've exhausted all retries, throw the error
                  if (retryCount >= maxRetries) {
                    throw retryError;
                  }
                }
              }
            }
            
            // If we still don't have a diagram, try a fallback approach with a simpler prompt
            if (!completionSuccessful || !diagram) {
              console.log("[diagrams API] All standard approaches failed, trying fallback with simpler prompt");
              
              controller.enqueue(
                `data: ${JSON.stringify({ 
                  mermaidSyntax: '', 
                  isComplete: false, 
                  processingMessage: 'Trying simplified approach...' 
                })}\n\n`
              );
              
              // Simplify the prompt to increase chances of success
              const simplifiedPrompt = `Create a simple ${effectiveDiagramType} diagram for: ${textPrompt}`;
              
              const fallbackResponse = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",  // Use a smaller, faster model as last resort
                system: "You are an expert in creating Mermaid.js diagrams. Respond ONLY with the mermaid code for the diagram, without any explanations.",
                messages: [
                  {
                    role: "user",
                    content: simplifiedPrompt
                  }
                ],
                stream: false,
                max_tokens: 2000,
                temperature: 0.5,
              });
              
              const content = fallbackResponse.content[0].text;
              
              // Extract the diagram code
              if (content.includes('```mermaid') && content.includes('```', content.indexOf('```mermaid') + 10)) {
                const start = content.indexOf('```mermaid') + 10;
                const end = content.indexOf('```', start);
                diagram = content.substring(start, end).trim();
                
                // Simulate streaming for better UX
                await simulateStreaming(diagram);
                
                completionSuccessful = true;
              } else if (content.trim()) {
                // If no mermaid tags but we have content, try to use it directly
                diagram = content.trim();
                
                // Simulate streaming for better UX
                await simulateStreaming(diagram);
                
                completionSuccessful = true;
              }
            }
          } catch (allApproachesError: unknown) {
            console.error("[diagrams API] All approaches failed:", allApproachesError);
            throw new Error(`Failed to generate diagram after multiple attempts: ${allApproachesError instanceof Error ? allApproachesError.message : String(allApproachesError)}`);
          }
          
          // If we still don't have a diagram, return an error
          if (!completionSuccessful || !diagram) {
            throw new Error('Failed to generate diagram after all attempts');
          }
          
          // Validate and process the diagram
          const validation = validateDiagramSyntax(diagram);
          let finalDiagram = diagram;
          
          if (!validation.valid) {
            // Try to fix common issues
            finalDiagram = preprocessDiagramCode(diagram, effectiveDiagramType);
            
            // Send a warning about the fix
            controller.enqueue(
              `data: ${JSON.stringify({ 
                mermaidSyntax: finalDiagram.trim(), 
                isComplete: false,
                validationStatus: 'fixed',
                validationMessage: 'Fixed some syntax issues in the diagram'
              })}\n\n`
            );
          } else {
            controller.enqueue(
              `data: ${JSON.stringify({ 
                mermaidSyntax: finalDiagram.trim(), 
                isComplete: false,
                validationStatus: 'validated'
              })}\n\n`
            );
          }
          
          // Create a new GPT response record
          const gptResponse = await GptResponse.create({
            userId: user._id,
            prompt: textPrompt,
            response: finalDiagram,
            diagramType: effectiveDiagramType,
            projectId: project._id
          });
          
          // Add to project history
          project.history.unshift({
            diagramCode: finalDiagram,
            prompt: textPrompt,
            timestamp: new Date(),
            diagramType: effectiveDiagramType,
            updatedAt: new Date()
          });
          
          if (project.history.length > 30) {
            project.history.pop();
          }
          
          // Save the latest diagram state to the project
          project.currentDiagram = finalDiagram.trim();
          project.markModified('history');
          await project.save();
          
          // Update user's token balance
          await User.findByIdAndUpdate(user._id, {
            $inc: { wordCountBalance: -1000 }
          });
          
          // Send complete message
          controller.enqueue(
            `data: ${JSON.stringify({ 
              mermaidSyntax: finalDiagram.trim(), 
              isComplete: true,
              gptResponseId: gptResponse._id.toString()
            })}\n\n`
          );
        } catch (error) {
          console.error("[diagrams API] Processing error:", error);
          
          // Send a more user-friendly error
          controller.enqueue(
            `data: ${JSON.stringify({ 
              error: "There was a problem generating your diagram. Please try again or refine your description.",
              errorDetails: error instanceof Error ? error.message : "Unknown error",
              isComplete: true 
            })}\n\n`
          );
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
    console.error("[diagrams API] Unhandled error:", error);
    return NextResponse.json({ 
      error: "An unexpected error occurred", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

// Add this function to preprocess the diagram code
function preprocessDiagramCode(code: string, diagramType?: string): string {
  if (!code || !code.trim()) return code;
  
  let processedCode = code.trim();
  
  // Remove markdown code block syntax if present
  processedCode = processedCode.replace(/```(?:mermaid)?\n?/g, '').replace(/```$/g, '');
  
  // If no diagram type is specified at the beginning, add it
  if (diagramType) {
    const diagramTypePrefix = diagramType.toLowerCase();
    const firstLine = processedCode.split('\n')[0].trim().toLowerCase();
    
    // Map diagram type names to their correct syntax
    const typeMap: Record<string, string> = {
      'flowchart': 'flowchart TD',
      'sequence': 'sequenceDiagram',
      'sequencediagram': 'sequenceDiagram',
      'class': 'classDiagram',
      'classdiagram': 'classDiagram',
      'state': 'stateDiagram-v2',
      'statediagram': 'stateDiagram-v2',
      'er': 'erDiagram',
      'erd': 'erDiagram',
      'erdiagram': 'erDiagram',
      'entityrelationship': 'erDiagram',
      'entityrelationshipdiagram': 'erDiagram',
      'pie': 'pie',
      'journey': 'journey',
      'gantt': 'gantt',
      'mindmap': 'mindmap',
      'timeline': 'timeline',
      'sankey': 'sankey',
      'git': 'gitGraph',
      'gitgraph': 'gitGraph',
      'architecture': 'architecture-beta'
    };
    
    const correctPrefix = typeMap[diagramTypePrefix] || diagramTypePrefix;
    
    // Check if the diagram starts with the correct prefix
    let needsPrefix = true;
    
    for (const [type, prefix] of Object.entries(typeMap)) {
      if (firstLine.includes(type) || firstLine.includes(prefix)) {
        needsPrefix = false;
        break;
      }
    }
    
    if (needsPrefix) {
      processedCode = `${correctPrefix}\n${processedCode}`;
    }
    
    // Special handling for problematic diagram types
    if (diagramTypePrefix === 'erd' || diagramTypePrefix === 'erdiagram') {
      // Ensure ERD relationships use the correct syntax
      // Look for relationship lines that don't have the correct syntax
      const lines = processedCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // If line has entities but missing relationship syntax
        if (line.includes(' : ') && !line.match(/\|\|--[o|]?{|\}[o|]?--\|\|/)) {
          // Try to fix common relationship syntax issues
          lines[i] = line.replace(/(\w+)\s+:\s+(\w+)/, '$1 ||--o{ $2 : ');
        }
      }
      processedCode = lines.join('\n');
    } else if (diagramTypePrefix === 'flowchart') {
      // Ensure flowchart has a direction
      if (!firstLine.match(/TD|BT|LR|RL/i)) {
        processedCode = processedCode.replace(/^flowchart/, 'flowchart TD');
      }
      
      // Fix common arrow syntax issues
      processedCode = processedCode.replace(/-->/g, ' --> ');
      processedCode = processedCode.replace(/<--/g, ' <-- ');
      processedCode = processedCode.replace(/--/g, ' -- ');
      
      // Fix classDef syntax issues
      const lines = processedCode.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Fix classDef syntax errors
        if (line.startsWith('classDef')) {
          // The correct syntax is: classDef className styleName:styleValue,styleName:styleValue
          
          // Check for missing colons in style definitions
          if (line.includes(' fill') && !line.includes('fill:')) {
            lines[i] = line.replace(/fill\s+/g, 'fill:');
          }
          
          if (line.includes(' stroke') && !line.includes('stroke:')) {
            lines[i] = line.replace(/stroke\s+/g, 'stroke:');
          }
          
          if (line.includes(' stroke-width') && !line.includes('stroke-width:')) {
            lines[i] = line.replace(/stroke-width\s+/g, 'stroke-width:');
          }
          
          if (line.includes(' color') && !line.includes('color:')) {
            lines[i] = line.replace(/color\s+/g, 'color:');
          }
          
          // Fix missing commas between style definitions
          lines[i] = lines[i].replace(/(\w+):#([0-9A-Fa-f]+)(\s+)(\w+)/g, '$1:#$2,$4');
          
          // Fix the specific error in the query with "end" keyword
          if (line.includes(' end ')) {
            lines[i] = line.replace(/(\w+) end /, '$1,end:');
          }
        }
        
        // Fix node definition syntax
        if (line.match(/\w+\s*\[\s*\w+\s*\]/)) {
          // Ensure proper spacing in node definitions
          lines[i] = line.replace(/(\w+)\s*\[\s*(\w+)\s*\]/, '$1[$2]');
        }
      }
      processedCode = lines.join('\n');
    } else if (diagramTypePrefix === 'timeline') {
      // Ensure timeline has proper syntax
      const lines = processedCode.split('\n');
      let hasTitle = false;
      
      // Check if there's a title
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (lines[i].trim().startsWith('title ')) {
          hasTitle = true;
          break;
        }
      }
      
      // Add a title if missing
      if (!hasTitle) {
        lines.splice(1, 0, 'title Timeline');
        processedCode = lines.join('\n');
      }
    }
  }
  
  return processedCode;
} 