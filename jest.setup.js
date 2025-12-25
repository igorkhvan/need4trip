/**
 * Jest Setup File
 * 
 * Purpose: Configure test environment before running tests
 */

// Load environment variables from .env.test if exists
require('dotenv').config({ path: '.env.test' });

// Mock Next.js router if needed
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Set test timeout (Supabase queries can be slow)
jest.setTimeout(30000); // 30 seconds

// Global test helpers
global.console = {
  ...console,
  // Suppress console.error in tests unless needed
  error: jest.fn(),
  warn: jest.fn(),
};

