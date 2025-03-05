import { NextResponse } from 'next/server';
import { PlaywrightWebBaseLoader } from '@langchain/community/document_loaders/web/playwright';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get diagram-specificc promptsdddddddddd
function getDiagramTypePrompt(diagramType: string): string {
  switch (diagramType.toLowerCase()) {
    case 'flowchart':
      return `Extract the process steps, decision points, and flow connections. 
      Identify the start and end points, and any conditional branches or loops.`;
      
    case 'sequence':
      return `Identify the actors/participants and the sequence of interactions between them.
      Extract the chronological order of events, messages passed between participants, and any important conditions or notes.`;
      
    case 'class':
      return `Identify classes, their attributes, methods, and relationships (inheritance, composition, association).
      Extract any class hierarchies, interfaces, and important design patterns mentioned.`;
      
    case 'entity relationship':
      return `Identify entities, their attributes, and relationships between entities.
      Extract cardinality information (one-to-many, many-to-many) and any constraints mentioned.`;
      
    case 'gantt':
      return `Extract project tasks, their durations, dependencies, and milestones.
      Identify start and end dates, task owners, and any parallel activities.`;
      
    case 'mindmap':
      return `Identify the central concept and the hierarchical structure of related ideas.
      Extract main branches, sub-branches, and any cross-connections between concepts.`;
      
    case 'architecture':
      return `Identify system components, services, databases, and their interactions.
      Extract data flows, APIs, user interfaces, and any technology stack information.`;
      
    case 'kanban':
      return `Identify workflow stages (e.g., To Do, In Progress, Done) and the tasks in each stage.
      Extract any task priorities, assignees, or additional metadata.`;
      
    default:
      return `Extract the key elements, relationships, and structure that would be relevant for a ${diagramType} diagram.
      Focus on specific details from the website rather than generic placeholders.`;
  }
}

export async function POST(request: Request) {
  try {
    const { url, diagramType, extractOnly } = await request.json();
    
    if (!url || !diagramType) {
      return NextResponse.json({ error: 'Missing url or diagramType' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const loader = new PlaywrightWebBaseLoader(url, {
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Add these args for deployment
      },
      gotoOptions: {
        waitUntil: 'domcontentloaded',
        timeout: 30000, // Add reasonable timeout
      },
      // Evaluate function returns the text content from the page,
      // and optimizes the text by removing extra whitespace and unwanted symbols.
      async evaluate(page, _browser, _response) {
        let textContent = await page.evaluate(() => document.body.innerText);
        // Remove excessive whitespace.
        textContent = textContent.replace(/\s+/g, ' ').trim();
        // Remove any non-alphanumeric characters except basic punctuation.
        textContent = textContent.replace(/[^\w\s.,!?-]/g, '');
        return textContent;
      }
    });

    const docs = await loader.load();
    if (!docs || docs.length === 0) {
      return NextResponse.json({ error: 'No content extracted from website' }, { status: 500 });
    }

    // Get the extracted content
    const extractedContent = docs[0].pageContent;
    
    // Use OpenAI to analyze the website content and extract relevant information for the diagram
    const promptForDiagramType = getDiagramTypePrompt(diagramType);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing website content and extracting structured information to create ${diagramType} diagrams. 
          Extract the most relevant information from the website that would be useful for creating a ${diagramType} diagram.
          Be specific and detailed, focusing on actual content from the website rather than generic placeholders.`
        },
        {
          role: "user",
          content: `I need to create a ${diagramType} diagram based on this website content. 
          Please analyze the following content and extract the key information needed for the diagram:
          
          ${extractedContent}
          
          ${promptForDiagramType}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const extractedInfo = completion.choices[0].message.content;
    
    // Create a preview of the extracted content
    const summaryLength = 500;
    const contentPreview = extractedContent.length > summaryLength 
      ? extractedContent.slice(0, summaryLength) + '...'
      : extractedContent;
    
    // Return appropriate response based on extractOnly flag
    if (extractOnly) {
      return NextResponse.json({ 
        summary: extractedInfo,
        message: `Website content successfully loaded. Preview: ${contentPreview.slice(0, 100)}...`
      });
    } else {
      return NextResponse.json({ 
        summary: extractedInfo,
        message: "Website processed. The diagram will be generated automatically."
      });
    }
  } catch (error) {
    console.error("Error processing website:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error processing website',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
} 