import { NextRequest, NextResponse } from 'next/server';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = '';
    
    // Process based on file type
    switch (file.type) {
      case 'application/pdf':
        const pdfLoader = new PDFLoader(buffer);
        const pdfDocs = await pdfLoader.load();
        text = pdfDocs.map(doc => doc.pageContent).join('\n');
        break;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxLoader = new DocxLoader(buffer);
        const docxDocs = await docxLoader.load();
        text = docxDocs.map(doc => doc.pageContent).join('\n');
        break;
        
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        const pptxLoader = new PPTXLoader(buffer);
        const pptxDocs = await pptxLoader.load();
        text = pptxDocs.map(doc => doc.pageContent).join('\n');
        break;
        
      default:
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
} 