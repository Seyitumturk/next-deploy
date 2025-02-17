  <div 
    className="md:hidden fixed left-0 right-0 z-50" 
    style={{ bottom: showPromptPanel ? "50vh" : "0" }}
  >
    <DiagramControls 
      showPromptPanel={showPromptPanel}
      setShowPromptPanel={setShowPromptPanel}
      scale={scale}
      setScale={setScale}
      setPosition={setPosition}
      downloadSVG={downloadSVG}
      downloadPNG={downloadPNG}
      showExportMenu={showExportMenu}
      setShowExportMenu={setShowExportMenu}
    />
  </div> 

  <div className={`relative flex-1 flex flex-col transition-all duration-300 ease-in-out ${showPromptPanel ? "md:ml-96" : "md:ml-0"}`}>
  </div> 