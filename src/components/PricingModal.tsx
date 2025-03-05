import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe('pk_live_51QHQyyJrIw0vuTAiVo4Lr92EKKA38XTXbZrCYapZbObdoe3YkYFjIdFxiGCIqqoJV3CN3V5inNMvCZtorn3SHNqr00x0PCu1wU');

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  isDarkMode: boolean;
}

export default function PricingModal({ isOpen, onClose, currentCredits, isDarkMode }: PricingModalProps) {
  const router = useRouter();
  const pricingTableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load Stripe.js Pricing Table script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/pricing-table.js';
    script.async = true;
    
    // Wait for script to load before adding the pricing table
    script.onload = () => {
      if (pricingTableContainerRef.current) {
        // Clear existing content to avoid duplicates
        pricingTableContainerRef.current.innerHTML = '';
        
        // Create and add the pricing table element
        const pricingTable = document.createElement('stripe-pricing-table');
        pricingTable.setAttribute('pricing-table-id', 'prctbl_1QzLmxJrIw0vuTAiYguWSJwi');
        pricingTable.setAttribute('publishable-key', 'pk_live_51QHQyyJrIw0vuTAiVo4Lr92EKKA38XTXbZrCYapZbObdoe3YkYFjIdFxiGCIqqoJV3CN3V5inNMvCZtorn3SHNqr00x0PCu1wU');
        
        pricingTableContainerRef.current.appendChild(pricingTable);
      }
    };
    
    document.body.appendChild(script);

    return () => {
      // Clean up script when modal closes
      const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className={`relative w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden ${
        isDarkMode ? 'bg-[#181818] text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200/20 transition-colors z-10"
          aria-label="Close pricing modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center">
          <h2 className="text-3xl font-bold mb-2">Upgrade Your Credits</h2>
          <p className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
            Choose a plan to increase your available credits and unlock more features.
          </p>
          <div className="mt-3 inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-medium">
            Current Credits: {currentCredits.toLocaleString()}
          </div>
        </div>

        {/* Stripe Pricing Table */}
        <div className="px-6 pb-8" ref={pricingTableContainerRef}>
          {/* The stripe-pricing-table will be inserted here dynamically */}
        </div>
      </div>
    </div>
  );
} 