import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { OpenAI } from 'openai';
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';

// Define the DiagramDefinition interface
interface DiagramDefinition {
  description: string;
  // You can add other properties if needed.
}

// Define the interface for the diagram config
interface DiagramConfig {
  definitions: Record<string, DiagramDefinition>;
  prompts: {
    system_template: string;
    user_template: string;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

// Load diagram definitions from YAML file
const diagramConfigPath = path.join(process.cwd(), 'src/config/diagram-definitions.yml');
// Cast the parsed config to DiagramConfig
const diagramConfig = yaml.parse(fs.readFileSync(diagramConfigPath, 'utf8')) as DiagramConfig;

// Create a description of available diagram types from the config
const diagramTypes = Object.entries(diagramConfig.definitions)
  .map(([type, def]) => `${type}: ${def.description.split('\n')[0]}`)
  .join('\n');

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a diagram type detection expert. Your task is to analyze the user's request and determine the most appropriate diagram type from the available options. Choose the single best matching type.

Available diagram types:
${diagramTypes}

Respond with ONLY the diagram type name, nothing else. For example: "flowchart" or "sequence" or "class".`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const diagramType = completion.choices[0]?.message?.content?.toLowerCase().trim();

    if (!diagramType || !diagramConfig.definitions[diagramType]) {
      return NextResponse.json({ error: 'Could not determine diagram type' }, { status: 400 });
    }

    return NextResponse.json({ diagramType });
  } catch (error) {
    console.error('Error detecting diagram type:', error);
    return NextResponse.json(
      { error: 'Failed to detect diagram type' },
      { status: 500 }
    );
  }
} 