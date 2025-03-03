/**
 * Collection of utility functions for manipulating and processing diagrams
 */

/**
 * Sanitizes a Gantt diagram to ensure proper formatting
 * Adds missing headers and section if needed
 */
export function sanitizeGanttDiagram(diagramText: string): string {
  // Add missing gantt header if needed
  let sanitized = diagramText;
  if (!sanitized.trim().startsWith('gantt')) {
    sanitized = `gantt\n${sanitized}`;
  }

  // Check if there's a dateFormat definition
  if (!sanitized.includes('dateFormat')) {
    sanitized = sanitized.replace('gantt', 'gantt\n    dateFormat YYYY-MM-DD');
  }

  // Check if there's at least one section
  if (!sanitized.includes('section')) {
    sanitized += '\n    section Tasks';
  }

  return sanitized;
}

/**
 * Extracts the valid contents of a mermaid diagram from text
 * that might contain additional content
 */
export function extractMermaidContent(text: string, diagramType: string): string {
  // Look for content between specified delimiters if present
  const mermaidRegExp = /```(?:mermaid)?\s*([\s\S]*?)```/;
  const match = text.match(mermaidRegExp);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no delimiters, try to extract based on diagram type keywords
  const diagramTypeKeywords = {
    'flowchart': /(?:graph|flowchart)\s+(?:TB|BT|RL|LR|TD)/i,
    'sequenceDiagram': /sequenceDiagram/i,
    'classDiagram': /classDiagram/i,
    'stateDiagram': /stateDiagram(?:-v2)?/i,
    'erDiagram': /erDiagram/i,
    'gantt': /gantt/i,
    'pie': /pie/i,
    'timeline': /timeline/i,
    'mindmap': /mindmap/i,
    'journey': /journey/i
  };
  
  const typeKeyword = diagramTypeKeywords[diagramType as keyof typeof diagramTypeKeywords];
  if (typeKeyword) {
    const lines = text.split('\n');
    let startIndex = -1;
    
    // Find the start of the diagram
    for (let i = 0; i < lines.length; i++) {
      if (typeKeyword.test(lines[i])) {
        startIndex = i;
        break;
      }
    }
    
    if (startIndex >= 0) {
      return lines.slice(startIndex).join('\n');
    }
  }
  
  // If no structured content found, return the original text
  return text;
}

/**
 * Verifies if a string contains valid mermaid diagram syntax
 */
export function isValidMermaidSyntax(text: string): boolean {
  // Check if text contains any known mermaid diagram type syntax
  const mermaidPatterns = [
    /(?:graph|flowchart)\s+(?:TB|BT|RL|LR|TD)/i, // Flowchart
    /sequenceDiagram/i,                          // Sequence diagram
    /classDiagram/i,                             // Class diagram
    /stateDiagram(?:-v2)?/i,                     // State diagram
    /erDiagram/i,                                // ER diagram
    /gantt/i,                                    // Gantt chart
    /pie/i,                                      // Pie chart
    /timeline/i,                                 // Timeline
    /mindmap/i,                                  // Mindmap
    /journey/i                                   // User journey
  ];
  
  return mermaidPatterns.some(pattern => pattern.test(text));
}

/**
 * Returns a template for a new diagram based on the diagram type
 */
export function getNewDiagramTemplate(diagramType: string): string {
  switch (diagramType.toLowerCase()) {
    case 'flowchart':
      return 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]';
    case 'sequence':
      return 'sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob, how are you?\n    B->>A: I am good thanks!';
    case 'class':
      return 'classDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    class Dog {\n        +bark()\n    }\n    Animal <|-- Dog';
    case 'state':
      return 'stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> Still\n    Moving --> Crash\n    Crash --> [*]';
    case 'er':
      return 'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains';
    case 'gantt':
      return 'gantt\n    title A Gantt Diagram\n    dateFormat YYYY-MM-DD\n    section Section\n    A task           :a1, 2023-01-01, 30d\n    Another task     :after a1, 20d';
    case 'pie':
      return 'pie title Pie Chart\n    "A" : 25\n    "B" : 35\n    "C" : 40';
    case 'mindmap':
      return 'mindmap\n    root((Mind Map))\n        Topic 1\n            Subtopic 1\n            Subtopic 2\n        Topic 2\n            Subtopic 3';
    case 'journey':
      return 'journey\n    title User Journey\n    section Sign up\n        Create account: 5: Me\n        Login: 3: Me\n    section Use app\n        Do something: 5: Me';
    case 'architecture':
      return 'architecture-beta\n    group cloud_infra(cloud)[Cloud Infrastructure]\n\n    service api_gateway(internet)[API Gateway] in cloud_infra\n    service webserver(server)[Web Server] in cloud_infra\n    service auth_service(server)[Auth Service] in cloud_infra\n    service database(database)[Database] in cloud_infra\n    service storage(disk)[Storage] in cloud_infra\n\n    api_gateway:B -- T:webserver\n    webserver:R -- L:auth_service\n    auth_service:B -- T:database\n    webserver:B -- T:database\n    webserver:L -- R:storage';
    default:
      return 'graph TD\n    A[Start] --> B[Process]\n    B --> C[End]';
  }
} 