# PHASE 2: Type System

**Date:** 12 декабря 2025  
**Status:** ✅ COMPLETED  
**Purpose:** Создать TypeScript типы для новых сущностей и обновить существующие

---

## 📊 OVERVIEW

Созданы и обновлены TypeScript типы для поддержки:
- Клубов и членства в клубах
- Подписок (личных и клубных)
- Обновленной системы видимости событий
- Связей между событиями и клубами

---

## 🆕 НОВЫЕ ФАЙЛЫ

### 1. `src/lib/types/club.ts` (270+ строк)

**Содержимое:**

#### Enums
- `ClubRole`: `"owner" | "organizer" | "member" | "pending"`
- `ClubPlan`: `"club_free" | "club_basic" | "club_pro"`

#### Interfaces
```typescript
// Базовый клуб
interface Club {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  logoUrl: string | null;
  telegramUrl: string | null;
  websiteUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Участник клуба
interface ClubMember {
  clubId: string;
  userId: string;
  role: ClubRole;
  invitedBy: string | null;
  joinedAt: string;
}

// Участник с информацией о пользователе
interface ClubMemberWithUser extends ClubMember {
  user: {
    id: string;
    name: string;
    telegramHandle: string | null;
    avatarUrl: string | null;
  };
}

// Подписка клуба
interface ClubSubscription {
  clubId: string;
  plan: ClubPlan;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Клуб с полными деталями
interface ClubWithDetails extends Club {
  subscription: ClubSubscription;
  members: ClubMemberWithUser[];
  memberCount: number;
  eventCount: number;
}

// Клуб с информацией о членстве текущего пользователя
interface ClubWithMembership extends Club {
  userRole: ClubRole | null;
  subscription: ClubSubscription;
  memberCount: number;
}
```

#### Zod Schemas (валидация)
- `clubCreateSchema`: Создание клуба
- `clubUpdateSchema`: Обновление клуба
- `clubMemberAddSchema`: Добавление участника
- `clubMemberRoleUpdateSchema`: Изменение роли
- `clubSubscriptionUpdateSchema`: Обновление подписки

#### Helper Functions
```typescript
// Локализация
getClubRoleLabel(role: ClubRole): string
getClubPlanLabel(plan: ClubPlan): string
getClubPlanFeatures(plan: ClubPlan): string[]

// Лимиты
getMaxActiveEventsForPlan(plan: ClubPlan): number | null

// Права доступа
canManageClub(role: ClubRole | null): boolean
canCreateClubEvents(role: ClubRole | null): boolean
canManageMembers(role: ClubRole | null): boolean

// Подписка
isSubscriptionActive(subscription: ClubSubscription): boolean
getDaysUntilExpiration(subscription: ClubSubscription): number | null
```

---

## 🔄 ОБНОВЛЕННЫЕ ФАЙЛЫ

### 2. `src/lib/types/user.ts`

**Добавлено:**

#### Enum
```typescript
type UserPlan = "free" | "pro";
```

#### Обновлен интерфейс User
```typescript
interface User {
  // ... existing fields
  plan?: UserPlan; // Личный тарифный план (free по умолчанию)
}
```

#### Helper Functions
```typescript
getUserPlanLabel(plan: UserPlan): string
getUserPlanFeatures(plan: UserPlan): string[]
canCreatePaidEvents(plan: UserPlan): boolean
canUseRestrictedVisibility(plan: UserPlan): boolean
getMaxActivePersonalEventsForPlan(plan: UserPlan): number | null
```

**Правила личных подписок:**
- **Free:**
  - Макс 1 активное событие
  - Только публичные события
  - Только бесплатные события
  
- **Pro:**
  - Безлимит событий
  - Все уровни видимости
  - Платные события разрешены

---

### 3. `src/lib/types/event.ts`

**Изменено:**

#### Обновлен Visibility enum
```typescript
// БЫЛО:
type Visibility = "public" | "link_registered";

// СТАЛО:
type Visibility = "public" | "unlisted" | "restricted";
```

**Семантика:**
- `public` - Видно всем (как раньше)
- `unlisted` - Доступно только по прямой ссылке (новое)
- `restricted` - Только участникам/клубу (было `link_registered`)

#### Добавлены поля в Event interface
```typescript
interface Event {
  // ... existing fields
  isClubEvent: boolean;
  clubId?: string | null; // ID клуба-организатора (NULL = личное)
  club?: {  // Hydrated club info (опционально)
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
  // ...
}
```

#### Обновлены Zod schemas
```typescript
// eventCreateSchema
{
  // ...
  clubId: z.string().uuid().nullable().optional(),
}

// eventUpdateSchema
{
  // ...
  clubId: z.string().uuid().nullable().optional(),
}
```

---

## 🔗 СВЯЗИ МЕЖДУ ТИПАМИ

### User → Clubs
```typescript
// Пользователь может быть участником нескольких клубов
User --< ClubMember >-- Club

// Получение клубов пользователя:
const userClubs: ClubWithMembership[] = await listUserClubs(userId);
```

### Club → Events
```typescript
// Клуб может создавать события
Club --< Event

// Получение событий клуба:
const clubEvents: Event[] = await listClubEvents(clubId);
```

### Event → Club (опционально)
```typescript
// Событие может принадлежать клубу
Event.clubId --> Club.id

// Hydrated event с информацией о клубе:
const event: Event = {
  clubId: "uuid",
  club: {
    id: "uuid",
    name: "Jeep Club Moscow",
    logoUrl: "https://..."
  }
};
```

### User → Subscription
```typescript
// У пользователя есть личная подписка
User.plan: "free" | "pro"

// Получение плана:
const userPlan: UserPlan = user.plan ?? "free";
```

### Club → Subscription
```typescript
// У клуба есть подписка
Club --1:1-- ClubSubscription

// Подписка создается автоматически при создании клуба (триггер БД)
```

---

## 📐 ДИАГРАММА ТИПОВ

```
User
├── plan: UserPlan (free|pro)
├── ClubMember[]
│   ├── clubId → Club
│   └── role: ClubRole (owner|organizer|member|pending)
└── Event[] (created_by_user_id)

Club
├── ClubSubscription (1:1)
│   └── plan: ClubPlan (club_free|club_basic|club_pro)
├── ClubMember[]
│   └── userId → User
└── Event[] (club_id)

Event
├── createdByUserId → User
├── clubId → Club (optional)
├── visibility: Visibility (public|unlisted|restricted)
└── club: { id, name, logoUrl } (hydrated, optional)
```

---

## 🎯 ИСПОЛЬЗОВАНИЕ

### Создание клуба
```typescript
import { clubCreateSchema, type ClubCreateInput } from "@/lib/types/club";

const input: ClubCreateInput = {
  name: "Jeep Club Moscow",
  description: "Покорители бездорожья",
  city: "Москва",
  logoUrl: "https://example.com/logo.png",
  telegramUrl: "https://t.me/jeepclub",
  createdBy: userId,
};

// Валидация
const validated = clubCreateSchema.parse(input);
```

### Проверка прав
```typescript
import { canManageClub, canCreateClubEvents } from "@/lib/types/club";

// Проверить может ли пользователь управлять клубом
if (canManageClub(userRole)) {
  // Показать кнопку "Настройки"
}

// Проверить может ли создавать события
if (canCreateClubEvents(userRole)) {
  // Показать кнопку "Создать событие"
}
```

### Работа с подписками
```typescript
import { 
  isSubscriptionActive, 
  getDaysUntilExpiration,
  getMaxActiveEventsForPlan 
} from "@/lib/types/club";

// Проверить активность подписки
if (!isSubscriptionActive(club.subscription)) {
  // Показать предупреждение "Подписка истекла"
}

// Получить дни до истечения
const daysLeft = getDaysUntilExpiration(club.subscription);
if (daysLeft && daysLeft < 7) {
  // Показать уведомление "Подписка истекает через N дней"
}

// Проверить лимит событий
const maxEvents = getMaxActiveEventsForPlan(club.subscription.plan);
if (maxEvents && currentEventCount >= maxEvents) {
  // Показать ошибку "Достигнут лимит событий"
}
```

### Создание события с клубом
```typescript
import { eventCreateSchema, type EventCreateInput } from "@/lib/types/event";

const input: EventCreateInput = {
  title: "Поездка в Карелию",
  description: "...",
  dateTime: new Date("2025-06-15"),
  locationText: "Карелия",
  visibility: "restricted", // Только для клуба
  clubId: clubId, // Событие от клуба
  createdByUserId: userId,
};

// Валидация (включая clubId)
const validated = eventCreateSchema.parse(input);
```

### Проверка видимости
```typescript
// Проверить может ли пользователь создать unlisted событие
import { canUseRestrictedVisibility } from "@/lib/types/user";

if (!canUseRestrictedVisibility(user.plan)) {
  // Показать upgrade prompt
  alert("Функция доступна только в Pro версии");
}
```

---

## ✅ ПРЕИМУЩЕСТВА

### 1. Type Safety
- ✅ Полная типизация всех сущностей
- ✅ Невозможно передать неверные данные
- ✅ Автодополнение в IDE

### 2. Валидация
- ✅ Zod schemas для runtime валидации
- ✅ Единые правила на фронте и бэке
- ✅ Читаемые сообщения об ошибках

### 3. Helper Functions
- ✅ Централизованная логика
- ✅ Переиспользуемый код
- ✅ Легко тестировать

### 4. Расширяемость
- ✅ Легко добавлять новые поля
- ✅ Backward compatible (optional fields)
- ✅ Composite types для разных use cases

---

## 🔄 СОВМЕСТИМОСТЬ

### Обратная совместимость
- ✅ **User.plan** - опциональное поле, default = `"free"`
- ✅ **Event.clubId** - опциональное поле, default = `null`
- ✅ **Event.club** - опциональное поле, заполняется только при hydration

### Миграция существующих данных
- ✅ Все существующие users получили `plan = "free"` (миграция БД)
- ✅ Все существующие events имеют `clubId = null` (личные события)
- ✅ Visibility `"link_registered"` мигрирован в `"restricted"` (миграция БД)

### Код продолжит работать
```typescript
// Старый код (до миграций)
const user: User = await getUser(id);
const userPlan = user.plan; // undefined → TypeScript: UserPlan | undefined

// Новый код (после миграций)
const userPlan = user.plan ?? "free"; // Всегда будет "free" или "pro"
```

---

## 📊 СТАТИСТИКА

- **Новых файлов:** 1 (`club.ts`)
- **Обновленных файлов:** 2 (`user.ts`, `event.ts`)
- **Новых интерфейсов:** 5 (Club, ClubMember, ClubMemberWithUser, ClubSubscription, ClubWithDetails, ClubWithMembership)
- **Новых типов:** 3 (ClubRole, ClubPlan, UserPlan)
- **Обновленных типов:** 1 (Visibility)
- **Zod schemas:** 5 новых (club create/update, member add/role update, subscription update)
- **Helper functions:** 13 новых

**Общие строки кода:** ~350 строк

---

## 🎯 СЛЕДУЮЩИЙ ШАГ: PHASE 3

**Готово к:**
- Создани Repository Layer для работы с БД
- `clubRepo.ts` - CRUD для клубов
- `clubMemberRepo.ts` - управление участниками
- `subscriptionRepo.ts` - управление подписками
- Обновление `eventRepo.ts` для поддержки `club_id`
- Обновление `userRepo.ts` для поддержки `plan`

---

_PHASE 2 завершена успешно. Все типы созданы, валидация настроена, backward compatibility сохранена._

