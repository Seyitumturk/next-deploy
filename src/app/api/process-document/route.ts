import { NextRequest } from 'next/server';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const diagramType = formData.get('diagramType') as string;
    const extractOnly = formData.get('extractOnly') === 'true';
    
    if (!file || !diagramType) {
      return new Response(
        JSON.stringify({ error: 'Missing file or diagram type' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load and process document
    const bytes = await file.arrayBuffer();
    const blob = new Blob([bytes], { type: file.type });
    let docs: Document[] = [];
    
    try {
      switch (file.type) {
        case 'application/pdf':
          const pdfLoader = new PDFLoader(blob);
          docs = await pdfLoader.load();
          break;
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          const docxLoader = new DocxLoader(blob);
          docs = await docxLoader.load();
          break;
          
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          const pptxLoader = new PPTXLoader(blob);
          docs = await pptxLoader.load();
          break;
          
        default:
          return new Response(
            JSON.stringify({ error: `Unsupported file type: ${file.type}` }), 
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
      }
    } catch (error) {
      console.error('Error loading document:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to load document' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Split into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const splits = await textSplitter.splitDocuments(docs);

    // Create vector store and add documents
    const embeddings = new OpenAIEmbeddings();
    const vectorStore = new MemoryVectorStore(embeddings);
    await vectorStore.addDocuments(splits);

    // Find relevant content sections
    const summaryQuery = "What are the main topics and concepts discussed in this document?";
    const relevantDocs = await vectorStore.similaritySearch(summaryQuery, 5);
    
    // Extract key concepts and relationships
    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

    // Use OpenAI to analyze the document content and extract relevant information for the diagram
    const promptForDiagramType = getDiagramTypePrompt(diagramType);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing documents and extracting structured information to create ${diagramType} diagrams. 
          Extract the most relevant information from the document that would be useful for creating a ${diagramType} diagram.
          Be specific and detailed, focusing on actual content from the document rather than generic placeholders.`
        },
        {
          role: "user",
          content: `I need to create a ${diagramType} diagram based on this document content. 
          Please analyze the following document content and extract the key information needed for the diagram:
          
          ${context}
          
          ${promptForDiagramType}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const extractedInfo = completion.choices[0].message.content;

    // Return appropriate response based on extractOnly flag
    if (extractOnly) {
      return new Response(
        JSON.stringify({ 
          summary: extractedInfo,
          message: "Document analyzed. You can now edit the extracted information and press Enter to generate a diagram."
        }), 
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // This branch would handle direct diagram generation if needed
      return new Response(
        JSON.stringify({ 
          summary: extractedInfo,
          message: "Document processed. The diagram will be generated automatically."
        }), 
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error processing document' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to get diagram-specific prompts
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
      Focus on specific details from the document rather than generic placeholders.`;
  }
} 