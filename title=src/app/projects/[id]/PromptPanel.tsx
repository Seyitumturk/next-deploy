  <button
    onClick={() => setShowPromptPanel(!isVisible)}
    className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
    title={isVisible ? "Collapse Panel" : "Expand Panel"}
  >
    {isVisible ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none" />
        <path d="M14 8l-4 4 4 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none" />
        <path d="M10 8l4 4-4 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button> 