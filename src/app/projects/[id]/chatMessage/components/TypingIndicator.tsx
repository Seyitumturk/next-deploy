import React from 'react';

interface TypingIndicatorProps {
  isDarkMode: boolean;
  isRetrying?: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  isDarkMode,
  isRetrying = false
}) => {
  // Define colors based on dark mode
  const dotColor = isDarkMode ? 'bg-primary-dark' : 'bg-primary';
  const textColor = isDarkMode ? 'text-blue-300' : 'text-blue-600';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  
  return (
    <div className="flex flex-col">
      {/* Message that shows what's happening */}
      <div className="mb-2 flex items-center">
        {isRetrying ? (
          <>
            <div className="relative mr-2 flex items-center justify-center">
              <div className="absolute w-5 h-5 border-2 rounded-full border-blue-500 border-t-transparent animate-spin"></div>
              <div className="absolute w-3 h-3 border-2 rounded-full border-blue-300 border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <span className={`text-sm font-medium ${textColor}`}>
              Retrying diagram generation
            </span>
          </>
        ) : (
          <>
            <div className="relative mr-2">
              <div className="w-5 h-5 border-2 rounded-full border-b-transparent border-primary animate-spin"></div>
            </div>
            <span className={`text-sm font-medium ${textColor}`}>
              Generating your diagram
            </span>
          </>
        )}
      </div>
      
      {/* Extra context based on mode */}
      <div className={`text-xs ml-7 ${subTextColor}`}>
        {isRetrying 
          ? "Creating a fresh diagram with improved syntax..."
          : "Creating a beautiful visualization of your idea..."
        }
      </div>
      
      {/* Animated progress bar for a modern touch */}
      <div className="mt-3 h-0.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${isDarkMode ? 'bg-blue-500' : 'bg-primary'} rounded-full`}
          style={{ 
            width: '100%',
            animation: 'progressAnimation 2s infinite ease-in-out'
          }}
        ></div>
      </div>
      
      {/* Define animations */}
      <style jsx>{`
        @keyframes progressAnimation {
          0% { 
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}; 