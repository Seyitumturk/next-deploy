import { NextResponse } from 'next/server';
import { PlaywrightWebBaseLoader } from '@langchain/community/document_loaders/web/playwright';

export async function POST(request: Request) {
  try {
    const { url, diagramType } = await request.json();
    if (!url || !diagramType) {
      return NextResponse.json({ error: 'Missing url or diagramType' }, { status: 400 });
    }

    // Instantiate the loader for the given URL.
    const loader = new PlaywrightWebBaseLoader(url, {
      launchOptions: {
        headless: true,
      },
      gotoOptions: {
        waitUntil: 'domcontentloaded',
      },
      // Evaluate function returns the text content from the page,
      // and optimizes the text by removing extra whitespace and unwanted symbols.
      async evaluate(page, browser, response) {
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

    // Create a more meaningful summary by taking the first 500 characters.
    const extractedContent = docs[0].pageContent;
    const summaryLength = 500;
    const summary = extractedContent.length > summaryLength 
      ? extractedContent.slice(0, summaryLength) + '...'
      : extractedContent;
    const message = `Website content successfully loaded. Preview: ${summary}`;

    return NextResponse.json({ summary, message });
  } catch (error) {
    console.error("Error processing website:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error processing website' }, { status: 500 });
  }
} 