# 👨‍💻 Development Guide

Правила разработки, паттерны и best practices для Need4Trip.

---

## 📋 Содержание

### 1. [Loading System](./loading-system.md) ⭐
Современная система загрузки:
- Streaming SSR (Server Components)
- Suspense boundaries
- Optimistic UI
- Client transitions
- DelayedSpinner

### 2. [Performance](./performance.md)
Оптимизация производительности:
- FCP/TTI optimization
- Code splitting
- Image optimization
- Bundle size reduction
- Web Vitals

### 3. Code Style (создать)
Правила написания кода:
- TypeScript conventions
- React patterns
- Naming conventions
- File structure
- Error handling

### 4. Patterns (создать)
Применяемые паттерны:
- Repository pattern
- Service layer
- Custom hooks
- Server Components patterns
- Error boundaries

---

## 🎯 Core Principles

### 1. Type Safety First
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id: any): Promise<any> {
  // ...
}
```

### 2. Server Components by Default
```tsx
// ✅ Good - Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// ❌ Bad - Unnecessary client component
"use client";
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { /* fetch */ }, []);
  return <div>{data}</div>;
}
```

### 3. Optimistic UI for Actions
```typescript
// ✅ Good - Instant feedback
const { optimisticState, setOptimistic } = useSimpleOptimistic(data);

const handleDelete = async (id) => {
  setOptimistic(data.filter(item => item.id !== id)); // Instant
  
  try {
    await deleteItem(id);
  } catch {
    setOptimistic(data); // Rollback
  }
};

// ❌ Bad - Wait for server
const handleDelete = async (id) => {
  await deleteItem(id);
  await refetch(); // Slow
};
```

### 4. Proper Error Handling
```typescript
// ✅ Good - Typed errors
import { PaywallError, NotFoundError } from '@/lib/errors';

if (limit exceeded) {
  throw new PaywallError({
    reason: "MAX_EVENT_PARTICIPANTS_EXCEEDED",
    currentPlanId: "club_50",
    requiredPlanId: "club_500",
  });
}

// ❌ Bad - Generic errors
throw new Error("Error");
```

---

## 🏗️ Architecture Patterns

### Repository Pattern

```typescript
// src/lib/db/userRepo.ts
export async function getUserById(id: string): Promise<User | null> {
  // Direct Supabase call
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw new InternalError("Failed to load user");
  return data ? mapDbUserToDomain(data) : null;
}
```

### Service Layer

```typescript
// src/lib/services/events.ts
export async function createEvent(input: unknown, user: CurrentUser) {
  // 1. Validate
  const parsed = eventCreateSchema.parse(input);
  
  // 2. Check permissions
  await enforceClubAction({ clubId, action: "CLUB_CREATE_EVENT" });
  
  // 3. Create via repository
  const event = await createEventRecord(parsed);
  
  // 4. Return domain object
  return mapDbEventToDomain(event);
}
```

### Custom Hooks

```typescript
// src/hooks/use-club-plan.ts
export function useClubPlan(clubId: string | null) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!clubId) {
      setPlan(FREE_PLAN);
      return;
    }
    
    fetch(`/api/clubs/${clubId}/current-plan`)
      .then(res => res.json())
      .then(data => setPlan(data.data));
  }, [clubId]);
  
  return { plan, limits: plan?.limits, loading };
}
```

---

## 📁 File Structure

```
src/
├── app/                         # Next.js App Router
│   ├── api/                    # API routes
│   │   └── [resource]/
│   │       └── route.ts        # GET/POST/DELETE handlers
│   │
│   ├── [page]/                 # Pages
│   │   ├── page.tsx            # Server Component
│   │   └── _components/        # Page-specific components
│   │       ├── *-async.tsx     # Async Server Components
│   │       └── *-client.tsx    # Client Components
│   │
│   ├── layout.tsx              # Root layout
│   └── error.tsx               # Error boundary
│
├── components/                  # Shared components
│   ├── ui/                     # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   └── [feature]/              # Feature components
│       ├── event-form.tsx
│       └── event-card.tsx
│
├── lib/
│   ├── db/                     # Database layer
│   │   ├── client.ts           # Supabase client
│   │   └── [entity]Repo.ts     # Repository per entity
│   │
│   ├── services/               # Business logic
│   │   └── [entity].ts         # Service per entity
│   │
│   ├── types/                  # TypeScript types
│   │   ├── [entity].ts         # Domain types
│   │   └── supabase.ts         # Generated types
│   │
│   ├── utils/                  # Utilities
│   │   ├── dates.ts
│   │   ├── errors.ts
│   │   └── logger.ts
│   │
│   └── errors.ts               # Error classes
│
├── hooks/                       # React hooks
│   ├── use-club-plan.ts
│   └── use-optimistic-state.ts
│
└── middleware.ts                # Next.js middleware
```

---

## 🎨 Component Patterns

### Server Component (Async)

```tsx
// app/_components/upcoming-events-async.tsx
export async function UpcomingEventsAsync() {
  // Direct data fetching
  const events = await listUpcomingEvents();
  
  return (
    <div>
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

// Usage with Suspense
<Suspense fallback={<EventsSkeleton />}>
  <UpcomingEventsAsync />
</Suspense>
```

### Client Component (Interactive)

```tsx
"use client";

// app/_components/events-filter-client.tsx
export function EventsFilterClient({ initialEvents }) {
  const [filters, setFilters] = useState({});
  const { isLoading, startTransition } = useLoadingTransition();
  
  const handleFilterChange = (newFilters) => {
    startTransition(async () => {
      const events = await fetchFilteredEvents(newFilters);
      setFilters(newFilters);
    });
  };
  
  return (
    <div>
      <FilterControls onChange={handleFilterChange} />
      {isLoading && <DelayedSpinner />}
      <EventsList events={events} />
    </div>
  );
}
```

---

## 🔧 Tools & Utilities

### Logger

```typescript
import { log } from '@/lib/utils/logger';

log.info("User logged in", { userId: user.id });
log.warn("Rate limit approaching", { remaining: 10 });
log.error("Failed to create event", { error, eventData });
```

### Error Handling

```typescript
import { respondError } from '@/lib/api/response';
import { PaywallError, NotFoundError } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    // ...
  } catch (error) {
    return respondError(error); // Auto-formats based on error type
  }
}
```

### Validation

```typescript
import { z } from 'zod';

const eventCreateSchema = z.object({
  title: z.string().min(3).max(150),
  dateTime: z.string().datetime(),
  maxParticipants: z.number().int().min(1).nullable(),
});

const parsed = eventCreateSchema.parse(input); // Throws ValidationError
```

---

## 📚 Related Docs

- **[Loading System](./loading-system.md)** - Детальное описание системы загрузки
- **[Performance](./performance.md)** - Оптимизация производительности
- **[Architecture](../architecture/README.md)** - Общая архитектура

---

**Last Updated:** 16 декабря 2024
