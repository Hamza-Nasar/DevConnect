import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Force serverful deployment on Railway (not serverless)
  ...(process.env.RAILWAY_PROJECT_ID && {
    output: undefined, // Don't set output to 'standalone' or 'export'
    experimental: {
      serverComponentsExternalPackages: [],
    },
  }),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    // Railway detection environment variables
    RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
    RAILWAY_ENVIRONMENT_ID: process.env.RAILWAY_ENVIRONMENT_ID,
    RAILWAY_SERVICE_ID: process.env.RAILWAY_SERVICE_ID,
    RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
    // Deployment environment detection
    DEPLOYMENT_PLATFORM: process.env.RAILWAY_PROJECT_ID ? 'railway' : process.env.VERCEL ? 'vercel' : 'unknown',
  },
};

export default nextConfig;
