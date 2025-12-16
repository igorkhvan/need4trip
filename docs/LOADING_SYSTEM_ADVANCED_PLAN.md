# 🚀 План внедрения Advanced Loading System

## Обзор

Полная система загрузки с использованием современных паттернов Next.js 16 и React 19.

**Цель:** Превосходный UX с плавными переходами, оптимистичными обновлениями и progressive loading.

**Время:** 3-4 дня (24-32 часа чистого времени)

---

## 🎯 Архитектурные решения

### 1. **Streaming SSR vs Client State**

**Решение:**
- **Server Components** → Streaming SSR + Suspense boundaries
- **Client Components** → `useTransition` + оптимистичный UI
- **Hybrid** → Skeleton с задержкой + progressive loading

### 2. **Skeleton Strategy**

**Проблема:** Skeleton "мигает" при быстрой загрузке (<300ms)

**Решение:** Отложенный skeleton
```typescript
// Показываем skeleton только если загрузка > 300ms
const [showSkeleton, setShowSkeleton] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setShowSkeleton(true), 300);
  return () => clearTimeout(timer);
}, []);
```

### 3. **Progressive Loading**

**Паттерн:** Загружаем контент по частям
```
1. Загружаем критичные данные (header, первые 3 элемента)
2. Показываем skeleton для остального
3. Подгружаем остальное асинхронно
```

### 4. **Optimistic UI**

**Паттерн:** Мгновенное обновление UI → фоновый запрос → откат при ошибке
```typescript
// Пример: добавление участника
1. Сразу добавляем в список (optimistic)
2. Отправляем запрос
3. При ошибке - убираем и показываем toast
```

---

## 📋 План по этапам (24-32 часа)

---

## **Этап 1: Фундамент** (4-6 часов)

### 1.1 Создать базовые hooks (2 часа)

#### `useDelayedLoading(delay = 300)`
```typescript
// hooks/use-delayed-loading.ts
export function useDelayedLoading(isLoading: boolean, delay = 300) {
  const [showLoading, setShowLoading] = useState(false);
  
  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }
    
    const timer = setTimeout(() => setShowLoading(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);
  
  return showLoading;
}
```

#### `useOptimistic(initialState)`
```typescript
// hooks/use-optimistic.ts
import { useOptimistic as useReactOptimistic } from 'react';

export function useOptimisticState<T>(
  initialState: T,
  updateFn: (state: T, optimisticValue: T) => T
) {
  const [optimisticState, addOptimistic] = useReactOptimistic(
    initialState,
    updateFn
  );
  
  return { optimisticState, addOptimistic };
}
```

#### `useLoadingTransition()`
```typescript
// hooks/use-loading-transition.ts
import { useTransition } from 'react';

export function useLoadingTransition() {
  const [isPending, startTransition] = useTransition();
  const showDelayed = useDelayedLoading(isPending);
  
  return {
    isPending,
    showLoading: showDelayed,
    startTransition,
  };
}
```

**Файлы:**
- `src/hooks/use-delayed-loading.ts`
- `src/hooks/use-optimistic-state.ts`
- `src/hooks/use-loading-transition.ts`

---

### 1.2 Создать Skeleton компоненты (2 часа)

#### `ClubCardSkeleton`
```typescript
// components/ui/skeletons/club-card-skeleton.tsx
export function ClubCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#F7F7F8]" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-[#F7F7F8]" />
      </div>
      <div className="mb-2 h-7 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
      <div className="mb-4 h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
      <div className="space-y-2">
        <div className="h-4 w-1/2 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#F7F7F8]" />
      </div>
    </div>
  );
}
```

**Создать:**
- `<ClubCardSkeleton />`
- `<EventCardSkeleton />`
- `<ProfileHeaderSkeleton />`
- `<FormFieldSkeleton />`
- `<TableRowSkeleton />`

**Файлы:**
- `src/components/ui/skeletons/club-card-skeleton.tsx`
- `src/components/ui/skeletons/event-card-skeleton.tsx`
- `src/components/ui/skeletons/profile-skeleton.tsx`
- `src/components/ui/skeletons/form-skeleton.tsx`
- `src/components/ui/skeletons/table-skeleton.tsx`
- `src/components/ui/skeletons/index.ts` (barrel export)

---

### 1.3 Wrapper компоненты (2 часа)

#### `SuspenseWrapper`
```typescript
// components/ui/suspense-wrapper.tsx
interface SuspenseWrapperProps {
  fallback?: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}

export function SuspenseWrapper({ 
  fallback, 
  delay = 300,
  children 
}: SuspenseWrapperProps) {
  const [showFallback, setShowFallback] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return (
    <Suspense fallback={showFallback ? fallback : <div />}>
      {children}
    </Suspense>
  );
}
```

#### `DelayedSpinner`
```typescript
// components/ui/delayed-spinner.tsx
export function DelayedSpinner({ delay = 300, ...props }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  return show ? <Spinner {...props} /> : null;
}
```

**Файлы:**
- `src/components/ui/suspense-wrapper.tsx`
- `src/components/ui/delayed-spinner.tsx`

---

## **Этап 2: Server Components + Streaming** (6-8 часов)

### 2.1 Оптимизация Homepage (2 часа)

**Текущая проблема:** Всё загружается последовательно

**Решение:** Streaming с приоритетами

```typescript
// app/page.tsx
export default async function HomePage() {
  return (
    <>
      {/* Критичный контент - загружаем сразу */}
      <Hero />
      
      {/* Второстепенный - загружаем параллельно */}
      <Suspense fallback={<HowItWorksSkeleton />}>
        <HowItWorksSection />
      </Suspense>
      
      <Suspense fallback={<FeaturesSkeleton />}>
        <Features />
      </Suspense>
      
      {/* Данные из БД - отдельный stream */}
      <Suspense fallback={<EventsSkeleton />}>
        <UpcomingEventsAsync />
      </Suspense>
    </>
  );
}

// Отдельный async компонент
async function UpcomingEventsAsync() {
  const events = await listVisibleEventsForUser(null);
  // ... обработка
  return <UpcomingEventsSection events={events} />;
}
```

**Изменения:**
- Разбить homepage на async chunks
- Добавить Suspense boundaries
- Создать skeleton для каждой секции

---

### 2.2 Club Details Page (2 часа)

**Паттерн:** Параллельная загрузка частей

```typescript
// app/clubs/[id]/page.tsx
export default async function ClubDetailsPage({ params }) {
  const { id } = await params;
  
  // Критичная информация - загружаем сразу
  const club = await getClubById(id);
  
  return (
    <>
      {/* Header - сразу */}
      <ClubHeader club={club} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основной контент */}
        <div className="lg:col-span-2">
          {/* Description - сразу */}
          <ClubDescription club={club} />
          
          {/* Members - отдельный stream */}
          <Suspense fallback={<MembersSkeleton />}>
            <ClubMembersAsync clubId={id} />
          </Suspense>
          
          {/* Events - отдельный stream */}
          <Suspense fallback={<EventsSkeleton />}>
            <ClubEventsAsync clubId={id} />
          </Suspense>
        </div>
        
        {/* Sidebar - параллельно */}
        <Suspense fallback={<SubscriptionSkeleton />}>
          <ClubSubscriptionAsync clubId={id} />
        </Suspense>
      </div>
    </>
  );
}
```

**Создать async компоненты:**
- `<ClubMembersAsync />`
- `<ClubEventsAsync />`
- `<ClubSubscriptionAsync />`

---

### 2.3 Event Details Page (2 часа)

**Аналогично:** Разбить на части с Suspense

```typescript
// app/events/[id]/page.tsx
export default async function EventDetailsPage({ params }) {
  const { id } = await params;
  const event = await getEventById(id);
  
  return (
    <>
      <EventHeader event={event} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EventDetails event={event} />
          
          <Suspense fallback={<ParticipantsSkeleton />}>
            <ParticipantsTableAsync eventId={id} />
          </Suspense>
        </div>
        
        <Suspense fallback={<RegistrationSkeleton />}>
          <RegistrationCardAsync eventId={id} />
        </Suspense>
      </div>
    </>
  );
}
```

---

## **Этап 3: Client Components + Transitions** (6-8 часов)

### 3.1 Clubs List Page (3 часа)

**Текущая проблема:** При пагинации - резкая смена контента

**Решение:** `useTransition` + delayed skeleton

```typescript
// app/clubs/page.tsx
export default function ClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { isPending, showLoading, startTransition } = useLoadingTransition();
  
  const handlePageChange = (page: number) => {
    startTransition(async () => {
      const data = await fetch(`/api/clubs?page=${page}`);
      const result = await data.json();
      setClubs(result.clubs);
      setCurrentPage(page);
    });
  };
  
  return (
    <>
      {/* Контент с opacity при transition */}
      <div className={cn(
        "transition-opacity duration-200",
        isPending && "opacity-50"
      )}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clubs.map(club => <ClubCard key={club.id} club={club} />)}
        </div>
      </div>
      
      {/* Skeleton поверх при длительной загрузке */}
      {showLoading && (
        <div className="absolute inset-0 bg-white/80">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <ClubCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}
      
      <Pagination 
        currentPage={currentPage}
        onPageChange={handlePageChange}
        disabled={isPending}
      />
    </>
  );
}
```

**Изменения:**
- Использовать `useLoadingTransition`
- Добавить opacity transition
- Skeleton появляется только при долгой загрузке
- Disable пагинацию во время загрузки

---

### 3.2 Events Page (3 часа)

**Аналогично Clubs:**
- `useTransition` для фильтров
- Delayed skeleton
- Плавные переходы

```typescript
// components/events/events-grid.tsx
export function EventsGrid({ events, currentUserId, isAuthenticated }) {
  const [filteredEvents, setFilteredEvents] = useState(events);
  const { isPending, showLoading, startTransition } = useLoadingTransition();
  
  const handleFilterChange = (filters: Filters) => {
    startTransition(() => {
      // Применяем фильтры
      const filtered = applyFilters(events, filters);
      setFilteredEvents(filtered);
    });
  };
  
  return (
    <div className="space-y-8">
      <EventFilters onChange={handleFilterChange} disabled={isPending} />
      
      <div className={cn(
        "transition-opacity duration-200",
        isPending && "opacity-50"
      )}>
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      
      {showLoading && (
        <div className="absolute inset-0 bg-white/80">
          <EventGridSkeleton count={6} />
        </div>
      )}
    </div>
  );
}
```

---

## **Этап 4: Optimistic UI** (4-6 часов)

### 4.1 Event Registration (2 часа)

**Сценарий:** Пользователь регистрируется на событие

**Optimistic UI:**
```typescript
// components/events/registration-card.tsx
export function RegistrationCard({ eventId, currentParticipantsCount }) {
  const [participants, setParticipants] = useState(currentParticipantsCount);
  const { optimisticState, addOptimistic } = useOptimisticState(
    { registered: false, count: participants },
    (state, newState) => newState
  );
  
  const handleRegister = async () => {
    // 1. Мгновенно обновляем UI
    addOptimistic({ 
      registered: true, 
      count: participants + 1 
    });
    
    try {
      // 2. Отправляем запрос
      await registerForEvent(eventId);
      
      // 3. Подтверждаем изменения
      setParticipants(p => p + 1);
      toast.success("Вы зарегистрированы!");
    } catch (error) {
      // 4. Откатываем при ошибке
      toast.error("Не удалось зарегистрироваться");
    }
  };
  
  return (
    <Card>
      <p>Участников: {optimisticState.count}</p>
      <Button 
        onClick={handleRegister}
        disabled={optimisticState.registered}
      >
        {optimisticState.registered ? "Зарегистрирован" : "Регистрация"}
      </Button>
    </Card>
  );
}
```

---

### 4.2 Club Member Management (2 часа)

**Сценарий:** Добавление/удаление участника клуба

```typescript
// components/clubs/club-members-list.tsx
export function ClubMembersList({ clubId, initialMembers }) {
  const { optimisticState: members, addOptimistic } = useOptimisticState(
    initialMembers,
    (state, action) => {
      switch (action.type) {
        case 'add':
          return [...state, action.member];
        case 'remove':
          return state.filter(m => m.id !== action.memberId);
        case 'update':
          return state.map(m => 
            m.id === action.memberId ? { ...m, ...action.updates } : m
          );
        default:
          return state;
      }
    }
  );
  
  const handleRemoveMember = async (memberId: string) => {
    // Optimistic remove
    addOptimistic({ type: 'remove', memberId });
    
    try {
      await removeMember(clubId, memberId);
      toast.success("Участник удален");
    } catch (error) {
      // Откат - перезагружаем список
      router.refresh();
      toast.error("Ошибка удаления");
    }
  };
  
  return (
    <div className="space-y-3">
      {members.map(member => (
        <MemberCard 
          key={member.id} 
          member={member}
          onRemove={() => handleRemoveMember(member.id)}
        />
      ))}
    </div>
  );
}
```

---

### 4.3 Form Submissions (2 часа)

**Сценарий:** Создание события/клуба

```typescript
// components/events/event-form.tsx
export function EventForm({ clubId, onSuccess }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        // Optimistic navigation
        router.push('/events?optimistic=true');
        
        // Создаем событие
        const event = await createEvent(formData);
        
        // Подтверждаем и переходим
        router.push(`/events/${event.id}`);
        toast.success("Событие создано!");
      } catch (error) {
        // Возвращаемся обратно
        router.back();
        toast.error("Ошибка создания");
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... поля ... */}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Создаём..." : "Создать событие"}
      </Button>
    </form>
  );
}
```

---

## **Этап 5: Progressive Loading** (4-6 часов)

### 5.1 Infinite Scroll для списков (3 часа)

**Альтернатива пагинации:**

```typescript
// components/clubs/clubs-infinite-list.tsx
export function ClubsInfiniteList() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { isPending, startTransition } = useLoadingTransition();
  
  const loadMore = () => {
    startTransition(async () => {
      const { clubs: newClubs, hasMore } = await fetchClubs(page + 1);
      setClubs(prev => [...prev, ...newClubs]);
      setPage(p => p + 1);
      setHasMore(hasMore);
    });
  };
  
  return (
    <InfiniteScroll
      dataLength={clubs.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<ClubCardSkeleton />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clubs.map(club => <ClubCard key={club.id} club={club} />)}
      </div>
    </InfiniteScroll>
  );
}
```

**Установить:**
```bash
npm install react-infinite-scroll-component
```

---

### 5.2 Lazy Loading Images (2 часа)

**Оптимизация картинок:**

```typescript
// components/ui/optimized-image.tsx
export function OptimizedImage({ src, alt, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!imgRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );
    
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div className="relative overflow-hidden bg-[#F7F7F8]" {...props}>
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-[#F7F7F8]" />
      )}
    </div>
  );
}
```

---

### 5.3 Prefetching Links (1 час)

**Предзагрузка страниц:**

```typescript
// components/ui/prefetch-link.tsx
export function PrefetchLink({ href, children, ...props }) {
  const router = useRouter();
  
  const handleMouseEnter = () => {
    router.prefetch(href);
  };
  
  return (
    <Link 
      href={href} 
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </Link>
  );
}
```

**Использовать везде:**
- Карточки клубов
- Карточки событий
- Navigation links

---

## **Этап 6: Polish & Testing** (4-6 часов)

### 6.1 Error Boundaries (2 часа)

```typescript
// components/ui/error-boundary.tsx
export class LoadingErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    console.error('Loading error:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12">
          <p className="text-red-600">Ошибка загрузки</p>
          <Button onClick={() => window.location.reload()}>
            Обновить страницу
          </Button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

### 6.2 Loading States Guide (2 часа)

**Создать документацию:**

```markdown
# Loading States Guide

## Когда использовать что:

### Skeleton
- Списки (клубы, события)
- Таблицы
- Формы
- Профили

### Spinner
- Кнопки
- Модальные окна
- Inline операции

### Delayed Skeleton
- Пагинация
- Фильтры
- Поиск

### Optimistic UI
- Регистрация на событие
- Добавление участника
- Лайки/подписки

## Примеры кода:
...
```

---

### 6.3 Performance Testing (2 часа)

**Проверить:**
1. Lighthouse score (target: 90+)
2. FCP (First Contentful Paint) < 1.5s
3. LCP (Largest Contentful Paint) < 2.5s
4. CLS (Cumulative Layout Shift) < 0.1
5. INP (Interaction to Next Paint) < 200ms

**Инструменты:**
```bash
# Lighthouse
npx lighthouse https://need4trip.app --view

# Web Vitals
npm install web-vitals
```

---

## 📊 Итоговая оценка времени

| Этап | Задача | Время |
|------|--------|-------|
| **1** | Фундамент (hooks + skeletons) | 4-6 ч |
| **2** | Streaming SSR | 6-8 ч |
| **3** | Transitions | 6-8 ч |
| **4** | Optimistic UI | 4-6 ч |
| **5** | Progressive Loading | 4-6 ч |
| **6** | Polish & Testing | 4-6 ч |
| | **ИТОГО** | **28-40 ч** |

**Реалистично:** 3-5 дней полной работы

---

## 🎯 Приоритеты

### Must Have (Обязательно)
1. ✅ Delayed skeleton (избежать flash)
2. ✅ useTransition для пагинации/фильтров
3. ✅ Streaming SSR для детальных страниц
4. ✅ Базовые skeleton компоненты

### Should Have (Желательно)
1. ✅ Optimistic UI для регистраций
2. ✅ Progressive loading списков
3. ✅ Prefetching links

### Nice to Have (Бонус)
1. ⭐ Infinite scroll
2. ⭐ Image lazy loading
3. ⭐ Advanced error boundaries

---

## 📝 Файлы для создания (≈30 файлов)

### Hooks (3)
- `src/hooks/use-delayed-loading.ts`
- `src/hooks/use-optimistic-state.ts`
- `src/hooks/use-loading-transition.ts`

### Skeleton Components (6)
- `src/components/ui/skeletons/club-card-skeleton.tsx`
- `src/components/ui/skeletons/event-card-skeleton.tsx`
- `src/components/ui/skeletons/profile-skeleton.tsx`
- `src/components/ui/skeletons/form-skeleton.tsx`
- `src/components/ui/skeletons/table-skeleton.tsx`
- `src/components/ui/skeletons/index.ts`

### Wrappers (2)
- `src/components/ui/suspense-wrapper.tsx`
- `src/components/ui/delayed-spinner.tsx`

### Async Components (6)
- `src/app/_components/upcoming-events-async.tsx`
- `src/app/clubs/[id]/_components/members-async.tsx`
- `src/app/clubs/[id]/_components/events-async.tsx`
- `src/app/clubs/[id]/_components/subscription-async.tsx`
- `src/app/events/[id]/_components/participants-async.tsx`
- `src/app/events/[id]/_components/registration-async.tsx`

### Loading Files (3)
- `src/app/clubs/loading.tsx`
- `src/app/profile/loading.tsx`
- `src/app/pricing/loading.tsx`

### Updated Pages (8)
- `src/app/page.tsx`
- `src/app/clubs/page.tsx`
- `src/app/clubs/[id]/page.tsx`
- `src/app/events/page.tsx`
- `src/app/events/[id]/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/profile/edit/page.tsx`
- `src/app/pricing/page.tsx`

### Documentation (2)
- `docs/LOADING_STATES_GUIDE.md`
- `docs/LOADING_SYSTEM_ARCHITECTURE.md`

---

## ⚠️ Риски и митигация

### Риск 1: Over-engineering
**Проблема:** Слишком сложная система для текущего масштаба

**Митигация:**
- Начать с базовых паттернов
- Добавлять сложные фичи по необходимости
- Замерять реальное влияние на UX

### Риск 2: Регрессии
**Проблема:** Ломаем существующий функционал

**Митигация:**
- Тестировать каждый этап отдельно
- Использовать feature flags
- Делать коммиты после каждого этапа

### Риск 3: Performance Overhead
**Проблема:** Skeleton/transitions замедляют приложение

**Митигация:**
- Замерять производительность
- Использовать React DevTools Profiler
- Оптимизировать если FPS < 60

---

## 🚀 Порядок реализации (рекомендуемый)

### День 1 (8 ч):
- ✅ Этап 1.1: Hooks (2 ч)
- ✅ Этап 1.2: Skeleton компоненты (2 ч)
- ✅ Этап 1.3: Wrappers (2 ч)
- ✅ Этап 2.1: Homepage streaming (2 ч)

### День 2 (8 ч):
- ✅ Этап 2.2: Club Details streaming (2 ч)
- ✅ Этап 2.3: Event Details streaming (2 ч)
- ✅ Этап 3.1: Clubs List transitions (2 ч)
- ✅ Этап 3.2: Events Grid transitions (2 ч)

### День 3 (8 ч):
- ✅ Этап 4.1: Event Registration optimistic (2 ч)
- ✅ Этап 4.2: Club Members optimistic (2 ч)
- ✅ Этап 4.3: Form Submissions optimistic (2 ч)
- ✅ Этап 5.1: Infinite Scroll (2 ч)

### День 4 (8 ч):
- ✅ Этап 5.2: Lazy Loading Images (2 ч)
- ✅ Этап 5.3: Prefetching Links (1 ч)
- ✅ Этап 6.1: Error Boundaries (2 ч)
- ✅ Этап 6.2: Documentation (2 ч)
- ✅ Этап 6.3: Testing (1 ч)

---

## ✅ Готово к старту?

**Следующий шаг:** Начинаем с Этапа 1.1 - создание hooks?

Или есть вопросы по плану? 🤔
