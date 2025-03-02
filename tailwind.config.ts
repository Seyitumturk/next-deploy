import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        typingDot: 'typingDot 1.4s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        typingDot: {
          '0%': { transform: 'translateY(0px)', opacity: '0.3', border: '0px' },
          '50%': { transform: 'translateY(-4px)', opacity: '1', border: '0px' },
          '100%': { transform: 'translateY(0px)', opacity: '0.3', border: '0px' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
