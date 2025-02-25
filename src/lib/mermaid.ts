import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
  gantt: { useMaxWidth: true },
  er: { useMaxWidth: true },
  pie: { useMaxWidth: true },
  architecture: { useMaxWidth: true },
  logLevel: 'debug',
});

// Register architecture diagram type if needed
try {
  console.log("Mermaid version:", mermaid.version());
  console.log("Supported diagram types:", mermaid.diagrams);
} catch (error) {
  console.error("Error checking mermaid configuration:", error);
}

export default mermaid; 