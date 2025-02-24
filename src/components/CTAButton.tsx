"use client";
import Link from 'next/link';

export default function CTAButton() {
  return (
    <Link href="/projects">
      <button className="cta-button px-6 py-3 md:px-12 md:py-6 bg-[#f8f4f4] font-extrabold tracking-wider text-lg md:text-2xl rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-transform duration-300 hover:scale-110 hover:shadow-[0_0_16px_rgba(16,185,129,1)]">
        <span className="bg-gradient-to-r from-[#10B981] to-[#8B5CF6] bg-clip-text text-transparent animate-gradient">
          Chat your way to diagrams
        </span>
      </button>
      <style jsx>{`
        .cta-button {
          position: relative;
          overflow: hidden;
          z-index: 0;
          border: none;
        }
        .cta-button::before {
          content: "";
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          z-index: -1;
          border-radius: inherit;
          background: transparent;
          animation: neonPulse 2s infinite alternate;
        }
        .cta-button::after {
          content: "";
          position: absolute;
          inset: 0;
          background: #f8f4f4;
          border-radius: inherit;
          z-index: -1;
        }
        
        @keyframes neonPulse {
          0% {
            box-shadow: 0 0 40px #10B981, 0 0 80px #10B981, 0 0 120px #10B981, 0 0 180px #10B981;
          }
          50% {
            box-shadow: 0 0 50px #10B981, 0 0 100px #10B981, 0 0 150px #10B981, 0 0 220px #10B981;
          }
          100% {
            box-shadow: 0 0 40px #10B981, 0 0 80px #10B981, 0 0 120px #10B981, 0 0 180px #10B981;
          }
        }
      `}</style>
    </Link>
  );
} 