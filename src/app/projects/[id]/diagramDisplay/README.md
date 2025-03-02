# Diagram Display Module

This module provides components and utilities for displaying, interacting with, and exporting diagrams (particularly SVG diagrams generated from Mermaid).

## Components

### DiagramDisplay

The main component that orchestrates the display of diagrams with controls for zooming, panning, and exporting.

```tsx
<DiagramDisplay
  svgOutput={svgString}
  versionId="unique-version-id"
  scale={1}
  position={{ x: 0, y: 0 }}
  isDragging={false}
  currentTheme="default"
  renderError={null}
  isDownloading={null}
  diagramRef={diagramRef}
  svgRef={svgRef}
  onScaleChange={setScale}
  onPositionChange={setPosition}
  onDraggingChange={setIsDragging}
  onThemeChange={changeTheme}
  onResetView={resetView}
  onDownloadSVG={downloadSVG}
  onDownloadPNG={downloadPNG}
  isDarkMode={false}
/>
```

### DiagramRenderer

Renders an SVG diagram with proper handling of SVG content.

```tsx
<DiagramRenderer
  svgOutput={svgString}
  versionId="unique-version-id"
/>
```

### DiagramControls

Provides controls for changing themes and exporting diagrams.

```tsx
<DiagramControls
  currentTheme="default"
  isDownloading={null}
  downloadSVG={downloadSVG}
  downloadPNG={downloadPNG}
  changeTheme={changeTheme}
  isDarkMode={false}
/>
```

### ZoomControls

Provides controls for zooming in, zooming out, and resetting the view.

```tsx
<ZoomControls
  scale={1}
  setScale={setScale}
  resetView={resetView}
  isDarkMode={false}
/>
```

## Hooks

### useDiagramExport

A hook for handling diagram exports in SVG and PNG formats.

```tsx
const {
  isDownloading,
  downloadSVG,
  downloadPNG,
  exportSVGString,
  exportPNGDataUrl
} = useDiagramExport(svgRef, {
  diagramTitle: 'my-diagram',
  onExportStart: () => console.log('Export started'),
  onExportComplete: () => console.log('Export completed'),
  onExportError: (error) => console.error('Export error:', error)
});
```

### useDiagramState

A hook for managing diagram state including theme, scale, position, and error handling.

```tsx
const {
  theme,
  scale,
  position,
  isDragging,
  renderError,
  changeTheme,
  setScale,
  setPosition,
  setIsDragging,
  setRenderError,
  resetView
} = useDiagramState({
  initialTheme: 'default',
  initialScale: 1,
  initialPosition: { x: 0, y: 0 },
  onThemeChange: (theme) => console.log('Theme changed:', theme)
});
```

## Utilities

### SVG Utilities (`svgUtils.ts`)

- `getSvgDimensions(svgElement)`: Gets the dimensions of an SVG element
- `ensureSvgDimensions(svgElement)`: Ensures an SVG element has proper dimensions
- `optimizeSvgForDisplay(svgElement)`: Optimizes an SVG for display by removing scripts and event handlers
- `svgStringToElement(svgString)`: Converts an SVG string to an SVG element
- `svgElementToString(svgElement)`: Converts an SVG element to a string

### Interaction Utilities (`interactionUtils.ts`)

- `setupSvgInteractions(container, options)`: Sets up event handlers for zooming and panning
- `calculateFitToViewScale(svgWidth, svgHeight, containerWidth, containerHeight)`: Calculates the scale needed to fit a diagram in a container
- `calculateCenterPosition(svgWidth, svgHeight, containerWidth, containerHeight, scale)`: Calculates the position needed to center a diagram

## Example Usage

See the `examples/DiagramDisplayExample.tsx` file for a complete example of how to use the components and hooks together.

## Integration with Mermaid

This module is designed to work with SVG output from Mermaid diagrams, but it can be used with any SVG content. To integrate with Mermaid:

1. Render your Mermaid diagram to get the SVG output
2. Pass the SVG output to the `DiagramDisplay` component
3. Use the hooks and utilities to manage the diagram state and interactions

```tsx
// Example of rendering a Mermaid diagram and displaying it
import mermaid from 'mermaid';
import { DiagramDisplay, useDiagramState, useDiagramExport } from './diagramDisplay';

// Initialize mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// Render the diagram
const renderDiagram = async (code) => {
  try {
    const { svg } = await mermaid.render('diagram-id', code);
    setSvgOutput(svg);
  } catch (error) {
    setRenderError('Failed to render diagram');
  }
};
``` 