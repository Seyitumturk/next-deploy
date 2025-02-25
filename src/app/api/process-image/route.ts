import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Anthropic } from '@anthropic-ai/sdk';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import sharp from 'sharp';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Maximum dimensions allowed by Claude API
const MAX_IMAGE_DIMENSION = 8000;
// Optimal dimensions for better performance (reduces latency)
const OPTIMAL_MAX_DIMENSION = 1568;
const OPTIMAL_MEGAPIXELS = 1.15; // ~1.15 million pixels

// Helper function to get diagram-specific prompts for image analysis
function getDiagramTypePrompt(diagramType: string): string {
  switch (diagramType.toLowerCase()) {
    case 'flowchart':
      return `Focus on identifying process steps, decision points, and flow connections.
      Look for visual elements that represent start and end points, and any conditional branches or loops.
      Pay attention to arrows or lines showing the flow direction between elements.`;
      
    case 'sequence':
      return `Look for actors/participants and the sequence of interactions between them.
      Identify any timeline elements, message arrows, or numbered steps that show chronological order.
      Note any swimlanes or columns that might represent different participants.`;
      
    case 'class':
      return `Look for boxes or rectangles that might represent classes, with their attributes and methods.
      Identify any lines or arrows showing relationships (inheritance, composition, association).
      Pay attention to any visual hierarchies or groupings of related elements.`;
      
    case 'entity relationship':
      return `Identify entities (usually represented as rectangles or boxes) and their attributes.
      Look for lines or connections between entities showing relationships.
      Note any symbols or notations near the connections that might indicate cardinality (one-to-many, many-to-many).`;
      
    case 'gantt':
      return `Look for horizontal bars representing tasks or activities over time.
      Identify any timeline elements, dates, or duration indicators.
      Note any dependencies shown between tasks, milestones, or task groupings.`;
      
    case 'mindmap':
      return `Identify the central concept and the hierarchical structure of related ideas.
      Look for branches radiating from a central node, and any sub-branches.
      Note any visual elements like colors or icons that might categorize different branches.`;
      
    case 'architecture':
      return `Look for system components, services, databases, and their interactions.
      Identify any layers, boundaries, or zones in the architecture.
      Note any arrows or connections showing data flows, APIs, or dependencies between components.`;
      
    case 'kanban':
      return `Look for columns representing workflow stages (e.g., To Do, In Progress, Done).
      Identify cards or items within each column representing tasks.
      Note any visual indicators of priority, assignees, or additional metadata on the cards.`;
      
    default:
      return `Look for key elements, relationships, and structures that would be relevant for a ${diagramType} diagram.
      Pay attention to any visual organization, groupings, or connections between elements.`;
  }
}

// Helper function to resize image for optimal performance with Claude
async function optimizeImageForClaude(buffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    
    // Check if we can determine dimensions
    if (!metadata.width || !metadata.height) {
      return buffer; // Can't determine size, return original
    }
    
    // First check: If image exceeds Claude's maximum allowed dimensions (8000px)
    if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
      console.log(`Image exceeds maximum allowed dimensions: ${metadata.width}x${metadata.height}`);
      
      // Calculate new dimensions while maintaining aspect ratio
      let newWidth = metadata.width;
      let newHeight = metadata.height;
      
      if (metadata.width > metadata.height && metadata.width > MAX_IMAGE_DIMENSION) {
        // Width is the larger dimension and exceeds max
        newWidth = MAX_IMAGE_DIMENSION;
        newHeight = Math.round((metadata.height / metadata.width) * MAX_IMAGE_DIMENSION);
      } else if (metadata.height > MAX_IMAGE_DIMENSION) {
        // Height is the larger dimension and exceeds max
        newHeight = MAX_IMAGE_DIMENSION;
        newWidth = Math.round((metadata.width / metadata.height) * MAX_IMAGE_DIMENSION);
      }
      
      console.log(`Resizing to ${newWidth}x${newHeight} to meet maximum dimension requirements`);
      
      // Perform the resize
      buffer = await sharp(buffer)
        .resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
      
      // Update metadata for the next check
      metadata.width = newWidth;
      metadata.height = newHeight;
    }
    
    // Second check: Optimize for performance if image is larger than recommended dimensions
    const currentMegapixels = (metadata.width * metadata.height) / 1000000;
    
    if (currentMegapixels > OPTIMAL_MEGAPIXELS || 
        metadata.width > OPTIMAL_MAX_DIMENSION || 
        metadata.height > OPTIMAL_MAX_DIMENSION) {
      
      console.log(`Optimizing image from ${metadata.width}x${metadata.height} (${currentMegapixels.toFixed(2)}MP)`);
      
      // Calculate optimal dimensions while maintaining aspect ratio
      let optimalWidth = metadata.width;
      let optimalHeight = metadata.height;
      
      // If megapixels exceed the optimal value, scale down proportionally
      if (currentMegapixels > OPTIMAL_MEGAPIXELS) {
        const scaleFactor = Math.sqrt(OPTIMAL_MEGAPIXELS / currentMegapixels);
        optimalWidth = Math.round(metadata.width * scaleFactor);
        optimalHeight = Math.round(metadata.height * scaleFactor);
      }
      
      // Ensure neither dimension exceeds OPTIMAL_MAX_DIMENSION
      if (optimalWidth > OPTIMAL_MAX_DIMENSION) {
        const aspectRatio = metadata.height / metadata.width;
        optimalWidth = OPTIMAL_MAX_DIMENSION;
        optimalHeight = Math.round(OPTIMAL_MAX_DIMENSION * aspectRatio);
      } else if (optimalHeight > OPTIMAL_MAX_DIMENSION) {
        const aspectRatio = metadata.width / metadata.height;
        optimalHeight = OPTIMAL_MAX_DIMENSION;
        optimalWidth = Math.round(OPTIMAL_MAX_DIMENSION * aspectRatio);
      }
      
      console.log(`Optimizing to ${optimalWidth}x${optimalHeight} for better performance`);
      
      // Perform the resize for optimization
      return await sharp(buffer)
        .resize(optimalWidth, optimalHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
    }
    
    // No resizing needed
    return buffer;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return buffer; // Return original on error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await connectDB();

    // Get user and check token balance
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (user.wordCountBalance < 2000) {
      return new Response(
        JSON.stringify({ error: 'Insufficient token balance' }), 
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const diagramType = formData.get('diagramType') as string;
    const extractOnly = formData.get('extractOnly') === 'true';
    
    if (!imageFile || !diagramType) {
      return new Response(
        JSON.stringify({ error: 'Missing image or diagram type' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the file is an image
    if (!imageFile.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'File is not an image' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check file size (max 5MB per Anthropic docs)
    if (imageFile.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Image file size exceeds 5MB limit' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert the image to buffer
    const bytes = await imageFile.arrayBuffer();
    let buffer = Buffer.from(bytes);
    
    // Optimize image for Claude
    buffer = await optimizeImageForClaude(buffer);
    
    // Convert to base64
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type;

    // Create the prompt for Claude based on whether we're extracting only or generating a diagram
    const systemPrompt = extractOnly 
      ? `You are an expert at analyzing images and extracting structured information from them.
Your task is to analyze the provided image and extract key information that could be used to create a ${diagramType} diagram.
Focus on identifying key elements, relationships, and structures in the image.
Provide a detailed description of what you see in the image, focusing on elements that would be relevant for a diagram.
Be specific and detailed, focusing on actual content from the image rather than generic placeholders.
DO NOT create a Mermaid diagram - just provide the extracted information in a clear, structured format that a user could use to create a diagram.`
      : `You are an expert at analyzing images and converting them into structured diagrams. 
Your task is to analyze the provided image and extract information to create a ${diagramType} diagram.
Focus on identifying key elements, relationships, and structures in the image.
Provide a detailed description of what you see in the image, and then create a Mermaid.js diagram that represents this information.`;

    // User prompt based on extraction mode with diagram-specific guidance
    const diagramTypeGuidance = getDiagramTypePrompt(diagramType);
    
    const userPrompt = extractOnly
      ? `Please analyze this image and extract the key information that would be needed to create a ${diagramType} diagram.
Describe what you see in the image in detail, focusing on elements, relationships, and structures.
${diagramTypeGuidance}
Format your response as a clear, structured description that I can use as a starting point to create a diagram.
DO NOT create a Mermaid diagram - just provide the extracted information.`
      : `Please analyze this image and create a ${diagramType} diagram that represents the information in it. 
First, describe what you see in the image in detail. 
${diagramTypeGuidance}
Then, create a Mermaid.js diagram that best represents this information.
Make sure the diagram is well-structured and follows Mermaid.js syntax for ${diagramType} diagrams.`;

    try {
      // Call Claude API with the image - using Claude 3.7 Sonnet
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 8000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ]
      });

      // Extract the response content
      const responseContent = response.content;
      
      // Extract the text content
      let textContent = '';
      for (const item of responseContent) {
        if (item.type === 'text') {
          textContent += item.text;
        }
      }

      // If we're not in extract-only mode, extract the Mermaid diagram from the response
      let mermaidDiagram = '';
      if (!extractOnly) {
        const mermaidMatch = textContent.match(/```mermaid\n([\s\S]*?)\n```/);
        if (mermaidMatch && mermaidMatch[1]) {
          mermaidDiagram = mermaidMatch[1].trim();
        }
      }

      // Extract the description (everything before the mermaid code block if present)
      let description = textContent;
      if (!extractOnly && mermaidDiagram) {
        description = textContent.substring(0, textContent.indexOf('```mermaid')).trim();
      }

      // Update user's token balance
      await User.findByIdAndUpdate(user._id, {
        $inc: { wordCountBalance: -2000 }
      });

      // Return appropriate response based on mode
      if (extractOnly) {
        return new Response(
          JSON.stringify({ 
            description: textContent,
            summary: textContent, // Include both for compatibility
            message: "Image analyzed. You can now edit the extracted information and press Enter to generate a diagram."
          }), 
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            description,
            summary: description, // Include both for compatibility
            mermaidDiagram,
            message: "Image processed. You can now describe any additional modifications you'd like to make to the diagram."
          }), 
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (error: any) {
      console.error('Error processing image with Claude API:', error);
      
      // Check for specific error types
      if (error.status === 400) {
        if (error.error?.message?.includes('dimensions exceed max allowed size')) {
          return new Response(
            JSON.stringify({ 
              error: 'Image is too large. Please use a smaller image or reduce its resolution.' 
            }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        } else if (error.error?.message?.includes('file size')) {
          return new Response(
            JSON.stringify({ 
              error: 'Image file size exceeds the maximum allowed limit.' 
            }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else if (error.status === 529 || error.status === 503) {
        return new Response(
          JSON.stringify({ 
            error: 'The AI service is currently overloaded. Please try again in a few moments.' 
          }), 
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Generic error response
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process image. Please try again or use a different image.' 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Error processing image:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error processing image' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 