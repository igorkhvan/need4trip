/**
 * Jest Setup File
 * 
 * Purpose: Configure test environment before running tests
 */

// CRITICAL: Load .env.test BEFORE any imports
// This ensures Supabase client gets the env vars during initialization
const dotenv = require('dotenv');
const result = dotenv.config({ path: '.env.test' });

if (result.error) {
  console.error('❌ Failed to load .env.test:', result.error);
  process.exit(1);
}

// Verify critical env vars are loaded
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing required env vars in .env.test:', missing);
  console.error('Run: ./tests/setup-test-env.sh');
  process.exit(1);
}

console.log('✅ Loaded .env.test:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
});

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

