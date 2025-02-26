import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { CreateUserOnSignIn } from "@/components/CreateUserOnSignIn";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chartable - Modern Diagram Generation",
  description: "Create beautiful diagrams with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <script dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Immediately run before DOM is fully loaded
                function removeMermaidErrors() {
                  const errorSelectors = [
                    '.error-icon',
                    '.error-text',
                    '.error-message',
                    '.marker.cross',
                    'g[class*="error"]',
                    'g[class*="flowchart-error"]',
                    'g[class*="syntax-error"]',
                    'g[class*="mermaid-error"]',
                    '[id*="mermaid-error"]',
                    '.mermaid > g.error',
                    '.mermaid > svg > g.error',
                    '.mermaid-error',
                    '.diagramError',
                    '.diagram-error',
                    '.syntax-error',
                    'svg[aria-roledescription="error"]',
                    'svg[aria-roledescription="syntax-error"]'
                  ];
                  
                  errorSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                      el.remove();
                    });
                  });
                  
                  // Also remove by ID pattern
                  document.querySelectorAll('[id]').forEach(el => {
                    if (
                      el.id.includes('mermaid-error') || 
                      el.id.includes('syntax-error') || 
                      el.id.includes('flowchart-error')
                    ) {
                      el.remove();
                    }
                  });
                  
                  // Also remove by aria-roledescription
                  document.querySelectorAll('[aria-roledescription]').forEach(el => {
                    if (
                      el.getAttribute('aria-roledescription') === 'error' || 
                      el.getAttribute('aria-roledescription') === 'syntax-error'
                    ) {
                      el.remove();
                    }
                  });
                }
                
                // Run immediately
                removeMermaidErrors();
                
                // Run on DOMContentLoaded
                document.addEventListener('DOMContentLoaded', removeMermaidErrors);
                
                // Run frequently to catch any new error elements
                setInterval(removeMermaidErrors, 100);
                
                // Override the mermaid.render method if it exists
                if (typeof window !== 'undefined') {
                  window.addEventListener('load', function() {
                    if (window.mermaid && window.mermaid.render) {
                      const originalRender = window.mermaid.render;
                      window.mermaid.render = function(...args) {
                        return originalRender.apply(this, args)
                          .then(result => {
                            setTimeout(removeMermaidErrors, 0);
                            return result;
                          })
                          .catch(error => {
                            setTimeout(removeMermaidErrors, 0);
                            throw error;
                          });
                      };
                    }
                  });
                }
                
                // Create a MutationObserver to watch for new error elements
                if (typeof MutationObserver !== 'undefined') {
                  const observer = new MutationObserver(function() {
                    removeMermaidErrors();
                  });
                  
                  // Start observing once the body is available
                  if (document.body) {
                    observer.observe(document.body, { 
                      childList: true, 
                      subtree: true,
                      attributes: true,
                      attributeFilter: ['class', 'id', 'aria-roledescription']
                    });
                  } else {
                    document.addEventListener('DOMContentLoaded', function() {
                      observer.observe(document.body, { 
                        childList: true, 
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['class', 'id', 'aria-roledescription']
                      });
                    });
                  }
                }
              })();
            `
          }} />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          style={{ overflowX: 'hidden' }}
        >
          <CreateUserOnSignIn />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
