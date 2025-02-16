import React, { useState, useEffect } from 'react';

const OnboardingBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage to determine if the onboarding has already been dismissed
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-400 to-blue-500 text-white p-4 z-50 shadow-lg flex items-center justify-between"
    >
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" 
             className="h-6 w-6 mr-2" 
             fill="none" 
             viewBox="0 0 24 24" 
             stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z" />
        </svg>
        <span className="font-medium">Welcome to Chartable!</span>
        <span className="ml-2">
          Click "New Diagram" to start creating beautiful diagrams with AI.
        </span>
      </div>
      <button 
        onClick={handleDismiss} 
        className="text-white hover:text-gray-200 focus:outline-none"
      >
        Dismiss
      </button>
    </div>
  );
};

export default OnboardingBar; 