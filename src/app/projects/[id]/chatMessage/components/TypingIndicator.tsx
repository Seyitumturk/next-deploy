import React from 'react';

interface TypingIndicatorProps {
  isDarkMode: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isDarkMode }) => (
  <div className="flex space-x-1.5 items-center py-1">
    <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-primary-dark' : 'bg-primary'} animate-pulse`} style={{ animationDuration: '1s', animationDelay: '0ms' }}></div>
    <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-primary-dark' : 'bg-primary'} animate-pulse`} style={{ animationDuration: '1s', animationDelay: '200ms' }}></div>
    <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-primary-dark' : 'bg-primary'} animate-pulse`} style={{ animationDuration: '1s', animationDelay: '400ms' }}></div>
  </div>
); 