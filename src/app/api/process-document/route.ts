import { NextRequest } from 'next/server';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const diagramType = formData.get('diagramType') as string;
    
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

    // Generate diagram prompt based on the context
    const diagramPrompt = `Based on the following content from a document, create a ${diagramType} diagram that effectively visualizes the main concepts and their relationships:\n\n${context}`;

    return new Response(
      JSON.stringify({ 
        summary: diagramPrompt,
        message: "Document processed. You can now describe any additional modifications you'd like to make to the diagram."
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error processing document' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 