# Need4Trip - Техническое задание для Cursor AI

> **Дата:** 13 декабря 2024  
> **Версия:** 1.0  
> **Цель:** Реализация полной системы тарификации, профилей, и доработка существующей функциональности

---

## 📋 СОДЕРЖАНИЕ

1. [Анализ текущей архитектуры](#анализ-текущей-архитектуры)
2. [Задачи к реализации](#задачи-к-реализации)
3. [Архитектурные рекомендации](#архитектурные-рекомендации)
4. [Потенциальные проблемы](#потенциальные-проблемы)
5. [План разработки](#план-разработки)

---

## 🔍 АНАЛИЗ ТЕКУЩЕЙ АРХИТЕКТУРЫ

### ✅ Что УЖЕ реализовано

#### Database Schema
```
✓ clubs                  - Таблица клубов
✓ club_members           - Участники с ролями (owner/organizer/member/pending)
✓ club_subscriptions     - Подписки клубов (plan: club_free/club_basic/club_pro)
✓ users.plan             - Личный план пользователя (free/pro)
✓ events.club_id         - Связь события с клубом
✓ events.visibility      - public/unlisted/restricted
✓ cities                 - Справочник городов (Россия + Казахстан, 60 городов)
✓ currencies             - Справочник валют (14 валют)
✓ car_brands             - Справочник марок авто
✓ users.city_id          - FK на cities
✓ events.city_id         - FK на cities (обязательное поле)
✓ clubs.city_id          - FK на cities
```

#### Backend
```
✓ Permissions Engine     - src/lib/services/permissions.ts (686 строк)
✓ Club Service           - src/lib/services/clubs.ts
✓ Subscription Service   - src/lib/services/subscriptions.ts
✓ 3 Repositories         - clubRepo, clubMemberRepo, subscriptionRepo
✓ 7 API endpoints        - /api/clubs/*, /api/profile, /api/profile/plan
✓ City Autocomplete      - унифицированный компонент выбора города
✓ MultiBrandSelect       - выбор марок авто
```

#### Frontend
```
✓ 7 Club компонентов     - ClubCard, ClubForm, ClubMembersList, etc.
✓ 5 Pages                - /clubs, /clubs/create, /clubs/[id], /clubs/[id]/manage, /profile
✓ Дизайн-система         - унифицированные стили, colors, spacing
```

#### Business Logic
```
✓ Лимиты событий:
  - Free user: 1 активное личное событие
  - Pro user: ∞ событий + платные
  - Club Free: 1 событие
  - Club Basic: 3 события  
  - Club Pro: ∞ событий
  
✓ Валидация прав:
  - canCreateEvent()
  - canEditEvent()
  - canViewEvent()
  - canManageClub()
```

### ❌ Что НЕ реализовано / требует доработки

1. **Таблица club_plans отсутствует** (но есть club_subscriptions.plan)
2. **Profile Edit** - нет страницы редактирования профиля
3. **UserCard компонент** - нет универсального компонента карточки пользователя
4. **Pricing Page** - нет страницы тарифов
5. **Paywall Modal** - нет модального окна ограничений
6. **404 Page** - дефолтная страница Next.js
7. **City интеграция в Profile** - город не отображается в профиле (хотя есть в БД)
8. **Сортировка событий по городам** - фильтр есть, но не оптимизирован
9. **CSV Export** - функционал не реализован
10. **Telegram Bot Settings** - не реализовано

---

## 🎯 ЗАДАЧИ К РЕАЛИЗАЦИИ

### 1. Тарифная система (Club Plans)

#### 1.1 База данных

**ВАЖНО:** Таблица `club_subscriptions` УЖЕ существует с полем `plan` (TEXT). 

**Решение 1 (рекомендуется):** Создать справочную таблицу `club_plans` БЕЗ дублирования данных:

```sql
-- Новая таблица club_plans (справочная)
CREATE TABLE club_plans (
  id TEXT PRIMARY KEY,  -- 'club_free', 'club_basic', 'club_pro'
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2),
  max_active_events INT,
  max_organizers INT,
  allow_paid_events BOOLEAN DEFAULT false,
  allow_csv_export BOOLEAN DEFAULT false,
  allow_telegram_bot_pro BOOLEAN DEFAULT false,
  allow_analytics_basic BOOLEAN DEFAULT false,
  allow_analytics_advanced BOOLEAN DEFAULT false,
  allow_white_label BOOLEAN DEFAULT false,
  allow_subdomain BOOLEAN DEFAULT false,
  allow_api_access BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed данных
INSERT INTO club_plans (id, name, price_monthly, max_active_events, ...) VALUES
('club_free', 'Free', 0, 1, 1, false, false, false, false, false, false, false, false),
('club_basic', 'Basic', 990, 3, 3, true, true, false, true, false, false, false, false),
('club_pro', 'Pro', 4990, NULL, 10, true, true, true, true, true, true, true, true);

-- FK constraint (опционально, но рекомендуется)
ALTER TABLE club_subscriptions 
ADD CONSTRAINT fk_club_subscriptions_plan 
FOREIGN KEY (plan) REFERENCES club_plans(id);
```

**⚠️ Альтернатива (не рекомендуется):** Хранить лимиты в коде, но это менее гибко.

#### 1.2 Обновление логики лимитов

Текущая логика в `src/lib/services/permissions.ts` хардкодит лимиты:

```typescript
// ТЕКУЩИЙ КОД (нужно ЗАМЕНИТЬ):
const LIMITS = {
  FREE_USER_EVENTS: 1,
  CLUB_FREE_EVENTS: 1,
  CLUB_BASIC_EVENTS: 3,
  CLUB_PRO_EVENTS: Infinity,
};

// НОВЫЙ КОД:
async function getClubPlanLimits(planId: string): Promise<ClubPlanLimits> {
  const plan = await getClubPlan(planId); // из club_plans таблицы
  return {
    maxActiveEvents: plan.max_active_events,
    maxOrganizers: plan.max_organizers,
    features: {
      paidEvents: plan.allow_paid_events,
      csvExport: plan.allow_csv_export,
      // ...
    },
  };
}
```

**Задача Cursor:**
1. Создать `src/lib/db/clubPlanRepo.ts` с функциями:
   - `getAllPlans()`
   - `getPlanById(id)`
   - `getPlanLimits(id)`
2. Обновить `src/lib/services/permissions.ts`:
   - Заменить хардкод на чтение из БД
   - Кешировать планы (опционально)
3. Создать `src/lib/types/clubPlan.ts` с интерфейсами

#### 1.3 Middleware `can(user, action, {club})`

**ВАЖНО:** Функции `canXxx()` УЖЕ существуют в `src/lib/services/permissions.ts`.

**Задача Cursor:**
Создать **унифицированную обертку** для удобного использования:

```typescript
// src/lib/services/can.ts
export async function can(
  user: CurrentUser | null,
  action: string,
  resource: { club?: Club; event?: Event }
): Promise<boolean> {
  switch (action) {
    case 'create_paid_event':
      return resource.club 
        ? canCreatePaidEvent({ currentUser: user, club: resource.club })
        : canCreatePaidEvent({ currentUser: user });
    
    case 'export_csv':
      if (!resource.club) return false;
      const plan = await getClubPlanLimits(resource.club.planId);
      return plan.features.csvExport && 
             (await canManageClub(resource.club.id, user));
    
    case 'add_member':
      if (!resource.club) return false;
      return canManageClubMembers(resource.club.id, user);
    
    case 'view_analytics':
      if (!resource.club) return false;
      const limits = await getClubPlanLimits(resource.club.planId);
      return limits.features.analyticsBasic || limits.features.analyticsAdvanced;
      
    default:
      return false;
  }
}

// Использование:
if (await can(user, 'create_paid_event', { club })) {
  // разрешено
}
```

**Альтернатива:** Оставить использование прямых функций `canXxx()` без обертки (более явно, но многословно).

#### 1.4 Paywall Triggers

**Задача Cursor:**
Создать систему Paywall с триггерами ограничений.

**Структура:**

```typescript
// src/lib/types/paywall.ts
export type PaywallReason = 
  | 'event_limit_reached'
  | 'paid_event_not_allowed'
  | 'csv_export_not_allowed'
  | 'telegram_pro_not_allowed'
  | 'club_member_limit_reached'
  | 'event_participant_limit_reached';

export interface PaywallTrigger {
  reason: PaywallReason;
  currentPlan: string;
  requiredPlan: string;
  message: string;
}

// src/lib/services/paywall.ts
export async function checkPaywall(
  user: CurrentUser | null,
  action: string,
  context: any
): Promise<PaywallTrigger | null> {
  // Логика проверки лимитов
  // Возвращает null если доступ разрешен
  // Возвращает PaywallTrigger если нужен апгрейд
}
```

**Использование в API:**

```typescript
// Пример: POST /api/events
const paywall = await checkPaywall(user, 'create_event', { club });
if (paywall) {
  return respondJSON({ paywall }, 402); // Payment Required
}
```

**Использование во Frontend:**

```typescript
const handleCreate = async () => {
  const res = await fetch('/api/events', { method: 'POST', body: ... });
  if (res.status === 402) {
    const { paywall } = await res.json();
    showPaywallModal(paywall); // <-- новый компонент
  }
};
```

---

### 2. Клубы (Club System) — Доработки

#### 2.1 ✅ Создание клуба `/clubs/create`

**Статус:** УЖЕ реализовано в `src/app/clubs/create/page.tsx`

**Доработка:** Добавить проверку лимита клубов для Free users.

```typescript
// В API: POST /api/clubs
const userClubsCount = await countUserClubs(currentUser.id);
if (currentUser.plan === 'free' && userClubsCount >= 1) {
  return respondJSON({ 
    paywall: {
      reason: 'club_limit_reached',
      currentPlan: 'free',
      requiredPlan: 'pro',
    }
  }, 402);
}
```

#### 2.2 ✅ Страница клуба `/clubs/[id]`

**Статус:** УЖЕ реализовано в `src/app/clubs/[id]/page.tsx`

**Доработка:** Добавить секцию "Telegram Bot Settings" (если доступно по плану).

#### 2.3 ✅ Members Management `/clubs/[id]/manage`

**Статус:** УЖЕ реализовано, но называется `/clubs/[id]/manage` (не `/members`).

**Доработка:** Нет, уже полностью функционален.

#### 2.4 Club Settings - CSV Export

**Задача Cursor:**
Добавить секцию CSV Export на страницу `/clubs/[id]/manage`.

**Формат CSV:**

```csv
user_id,username,name,city,car_brand,car_model,registered_at
uuid-1,@john,John Doe,Moscow,Toyota,Land Cruiser,2024-12-01
uuid-2,@jane,Jane Smith,Kazan,Nissan,Patrol,2024-12-02
```

**Backend API:**

```typescript
// GET /api/clubs/[id]/export/members
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  // Проверка прав
  if (!(await canManageClub(id, user))) {
    return respondError(new ForbiddenError());
  }
  
  // Проверка плана
  const club = await getClubById(id);
  const plan = await getClubPlanLimits(club.planId);
  if (!plan.features.csvExport) {
    return respondJSON({ paywall: { ... } }, 402);
  }
  
  // Генерация CSV
  const members = await listClubMembers(id);
  const csv = generateCSV(members);
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="club-${id}-members.csv"`,
    },
  });
}
```

**Frontend:**

```tsx
// В src/app/clubs/[id]/manage/page.tsx
{can(user, 'export_csv', { club }) && (
  <Button onClick={handleExportCSV}>
    <Download className="h-4 w-4 mr-2" />
    Export Members to CSV
  </Button>
)}
```

---

### 3. События (Events) — Доработки

#### 3.1 ✅ Учет лимитов тарифов клуба

**Статус:** УЖЕ реализовано в `src/lib/services/permissions.ts`.

**Проверка:** Убедиться что все проверки есть в API endpoints.

#### 3.2 ✅ Paid events

**Статус:** УЖЕ реализовано. Поля `is_paid`, `price`, `currency_code` существуют.

**Доработка:** Добавить проверку `canCreatePaidEvent()` при создании/редактировании.

#### 3.3 ✅ Club events

**Статус:** УЖЕ реализовано. Поле `club_id` существует.

**Доработка:** Нет.

#### 3.4 Event participants - UserCard

**См. раздел 5 (UserCard Component)**

---

### 4. Профиль пользователя

#### 4.1 ✅ Profile View `/profile`

**Статус:** УЖЕ реализовано в `src/app/profile/page.tsx`.

**Текущая структура:**
- ✓ avatar, name, username
- ✓ clubs
- ✓ events (созданные)
- ✗ city (не отображается, хотя есть в БД)
- ✗ car (не отображается)

**Доработка:**

```tsx
// src/app/profile/page.tsx
// Добавить отображение:
<UserStatsCard user={user}>
  {user.city && (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-gray-500" />
      <span>{user.city.name}, {user.city.region}</span>
    </div>
  )}
  {user.carBrand && (
    <div className="flex items-center gap-2">
      <Car className="h-4 w-4 text-gray-500" />
      <span>{user.carBrand.name} {user.carModelText}</span>
    </div>
  )}
</UserStatsCard>
```

#### 4.2 Profile Edit `/profile/edit`

**Задача Cursor:** Создать страницу редактирования профиля.

**Структура:**

```
src/app/profile/edit/
└── page.tsx
```

**Поля формы:**
- `name` (текст)
- `cityId` (CityAutocomplete - УЖЕ существует компонент!)
- `carBrandId` (MultiBrandSelect с `multiselect={false}`)
- `carModelText` (текст)
- `carYear` (число, опционально)
- `telegram_handle` (только для чтения)

**API:**

```typescript
// PATCH /api/profile
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return respondError(new UnauthorizedError());
  
  const data = await req.json();
  const validated = profileUpdateSchema.parse(data);
  
  const updated = await updateUser(user.id, validated);
  
  return respondJSON({ user: updated });
}
```

**Zod schema:**

```typescript
// src/lib/types/user.ts
export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  cityId: z.string().uuid(),
  carBrandId: z.string().uuid().nullable(),
  carModelText: z.string().max(100).nullable(),
  carYear: z.number().int().min(1900).max(2100).nullable(),
});
```

#### 4.3 Новый пользователь → redirect на `/profile/edit`

**Задача Cursor:**

```typescript
// src/app/layout.tsx или middleware
const user = await getCurrentUser();
if (user && !user.cityId) {
  // Первый вход, профиль не заполнен
  redirect('/profile/edit?welcome=true');
}
```

**Улучшение UX:**

```tsx
// src/app/profile/edit/page.tsx
const params = useSearchParams();
const isWelcome = params.get('welcome') === 'true';

{isWelcome && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertTitle>Добро пожаловать!</AlertTitle>
    <AlertDescription>
      Пожалуйста, заполните ваш профиль чтобы другие участники могли узнать о вас больше.
    </AlertDescription>
  </Alert>
)}
```

---

### 5. UserCard Component

**Задача Cursor:** Создать универсальный компонент карточки пользователя.

**Структура:**

```
src/components/user/
└── user-card.tsx
```

**Props:**

```typescript
interface UserCardProps {
  user: {
    id: string;
    name: string;
    telegram_handle?: string;
    avatar_url?: string;
    city?: CityHydrated;
    carBrand?: CarBrandHydrated;
    carModelText?: string;
  };
  showCar?: boolean;
  showCity?: boolean;
  showContact?: boolean; // telegram handle
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}
```

**Использование:**

```tsx
// 1. Список участников события
<UserCard 
  user={participant} 
  showCar 
  showCity 
  size="medium" 
/>

// 2. Список членов клуба
<UserCard 
  user={member} 
  showCity 
  showContact 
  size="small"
  onClick={() => router.push(`/users/${member.id}`)}
/>

// 3. Профиль
<UserCard 
  user={profileUser} 
  showCar 
  showCity 
  showContact 
  size="large" 
/>
```

**Реализация:**

```tsx
export function UserCard({ 
  user, 
  showCar = false, 
  showCity = false, 
  showContact = false,
  size = 'medium',
  onClick,
}: UserCardProps) {
  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };
  
  return (
    <Card 
      className={cn('flex items-center gap-4', sizeClasses[size], onClick && 'cursor-pointer hover:bg-gray-50')}
      onClick={onClick}
    >
      {/* Avatar */}
      <Avatar size={size}>
        <AvatarImage src={user.avatar_url} />
        <AvatarFallback>{user.name[0]}</AvatarFallback>
      </Avatar>
      
      {/* Info */}
      <div className="flex-1">
        <div className="font-semibold">{user.name}</div>
        
        {showContact && user.telegram_handle && (
          <div className="text-sm text-gray-500">@{user.telegram_handle}</div>
        )}
        
        {showCity && user.city && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="h-3 w-3" />
            <span>{user.city.name}</span>
          </div>
        )}
        
        {showCar && user.carBrand && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Car className="h-3 w-3" />
            <span>{user.carBrand.name} {user.carModelText}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

### 6. Pricing Page `/pricing`

**Задача Cursor:** Создать страницу тарифов.

**Структура:**

```
src/app/pricing/
└── page.tsx
```

**Дизайн:** 3-колоночный grid с карточками планов.

**Данные:**
- **Вариант 1:** Хардкод в компоненте (быстро, но не гибко)
- **Вариант 2:** Загрузка из API `/api/plans` → из таблицы `club_plans`

**Рекомендуется Вариант 2:**

```tsx
// src/app/pricing/page.tsx
export default async function PricingPage() {
  const plans = await getClubPlans(); // Server Component
  
  return (
    <div className="page-container py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Тарифы</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
```

**PricingCard:**

```tsx
function PricingCard({ plan }: { plan: ClubPlan }) {
  const isPro = plan.id === 'club_pro';
  
  return (
    <Card className={cn('p-8', isPro && 'border-primary border-2')}>
      {isPro && (
        <Badge className="mb-4" variant="premium">Популярный</Badge>
      )}
      
      <h3 className="text-2xl font-bold">{plan.name}</h3>
      <div className="text-3xl font-bold my-4">
        {plan.price_monthly === 0 ? 'Бесплатно' : `₽${plan.price_monthly}/мес`}
      </div>
      
      <ul className="space-y-3 mb-6">
        <li className="flex items-start gap-2">
          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <span>
            {plan.max_active_events === null 
              ? 'Неограниченное количество событий'
              : `До ${plan.max_active_events} активных событий`
            }
          </span>
        </li>
        
        {plan.allow_paid_events && (
          <li className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <span>Платные события</span>
          </li>
        )}
        
        {plan.allow_csv_export && (
          <li className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <span>CSV экспорт участников</span>
          </li>
        )}
        
        {/* ... остальные features */}
      </ul>
      
      <Button 
        variant={isPro ? 'default' : 'outline'} 
        className="w-full"
      >
        {plan.price_monthly === 0 ? 'Начать бесплатно' : 'Выбрать план'}
      </Button>
    </Card>
  );
}
```

---

### 7. Paywall Modal v2

**Задача Cursor:** Создать модальное окно для ограничений.

**Структура:**

```
src/components/ui/
└── paywall-modal.tsx
```

**Props:**

```typescript
interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: PaywallTrigger;
}
```

**Реализация:**

```tsx
export function PaywallModal({ open, onOpenChange, trigger }: PaywallModalProps) {
  const router = useRouter();
  
  const messages = {
    event_limit_reached: {
      title: 'Лимит событий исчерпан',
      description: `На плане ${trigger.currentPlan} можно создать ограниченное количество событий. Обновите план чтобы создавать больше.`,
      icon: <Calendar className="h-12 w-12 text-orange-500" />,
    },
    paid_event_not_allowed: {
      title: 'Платные события недоступны',
      description: `Платные события доступны только на плане ${trigger.requiredPlan} и выше.`,
      icon: <DollarSign className="h-12 w-12 text-orange-500" />,
    },
    csv_export_not_allowed: {
      title: 'CSV экспорт недоступен',
      description: `Экспорт участников в CSV доступен только на плане ${trigger.requiredPlan}.`,
      icon: <Download className="h-12 w-12 text-orange-500" />,
    },
    // ...
  };
  
  const content = messages[trigger.reason];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center">
          {content.icon}
          
          <DialogHeader className="mt-4">
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>{content.description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 mt-6 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => router.push('/pricing')}
            >
              Посмотреть тарифы
            </Button>
            
            <Button 
              className="flex-1"
              onClick={() => router.push('/pricing#' + trigger.requiredPlan)}
            >
              Обновить план
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Использование:**

```tsx
// В любом компоненте
const [paywallOpen, setPaywallOpen] = useState(false);
const [paywallTrigger, setPaywallTrigger] = useState<PaywallTrigger | null>(null);

const handleCreate = async () => {
  const res = await fetch('/api/events', { method: 'POST', body: ... });
  
  if (res.status === 402) {
    const { paywall } = await res.json();
    setPaywallTrigger(paywall);
    setPaywallOpen(true);
    return;
  }
  
  // ...
};

return (
  <>
    <Button onClick={handleCreate}>Создать событие</Button>
    
    {paywallTrigger && (
      <PaywallModal 
        open={paywallOpen} 
        onOpenChange={setPaywallOpen}
        trigger={paywallTrigger}
      />
    )}
  </>
);
```

---

### 8. 404 Page

**Задача Cursor:** Создать кастомную 404 страницу.

**Структура:**

```
src/app/
└── not-found.tsx
```

**Дизайн:**
- Большая иллюстрация автомобиля (SVG или image)
- Заголовок "404 - Страница не найдена"
- Описание
- Кнопка "На главную"

**Реализация:**

```tsx
// src/app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center px-4">
        {/* SVG Illustration */}
        <div className="mb-8">
          <svg 
            className="w-64 h-64 mx-auto text-gray-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            {/* Simplified car icon */}
            <path d="M5 11l1-7h12l1 7M5 11h14M5 11v7h14v-7" strokeWidth="2" />
            <circle cx="8" cy="18" r="2" />
            <circle cx="16" cy="18" r="2" />
          </svg>
        </div>
        
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Страница не найдена
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Кажется, вы свернули не туда. Давайте вернемся на правильный маршрут!
        </p>
        
        <Link href="/">
          <Button size="lg">
            <Home className="h-4 w-4 mr-2" />
            На главную
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**Опционально:** Добавить анимацию или Lottie файл с автомобилем.

---

### 9. Доработки логики после внедрения городов

#### 9.1 ✅ Город в Profile

**Статус:** Частично реализовано, нужна доработка (см. раздел 4.1).

#### 9.2 ✅ Город в UserCard

**Статус:** Будет реализовано в UserCard (см. раздел 5).

#### 9.3 Сортировка событий по городам

**Текущая реализация:**

```tsx
// src/app/events/page.tsx
const [cityFilter, setCityFilter] = useState<string | null>(null);

const filtered = events.filter(e => 
  !cityFilter || e.city?.name?.toLowerCase() === cityFilter.toLowerCase()
);
```

**Проблема:** Фильтрация на клиенте, все события загружаются.

**Улучшение (рекомендуется):**

```typescript
// Backend: GET /api/events?cityId=uuid
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get('cityId');
  
  let query = supabase
    .from('events')
    .select('*');
  
  if (cityId) {
    query = query.eq('city_id', cityId);
  }
  
  const { data } = await query;
  // ...
}
```

```tsx
// Frontend: Использовать query params
const searchParams = useSearchParams();
const cityId = searchParams.get('cityId');

// При клике на кнопку города:
router.push(`/events?cityId=${city.id}`);

// SSR загрузка с учетом cityId:
const events = await listEvents({ cityId });
```

**Дополнительно:** Добавить dropdown выбора города над списком событий.

---

## 🏗️ АРХИТЕКТУРНЫЕ РЕКОМЕНДАЦИИ

### 1. Избегать дублирования данных

**Проблема:** Запрос создает таблицу `club_plans`, но `club_subscriptions.plan` уже существует.

**Решение:**
- Создать `club_plans` как **справочную** таблицу
- `club_subscriptions.plan` → FK на `club_plans.id`
- Хранить лимиты и фичи в `club_plans`, не в коде

### 2. Кеширование планов

**Проблема:** Частые запросы к `club_plans` на каждую проверку прав.

**Решение:**

```typescript
// src/lib/services/clubPlanCache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 час

export async function getCachedClubPlan(id: string): Promise<ClubPlan> {
  const cached = cache.get<ClubPlan>(id);
  if (cached) return cached;
  
  const plan = await getClubPlan(id);
  cache.set(id, plan);
  return plan;
}
```

**Использование:**

```typescript
// Вместо:
const plan = await getClubPlan(club.planId);

// Используем:
const plan = await getCachedClubPlan(club.planId);
```

### 3. Типизация Paywall

**Рекомендация:** Создать union type для всех возможных Paywall reasons.

```typescript
// src/lib/types/paywall.ts
export const PAYWALL_REASONS = {
  EVENT_LIMIT: 'event_limit_reached',
  PAID_EVENT: 'paid_event_not_allowed',
  CSV_EXPORT: 'csv_export_not_allowed',
  TELEGRAM_PRO: 'telegram_pro_not_allowed',
  MEMBER_LIMIT: 'club_member_limit_reached',
  PARTICIPANT_LIMIT: 'event_participant_limit_reached',
} as const;

export type PaywallReason = typeof PAYWALL_REASONS[keyof typeof PAYWALL_REASONS];
```

### 4. Унификация компонентов

**Уже реализовано:**
- ✅ `EventForm` (mode: create/edit)
- ✅ `ParticipantForm` (mode: create/edit)
- ✅ `ClubForm` (mode: create/edit)

**Добавить:**
- **ProfileForm** (для `/profile/edit`)
- **UserCard** (универсальная карточка)

**Принцип:** DRY (Don't Repeat Yourself) - один компонент для create/edit вместо двух.

### 5. Batch Loading для City

**Проблема:** N+1 запросы при загрузке списка событий/пользователей.

**Решение:** УЖЕ реализовано в `src/lib/utils/hydration.ts`:

```typescript
export async function hydrateEntitiesWithCities<T extends { cityId: string | null }>(
  entities: T[]
): Promise<(T & { city?: CityHydrated | null })[]> {
  // Batch loading городов
}
```

**Использование:**

```typescript
// src/lib/services/events.ts
const events = await listEvents();
const hydrated = await hydrateEntitiesWithCities(events);
```

**Проверить:** Используется ли везде или есть места с индивидуальными запросами?

### 6. Центральная точка для can() проверок

**Рекомендация:** Создать единую функцию `can()` (см. раздел 1.3).

**Преимущества:**
- Упрощает API routes
- Легче тестировать
- Единая точка изменения логики

**Альтернатива:** Оставить прямое использование `canXxx()` функций (более явно).

---

## ⚠️ ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ

### 1. Дублирование таблицы club_plans

**Проблема:** В запросе указано создать `club_plans`, но `club_subscriptions` уже содержит `plan`.

**Решение:**
- Вариант А: `club_plans` - справочник, `club_subscriptions.plan` - FK
- Вариант Б: Удалить `plan` из `club_subscriptions`, добавить `plan_id`

**Рекомендуется Вариант А** (меньше миграций).

### 2. Противоречие: member_count в clubs vs подсчет

**В запросе:**
```sql
ALTER TABLE clubs ADD COLUMN member_count INT DEFAULT 0;
```

**Проблема:** Дублирование данных (можно посчитать из `club_members`).

**Решение:**
- Вариант А: Убрать `member_count`, считать каждый раз
- Вариант Б: Оставить, но обновлять через триггеры
- Вариант В: Кешировать count в приложении

**Рекомендуется Вариант А** для малых клубов (<1000 участников).

**Если Вариант Б:**

```sql
-- Триггер для автообновления
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clubs 
  SET member_count = (
    SELECT COUNT(*) 
    FROM club_members 
    WHERE club_id = NEW.club_id AND role != 'pending'
  )
  WHERE id = NEW.club_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_count
AFTER INSERT OR UPDATE OR DELETE ON club_members
FOR EACH ROW EXECUTE FUNCTION update_club_member_count();
```

### 3. CSV Export: Security

**Проблема:** Экспорт может содержать чувствительные данные (телефон, email).

**Решение:**
- Проверять права: только owner/organizer
- Логировать экспорты (audit log)
- Ограничить rate limiting (max N экспортов в день)

```typescript
// Rate limiting для CSV export
const EXPORT_LIMIT_PER_DAY = 10;

const exportsToday = await countExportsToday(club.id);
if (exportsToday >= EXPORT_LIMIT_PER_DAY) {
  return respondError(new TooManyRequestsError('Daily export limit reached'));
}
```

### 4. Profile Edit: Concurrent Updates

**Проблема:** Два пользователя редактируют один профиль (маловероятно, но возможно для shared accounts).

**Решение:**
- Optimistic locking (versioning)
- Last-write-wins (текущий подход, приемлемо)

### 5. Paywall Modal: UX

**Проблема:** Слишком много Paywall триггеров может раздражать пользователей.

**Решение:**
- Показывать предупреждение ДО действия (не после)
- Добавить индикаторы в UI ("Pro only", "Требуется подписка")
- Offer upgrade gracefully (не блокировать полностью)

**Пример:**

```tsx
// Вместо:
<Button onClick={handleCreatePaidEvent}>Создать платное событие</Button>

// Делать:
<Button 
  onClick={can(user, 'create_paid_event') ? handleCreate : showPaywall}
  variant={can(user, 'create_paid_event') ? 'default' : 'outline'}
>
  Создать платное событие
  {!can(user, 'create_paid_event') && (
    <Badge variant="premium" className="ml-2">Pro</Badge>
  )}
</Button>
```

---

## 📊 ПЛАН РАЗРАБОТКИ

### Этап 1: Database & Types (2-3 часа)

1. **Создать таблицу club_plans** (10 мин)
   - Миграция SQL
   - Seed данных
   - FK constraint на `club_subscriptions.plan`

2. **Создать типы** (30 мин)
   - `src/lib/types/clubPlan.ts`
   - `src/lib/types/paywall.ts`
   - Обновить `src/lib/types/user.ts` (profileUpdateSchema)

3. **Создать репозитории** (1 час)
   - `src/lib/db/clubPlanRepo.ts` (getAllPlans, getPlanById, getPlanLimits)
   - Обновить `src/lib/db/userRepo.ts` (updateUser для профиля)

4. **Обновить Permissions Service** (1 час)
   - Заменить хардкод лимитов на чтение из БД
   - Добавить кеширование планов
   - Создать `src/lib/services/can.ts` (опционально)

---

### Этап 2: Paywall System (2-3 часа)

5. **Создать Paywall Service** (1 час)
   - `src/lib/services/paywall.ts`
   - Функция `checkPaywall()`
   - Типы `PaywallTrigger`, `PaywallReason`

6. **Создать PaywallModal компонент** (1 час)
   - `src/components/ui/paywall-modal.tsx`
   - Дизайн, messages, иконки
   - Интеграция с router

7. **Интегрировать в API Routes** (30 мин)
   - POST /api/events - проверка лимитов
   - POST /api/clubs - проверка лимитов
   - Возврат 402 статуса с paywall объектом

---

### Этап 3: Profile System (3-4 часа)

8. **Создать Profile Edit страницу** (1.5 часа)
   - `src/app/profile/edit/page.tsx`
   - Форма с CityAutocomplete, MultiBrandSelect
   - Welcome message для новых пользователей

9. **Создать API endpoint** (30 мин)
   - PATCH /api/profile
   - Валидация Zod
   - Обновление user

10. **Добавить redirect для новых пользователей** (30 мин)
    - Middleware или Layout проверка
    - Redirect на `/profile/edit?welcome=true`

11. **Обновить Profile View** (1 час)
    - Отображение city, carBrand, carModelText
    - Кнопка "Редактировать профиль"

---

### Этап 4: UserCard Component (1-2 часа)

12. **Создать UserCard компонент** (1 час)
    - `src/components/user/user-card.tsx`
    - Props: showCar, showCity, showContact, size
    - Responsive дизайн

13. **Интегрировать UserCard** (30 мин)
    - Заменить в списке участников события
    - Заменить в списке членов клуба
    - Использовать в Profile

---

### Этап 5: Pricing & CSV Export (2-3 часа)

14. **Создать Pricing Page** (1.5 часа)
    - `src/app/pricing/page.tsx`
    - PricingCard компонент
    - 3-колоночный grid
    - Загрузка данных из API или хардкод

15. **Создать CSV Export** (1 час)
    - GET /api/clubs/[id]/export/members
    - Генерация CSV
    - Проверка прав и плана
    - Кнопка в UI `/clubs/[id]/manage`

---

### Этап 6: 404 Page & Доработки (1-2 часа)

16. **Создать 404 Page** (30 мин)
    - `src/app/not-found.tsx`
    - SVG иллюстрация
    - Кнопка "На главную"

17. **Доработка сортировки событий по городам** (1 час)
    - Backend: фильтр `?cityId=uuid` в API
    - Frontend: dropdown выбора города
    - Query params для фильтра

18. **Финальные проверки** (30 мин)
    - Проверить все Paywall триггеры
    - Проверить UserCard во всех местах
    - Проверить Profile Edit
    - Проверить Pricing Page

---

### Итого: ~12-15 часов разработки

**Распределение:**
- Database & Types: 2-3 ч
- Paywall System: 2-3 ч
- Profile System: 3-4 ч
- UserCard: 1-2 ч
- Pricing & CSV: 2-3 ч
- 404 & Finalize: 1-2 ч

---

## ✅ CHECKLIST ДЛЯ CURSOR

После завершения реализации проверить:

### Database
- [ ] Таблица `club_plans` создана и заполнена
- [ ] FK constraint `club_subscriptions.plan → club_plans.id` добавлен
- [ ] Seed данных для 3 планов (free, basic, pro) выполнен

### Types & Repositories
- [ ] `src/lib/types/clubPlan.ts` создан
- [ ] `src/lib/types/paywall.ts` создан
- [ ] `profileUpdateSchema` добавлен в `src/lib/types/user.ts`
- [ ] `src/lib/db/clubPlanRepo.ts` создан (3 функции)
- [ ] `updateUser()` для профиля добавлен в `userRepo.ts`

### Services
- [ ] `src/lib/services/permissions.ts` обновлен (использует БД вместо хардкода)
- [ ] `src/lib/services/can.ts` создан (опционально)
- [ ] `src/lib/services/paywall.ts` создан
- [ ] Кеширование планов реализовано

### API Routes
- [ ] `PATCH /api/profile` создан
- [ ] `GET /api/clubs/[id]/export/members` создан
- [ ] Paywall проверки добавлены в POST /api/events
- [ ] Paywall проверки добавлены в POST /api/clubs

### Components
- [ ] `src/components/ui/paywall-modal.tsx` создан
- [ ] `src/components/user/user-card.tsx` создан
- [ ] UserCard интегрирован в 3+ местах

### Pages
- [ ] `src/app/pricing/page.tsx` создан
- [ ] `src/app/profile/edit/page.tsx` создан
- [ ] `src/app/not-found.tsx` создан
- [ ] Redirect для новых пользователей реализован

### Доработки
- [ ] Город отображается в Profile View
- [ ] City filter в `/events` использует query params
- [ ] CSV export кнопка в Club Management
- [ ] Все стили унифицированы (h-12, rounded-xl, border-2)

### Testing
- [ ] Создание события с превышением лимита → Paywall
- [ ] CSV export без подписки → Paywall
- [ ] Profile Edit сохраняет данные
- [ ] UserCard отображается корректно
- [ ] Pricing Page загружается
- [ ] 404 Page работает

### Build & Types
- [ ] `npm run build` проходит без ошибок
- [ ] TypeScript errors = 0
- [ ] Линтер errors = 0
- [ ] Supabase types регенерированы (если нужно)

---

## 📚 СПРАВОЧНАЯ ИНФОРМАЦИЯ

### Существующие компоненты для переиспользования

```
✓ CityAutocomplete         - унифицированный выбор города
✓ MultiBrandSelect         - выбор марок авто
✓ Badge                    - 13 вариантов (premium, paid, free, club, etc.)
✓ ConfirmDialog            - подтверждение действий
✓ ProgressBar              - динамический прогресс-бар
✓ Spinner, PageLoader      - индикаторы загрузки
```

### Цветовая палитра проекта

```
Primary: #FF6F2C (оранжевый)
Success: #10B981 (зеленый)
Error:   #EF4444 (красный)
Warning: #F59E0B (оранжевый)
Gray:    #E5E7EB, #9CA3AF, #6B7280, #111827
```

### Стандарты полей форм

```
Height:       h-12
Radius:       rounded-xl
Border:       border-2 border-[#E5E7EB]
Error:        border-red-500 focus-visible:ring-red-500
Label:        text-sm font-medium text-[#111827]
Error text:   min-h-[28px] text-xs text-red-600
Spacing:      space-y-2 между Label и полем
```

### Полезные утилиты

```typescript
// Hydration
import { hydrateEntitiesWithCities } from '@/lib/utils/hydration';
const hydrated = await hydrateEntitiesWithCities(entities);

// Permissions
import { canCreateEvent, canManageClub } from '@/lib/services/permissions';
if (await canCreateEvent({ currentUser, club })) { ... }

// Errors
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
throw new ForbiddenError('Access denied');

// API Response
import { respondJSON, respondError } from '@/lib/api/response';
return respondJSON({ data }, 200);
```

---

## 🎯 ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ

1. **Начни с базы данных** - миграции и types
2. **Используй существующие компоненты** - не изобретай велосипед
3. **Следуй стилям** - h-12, rounded-xl, border-2, spacing
4. **DRY принцип** - избегай дублирования
5. **Type safety** - строгая типизация везде
6. **Проверяй права** - используй Permissions Engine
7. **Тестируй Paywall** - проверь все сценарии
8. **Кешируй планы** - не загружай каждый раз из БД
9. **Batch loading** - используй hydrateEntitiesWithCities
10. **Проверяй build** - `npm run build` должен проходить

---

**Удачи в реализации! 🚀**

**Автор:** AI Assistant (Claude Sonnet 4.5)  
**Дата:** 13 декабря 2024  
**Версия:** 1.0

