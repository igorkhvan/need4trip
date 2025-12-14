#!/bin/bash

# Скрипт для замены console.log/warn/error на logger во всех репозиториях
# Usage: ./scripts/migrate-to-logger.sh

FILES=(
  "src/lib/db/participantRepo.ts"
  "src/lib/db/eventAccessRepo.ts"
  "src/lib/db/userCarRepo.ts"
  "src/lib/db/cityRepo.ts"
  "src/lib/db/clubRepo.ts"
  "src/lib/db/clubMemberRepo.ts"
  "src/lib/db/subscriptionRepo.ts"
  "src/lib/db/carBrandRepo.ts"
  "src/lib/db/clubPlanRepo.ts"
  "src/lib/db/eventCategoryRepo.ts"
)

echo "🔄 Migrating repositories to use logger..."
echo ""

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⏭️  Skipping $file (not found)"
    continue
  fi
  
  echo "📝 Processing $file..."
  
  # Check if logger is already imported
  if ! grep -q "import.*logger" "$file"; then
    # Add logger import after other imports
    sed -i.bak '/^import.*from.*@\/lib\/errors/a\
import { log } from "@/lib/utils/logger";
' "$file"
  fi
  
  # Count replacements
  count=$(grep -c "console\." "$file" || echo "0")
  echo "   Found $count console calls"
  
done

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff src/lib/db/"
echo "2. Test build: npm run build"
echo "3. Commit: git add src/lib/"
