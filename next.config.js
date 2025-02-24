/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add rule for Playwright font files
    config.module.rules.push({
      test: /\.(ttf|woff|woff2|eot)$/,
      type: 'asset/resource',
    });
    return config;
  },
  // Moved key: specify external packages that must be bundled on the server
  serverExternalPackages: ['playwright-core'],
  experimental: {
    typedRoutes: true, // Enable typed routes (keep this experimental flag)
  },
  // Environment variables loading
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // Bypass TypeScript errors during production build (not recommended for production)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Bypass ESLint errors during production build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 