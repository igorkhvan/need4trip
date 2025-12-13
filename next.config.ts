import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
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
