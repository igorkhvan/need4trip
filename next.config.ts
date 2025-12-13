import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
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
