# 🏗️ Архитектура системы

Документация по архитектуре Need4Trip.

---

## 📋 Содержание

### 1. [System Overview](./system-overview.md)
Полный обзор архитектуры приложения:
- Frontend архитектура (Next.js 15 App Router)
- Backend архитектура (Server Components + API Routes)
- Database design
- Authentication flow
- Deployment architecture

### 2. [Database Schema](./database-schema.md)
Актуальная схема базы данных:
- Все таблицы с описанием
- Связи между таблицами
- Индексы и constraints
- RLS политики
- Миграции и версионирование

### 3. [Security](./security.md)
Безопасность API и данных:
- Authentication (Telegram Login)
- Authorization (RLS policies)
- API security best practices
- Input validation
- Error handling

---

## 🎯 Ключевые принципы архитектуры

### 1. Server-First Architecture
- Server Components по умолчанию
- Client Components только где нужна интерактивность
- Streaming SSR для быстрой загрузки

### 2. Type Safety
- 100% TypeScript
- Strict mode enabled
- Zod validation для всех inputs
- Generated types от Supabase

### 3. Performance
- Streaming SSR + Suspense boundaries
- Optimistic UI для мгновенного feedback
- Code splitting для меньших бандлов
- Image optimization

### 4. Maintainability
- Clean architecture (domain/infra separation)
- Consistent patterns
- Comprehensive error handling
- Extensive documentation

---

## 📊 Технический стек

### Frontend:
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.x
- **State:** React hooks, Server State
- **Forms:** Zod validation

### Backend:
- **API:** Next.js API Routes
- **Server Components:** React Server Components
- **Database:** Supabase (PostgreSQL 15)
- **Auth:** Telegram Login Widget
- **Storage:** Supabase Storage (future)

### DevOps:
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **CI/CD:** GitHub Actions
- **Monitoring:** Vercel Analytics

---

## 🔄 Data Flow

### 1. SSR Flow (Server Components):
```
Request → Server Component → Supabase → Render HTML → Stream to Client
```

### 2. Client Interaction Flow:
```
User Action → Client Component → API Route → Service → Repository → Supabase
                                    ↓
                            Response (JSON) → Update UI
```

### 3. Optimistic UI Flow:
```
User Action → Update UI immediately → API Call (background)
                ↓                          ↓
              Success                   Rollback on Error
```

---

## 📁 Структура кода

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── [pages]/           # Pages
│   └── _components/       # Async server components
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── [feature]/        # Feature-specific components
│
├── lib/
│   ├── db/               # Database repositories
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   └── errors.ts         # Error classes
│
└── hooks/                # React hooks
```

---

## 🔐 Security Model

### Authentication:
- Telegram Login Widget (OAuth)
- Session stored in HTTP-only cookies
- JWT tokens (future integration)

### Authorization:
- Row Level Security (RLS) в Supabase
- Role-based access (owner/organizer/member)
- API middleware для проверки прав

### Data Protection:
- Input validation (Zod schemas)
- SQL injection protection (Supabase ORM)
- XSS protection (React auto-escaping)
- CSRF protection (SameSite cookies)

---

## 📈 Scalability

### Current:
- Serverless architecture (Vercel)
- Auto-scaling database (Supabase)
- CDN для статики

### Future:
- Redis для кэширования
- Background jobs (webhooks, cron)
- Real-time updates (Supabase Realtime)
- File uploads (Supabase Storage)

---

## 🔍 Monitoring

### Performance:
- Vercel Analytics
- Web Vitals tracking
- Server-side logging

### Errors:
- Structured error handling
- Error boundaries (React)
- API error responses (402, 404, etc.)

---

## 📚 Дополнительно

- **Database Schema:** [database-schema.md](./database-schema.md)
- **Security Details:** [security.md](./security.md)
- **API Design:** [System Overview - API Section](./system-overview.md#api-design)

---

**Last Updated:** 16 декабря 2024
