import type { NextConfig } from "next";

// Security Headers (CSP + additional protection)
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
      "frame-src https://telegram.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  }
];

const nextConfig: NextConfig = {
  /* config options here */
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  
  // Add empty turbopack config to silence Next.js 16 warning
  // Our webpack config works fine under Turbopack without explicit configuration
  turbopack: {},
  
  // Exclude figma directory from compilation
  // This directory contains design reference files only
  webpack: (config, { isServer }) => {
    // Ignore the figma directory
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/figma/**'],
    };
    
    return config;
  },
};

export default nextConfig;
