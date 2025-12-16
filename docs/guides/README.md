# 📖 Guides - Руководства

Пошаговые инструкции по различным задачам в Need4Trip.

---

## 📋 Доступные руководства

### 1. [Telegram Setup](./telegram-setup.md)
Настройка Telegram Login Widget:
- Создание бота через BotFather
- Настройка домена
- Интеграция виджета
- Обработка callback

### 2. Database Migrations (создать)
Работа с миграциями базы данных:
- Создание новой миграции
- Применение миграций
- Rollback миграций
- Best practices

### 3. Deployment (создать)
Деплой приложения:
- Vercel deployment
- Environment variables
- Database setup
- Domain configuration

---

## 🚀 Quick Guides

### Создание нового компонента

```bash
# 1. Create component file
touch src/components/ui/my-component.tsx

# 2. Write component
export function MyComponent() {
  return <div>...</div>;
}

# 3. Export from index
# Add to src/components/ui/index.ts
```

### Создание новой страницы

```bash
# 1. Create page directory
mkdir src/app/my-page

# 2. Create page.tsx
touch src/app/my-page/page.tsx

# 3. Write Server Component
export default async function MyPage() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Создание нового API endpoint

```bash
# 1. Create route directory
mkdir -p src/app/api/my-resource

# 2. Create route.ts
touch src/app/api/my-resource/route.ts

# 3. Write handlers
export async function GET(request: Request) {
  return respondSuccess(data);
}

export async function POST(request: Request) {
  return respondSuccess(created, undefined, 201);
}
```

---

## 🗄️ Database Operations

### Создание миграции

```bash
# 1. Create migration file
touch supabase/migrations/YYYYMMDD_description.sql

# 2. Write SQL
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

# 3. Apply via Supabase Dashboard
```

### Добавление RLS политики

```sql
-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can read own records"
ON my_table
FOR SELECT
USING (auth.uid() = user_id);
```

---

## 🔐 Authentication

### Проверка авторизации в API

```typescript
import { getCurrentUser } from '@/lib/auth/currentUser';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new UnauthorizedError("Login required");
  }
  
  // Continue with authenticated user
}
```

### Защита страницы

```typescript
import { ProtectedPage } from '@/components/auth/protected-page';

export default async function MyPage() {
  return (
    <ProtectedPage>
      <div>Protected content</div>
    </ProtectedPage>
  );
}
```

---

## 💳 Billing Integration

### Проверка лимитов клуба

```typescript
import { enforceClubAction } from '@/lib/services/accessControl';

await enforceClubAction({
  clubId,
  action: "CLUB_CREATE_EVENT",
  context: {
    eventParticipantsCount: 120,
    isPaidEvent: true,
  },
});

// Throws PaywallError if limit exceeded
```

### Использование плана на фронтенде

```typescript
import { useClubPlan } from '@/hooks/use-club-plan';

const { plan, limits, loading } = useClubPlan(clubId);

if (loading) return <Spinner />;

const maxAllowed = limits?.maxEventParticipants ?? 15;
```

---

## 🎨 Styling Components

### Unified Input Styling

```tsx
<Input 
  className={cn(
    "unified-input",
    error && "border-red-500 focus:border-red-500"
  )}
/>
```

### Consistent Card Styling

```tsx
<Card className="border border-[#E5E7EB] p-6 shadow-sm">
  <CardContent>...</CardContent>
</Card>
```

---

## 🧪 Testing

### Manual Testing Flow

```bash
# 1. Start dev server
npm run dev

# 2. Test feature
# - Create test data
# - Perform actions
# - Verify results

# 3. Check logs
# - Browser console
# - Server logs
# - Network tab
```

### Database Testing

```sql
-- Create test club
INSERT INTO clubs (name, owner_id)
VALUES ('Test Club', 'user_id');

-- Set plan
INSERT INTO club_subscriptions (club_id, plan_id, status)
VALUES ('club_id', 'club_50', 'active');

-- Test limits
-- Try creating event with 51 participants
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** Build fails with TypeScript error  
**Solution:** Run `npm run build` and fix type errors

**Issue:** Database query fails  
**Solution:** Check RLS policies and auth state

**Issue:** Page not loading  
**Solution:** Check server logs for errors

**Issue:** Styling not applied  
**Solution:** Check Tailwind classes and imports

---

## 📚 Related Docs

- **[Architecture](../architecture/)** - Общая архитектура
- **[Development](../development/)** - Правила разработки
- **[Billing](../billing/)** - Платежная система

---

**Last Updated:** 16 декабря 2024
