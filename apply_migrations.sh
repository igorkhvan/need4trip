#!/bin/bash

# ============================================================================
# Apply Database Normalization Migrations via Supabase CLI
# ============================================================================

set -e  # Exit on error

SUPABASE_CLI="/opt/homebrew/bin/supabase"
PROJECT_REF="djbqwsipllhdydshuokg"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  🚀 Apply Database Normalization Migrations"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check if Supabase CLI is installed
if ! command -v $SUPABASE_CLI &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI не установлен!${NC}"
    echo "Установите: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI найден${NC}"
echo ""

# Step 1: Get Access Token
echo "─────────────────────────────────────────────────────────────────"
echo "  ШАГ 1: Access Token"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "Получите Access Token:"
echo "  1. Откройте: https://supabase.com/dashboard/account/tokens"
echo "  2. Создайте новый token или скопируйте существующий"
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_ACCESS_TOKEN не установлен${NC}"
    echo ""
    echo "Экспортируйте токен перед запуском скрипта:"
    echo "  export SUPABASE_ACCESS_TOKEN='ваш-токен'"
    echo ""
    echo "Или запустите:"
    echo "  SUPABASE_ACCESS_TOKEN='ваш-токен' ./apply_migrations.sh"
    exit 1
else
    echo -e "${GREEN}✅ SUPABASE_ACCESS_TOKEN установлен${NC}"
fi

echo ""

# Step 2: Get Database Password
echo "─────────────────────────────────────────────────────────────────"
echo "  ШАГ 2: Database Password"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "Получите Database Password:"
echo "  1. Откройте: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "  2. Скопируйте 'Database password'"
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  DB_PASSWORD не установлен${NC}"
    echo ""
    echo "Экспортируйте пароль перед запуском скрипта:"
    echo "  export DB_PASSWORD='ваш-пароль'"
    echo ""
    echo "Или запустите:"
    echo "  DB_PASSWORD='ваш-пароль' SUPABASE_ACCESS_TOKEN='токен' ./apply_migrations.sh"
    exit 1
else
    echo -e "${GREEN}✅ DB_PASSWORD установлен${NC}"
fi

echo ""

# Step 3: Link Project
echo "─────────────────────────────────────────────────────────────────"
echo "  ШАГ 3: Связывание проекта"
echo "─────────────────────────────────────────────────────────────────"
echo ""

if $SUPABASE_CLI link --project-ref $PROJECT_REF --password "$DB_PASSWORD" 2>&1; then
    echo -e "${GREEN}✅ Проект успешно связан${NC}"
else
    echo -e "${RED}❌ Ошибка при связывании проекта${NC}"
    exit 1
fi

echo ""

# Step 4: Create backup
echo "─────────────────────────────────────────────────────────────────"
echo "  ШАГ 4: Создание backup (опционально)"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "Создать backup БД перед применением миграций? (y/n)"
read -r CREATE_BACKUP

if [ "$CREATE_BACKUP" = "y" ] || [ "$CREATE_BACKUP" = "Y" ]; then
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "Создание backup: $BACKUP_FILE"
    $SUPABASE_CLI db dump > "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup создан: $BACKUP_FILE${NC}"
else
    echo "Пропускаем создание backup"
fi

echo ""

# Step 5: Apply Migrations
echo "─────────────────────────────────────────────────────────────────"
echo "  ШАГ 5: Применение миграций"
echo "─────────────────────────────────────────────────────────────────"
echo ""

MIGRATIONS=(
    "supabase/migrations/20241213_normalize_cities.sql"
    "supabase/migrations/20241213_migrate_events_city_to_fk.sql"
    "supabase/migrations/20241213_migrate_users_city_to_fk.sql"
    "supabase/migrations/20241213_migrate_clubs_city_to_fk.sql"
    "supabase/migrations/20241213_normalize_car_brands_in_users.sql"
    "supabase/migrations/20241213_normalize_currencies.sql"
)

SUCCESS_COUNT=0
TOTAL_COUNT=${#MIGRATIONS[@]}

for migration in "${MIGRATIONS[@]}"; do
    echo "──────────────────────────────────────────────────────────────"
    echo "Применяем: $(basename $migration)"
    echo "──────────────────────────────────────────────────────────────"
    
    if [ ! -f "$migration" ]; then
        echo -e "${RED}❌ Файл не найден: $migration${NC}"
        continue
    fi
    
    if $SUPABASE_CLI db execute --file "$migration"; then
        echo -e "${GREEN}✅ Успешно применена: $(basename $migration)${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}❌ Ошибка при применении: $(basename $migration)${NC}"
        echo ""
        echo "Хотите продолжить с следующей миграцией? (y/n)"
        read -r CONTINUE
        if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
            echo "Прерывание..."
            exit 1
        fi
    fi
    
    echo ""
done

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  📊 РЕЗУЛЬТАТЫ"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Успешно применено: $SUCCESS_COUNT из $TOTAL_COUNT миграций"

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo -e "${GREEN}✅ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО!${NC}"
else
    echo -e "${YELLOW}⚠️  Некоторые миграции не применены${NC}"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "  Следующие шаги:"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "1. Проверьте БД:"
echo "   $SUPABASE_CLI db remote exec 'SELECT COUNT(*) FROM cities;'"
echo ""
echo "2. Перезапустите приложение:"
echo "   npm run dev"
echo ""
echo "3. Протестируйте автокомплит городов:"
echo "   Откройте /events/create"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

