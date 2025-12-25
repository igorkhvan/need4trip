/**
 * Jest Configuration for Need4Trip
 * 
 * Purpose: Integration tests for Billing v4
 * Environment: Node (Supabase client-side tests)
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx',
  ],
  
  // Module name mapper (for path aliases)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/lib/services/**/*.ts',
    'src/lib/db/**/*.ts',
    'src/app/api/billing/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Verbose output
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config);

