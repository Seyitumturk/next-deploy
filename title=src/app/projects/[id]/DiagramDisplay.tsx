  <div>
    <div 
      className="md:hidden fixed left-0 right-0 z-50" 
      style={{ bottom: props.showPromptPanel ? "50vh" : "0" }}
    >
      <DiagramControls 
        showPromptPanel={props.showPromptPanel}
        setShowPromptPanel={props.setShowPromptPanel}
        scale={props.scale}
        setScale={props.setScale}
        setPosition={props.setPosition}
        downloadSVG={props.downloadSVG}
        downloadPNG={props.downloadPNG}
        showExportMenu={props.showExportMenu}
        setShowExportMenu={props.setShowExportMenu}
      />
    </div>

    <div className={`relative flex-1 flex flex-col transition-all duration-300 ease-in-out ${props.showPromptPanel ? "md:ml-96" : "md:ml-0"}`}>
    </div>
  </div>