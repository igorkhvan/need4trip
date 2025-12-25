#!/bin/bash
# Setup test environment with production Supabase keys
# Usage: ./setup-test-env.sh

set -e

echo "🔧 Setting up test environment with production Supabase..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local not found"
  echo "Please create .env.local with your Supabase credentials first"
  exit 1
fi

# Copy .env.local to .env.test
cp .env.local .env.test

# Add test-specific variables
echo "" >> .env.test
echo "# Test environment overrides" >> .env.test
echo "NODE_ENV=test" >> .env.test
echo "DISABLE_RATE_LIMIT=true" >> .env.test

echo "✅ .env.test created successfully"
echo ""
echo "📋 Verifying required keys:"

# Check for required keys
REQUIRED_KEYS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

MISSING=()
for KEY in "${REQUIRED_KEYS[@]}"; do
  if grep -q "^${KEY}=" .env.test; then
    echo "  ✓ $KEY"
  else
    echo "  ✗ $KEY (MISSING)"
    MISSING+=("$KEY")
  fi
done

if [ ${#MISSING[@]} -ne 0 ]; then
  echo ""
  echo "⚠️  Warning: Missing keys in .env.local:"
  for KEY in "${MISSING[@]}"; do
    echo "   - $KEY"
  done
  echo ""
  echo "💡 Find them in Supabase Dashboard → Settings → API"
  echo ""
fi

echo ""
echo "🚀 Ready to run tests:"
echo "   npm run test:billing"

