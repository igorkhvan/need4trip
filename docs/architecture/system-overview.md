# Need4Trip - Полный обзор системы

> **Дата:** 12 декабря 2025  
> **Назначение:** Комплексная документация для анализа и планирования развития

---

## 📋 Содержание

1. [Общее описание](#общее-описание)
2. [Функциональные возможности](#функциональные-возможности)
3. [Техническая архитектура](#техническая-архитектура)
4. [База данных](#база-данных)
5. [API Endpoints](#api-endpoints)
6. [Компоненты UI](#компоненты-ui)
7. [Система аутентификации](#система-аутентификации)
8. [Бизнес-логика](#бизнес-логика)
9. [UX паттерны](#ux-паттерны)
10. [Текущие ограничения](#текущие-ограничения)

---

## 🎯 Общее описание

**Need4Trip** - это веб-приложение для организации и управления мероприятиями (автопутешествия, походы, мотопробеги и другие активности).

### Основная цель
Упростить процесс создания событий, регистрации участников и управления мероприятиями с гибкой системой кастомных полей регистрации.

### Целевая аудитория
- Организаторы мероприятий (клубы, сообщества)
- Участники мероприятий
- Гостевые пользователи (без регистрации)

---

## ✅ Функциональные возможности

### 1. Управление событиями

#### 1.1 Создание событий
- ✅ Базовая информация:
  - Название события
  - Описание (Markdown с превью)
  - Дата и время
  - Локация (город/регион)
  - Категория (автопутешествие, поход, мотопробег, велопробег, другое)
- ✅ Параметры регистрации:
  - Максимальное количество участников
  - Цена участия (платное/бесплатное)
  - Тип события (клубное/открытое)
- ✅ Кастомные поля регистрации:
  - Текстовые поля
  - Выбор из списка (dropdown)
  - Обязательные/необязательные поля
  - Динамическое добавление/удаление

#### 1.2 Редактирование событий
- ✅ Полное редактирование всех полей
- ✅ Умное управление кастомными полями:
  - Если есть участники: нельзя удалять существующие поля и менять их тип
  - Если есть участники: можно редактировать label, options, required
  - Если есть участники: можно добавлять новые поля
  - Если нет участников: полная свобода редактирования
- ✅ Защита от потери данных:
  - Диалог подтверждения при закрытии (если есть изменения)
  - Кнопка "Назад" с тем же диалогом
- ✅ Skeleton loader при загрузке данных

#### 1.3 Просмотр событий
- ✅ Детальная страница события:
  - Полная информация о событии
  - Статус регистрации (открыта/закрыта/заполнено)
  - Визуальные индикаторы:
    - Badges (статус, категория, тип, цена)
    - Progress bar заполненности
  - Кнопка регистрации (для незарегистрированных)
  - Список участников (таблица)
  - Кнопка редактирования (только для создателя)

#### 1.4 Список событий
- ✅ Главная страница:
  - Сетка карточек событий
  - Фильтрация по категориям (табы)
  - Поиск по названию
  - Статистика (всего событий, участников, локаций)
- ✅ Карточка события:
  - Название, дата, локация
  - Категория (badge с иконкой)
  - Progress bar заполненности
  - Статус (скоро начнется, почти заполнено, регистрация открыта)
  - Быстрый доступ к деталям

#### 1.5 Права доступа
- ✅ Создатель события может:
  - Редактировать событие
  - Видеть всех участников
  - Удалять регистрации участников
- ✅ Участник может:
  - Редактировать свою регистрацию
  - Отменить регистрацию
- ✅ Гость может:
  - Просматривать события
  - Регистрироваться (с гостевой сессией)

---

### 2. Регистрация на события

#### 2.1 Создание регистрации
- ✅ Модальное окно регистрации
- ✅ Автозаполнение имени:
  - Для Telegram пользователей: из профиля
  - Приоритет: name → telegramHandle → email → user ID
- ✅ Обязательные поля:
  - Имя участника (редактируемое)
  - Роль (водитель/пассажир/организатор)
  - Телефон
  - Город
  - Email
  - Тип транспорта (автомобиль/мотоцикл/велосипед)
- ✅ Кастомные поля:
  - Динамические поля согласно настройкам события
  - Валидация обязательных полей
- ✅ Валидация:
  - Клиентская (моментальная обратная связь)
  - Серверная (проверка лимитов и дубликатов)

#### 2.2 Редактирование регистрации
- ✅ Та же форма в режиме "edit"
- ✅ Предзаполнение всех полей текущими значениями
- ✅ Имя берется из регистрации (не из Telegram)
- ✅ Сохранение изменений через API

#### 2.3 Отмена регистрации
- ✅ Диалог подтверждения
- ✅ Мгновенное обновление UI
- ✅ Освобождение места для других участников

#### 2.4 Управление участниками (для создателя)
- ✅ Таблица всех участников
- ✅ Действия для каждого участника:
  - Удаление регистрации
  - Просмотр всех полей (включая кастомные)

---

### 3. Система аутентификации

#### 3.1 Telegram Login
- ✅ Интеграция с Telegram Login Widget
- ✅ OAuth авторизация через Telegram
- ✅ Автоматическое создание/обновление профиля:
  - telegram_id (уникальный идентификатор)
  - telegram_handle (@username)
  - name (имя из Telegram)
  - avatar_url (фото профиля)
- ✅ JWT токен в HTTP-only cookie
- ✅ Защита от дублирования пользователей:
  - Поиск по telegram_id при входе
  - Обновление существующего пользователя (не создание нового)
  - Сохранение user.id между сессиями

#### 3.2 Гостевой доступ
- ✅ Уникальный гостевой session ID (UUID)
- ✅ Хранение в cookie (60 дней)
- ✅ Привязка регистраций к гостевой сессии
- ✅ Права на редактирование своих регистраций

#### 3.3 Управление сессией
- ✅ Logout (очистка токена и кеша)
- ✅ Автоматическая верификация токена
- ✅ Middleware для защищенных роутов
- ✅ Revalidation cache после login/logout

---

### 4. UI/UX система

#### 4.1 Дизайн-система (Figma-based)
- ✅ Цветовая палитра:
  - Primary: `#16A34A` (зеленый)
  - Secondary: `#10B981`, `#EF4444`, `#F59E0B`, `#8B5CF6`, `#3B82F6`
  - Neutral: `#F7F7F8`, `#E5E7EB`, `#6B7280`, `#111827`
- ✅ Типография:
  - Шрифт: Inter (системный fallback)
  - Размеры: xs(12px), sm(14px), base(16px), lg(18px), xl(20px)
- ✅ Spacing: 4px grid (4, 8, 12, 16, 24, 32, 48, 64px)
- ✅ Радиусы: sm(4px), md(8px), lg(12px), xl(16px), 2xl(24px)

#### 4.2 Компонентная система (shadcn/ui)
**Базовые компоненты:**
- ✅ Button (variants: default, destructive, outline, ghost, link)
- ✅ Input (text, email, tel, number)
- ✅ Textarea (с авторазмером)
- ✅ Select (dropdown с поиском)
- ✅ Checkbox
- ✅ Dialog (модальные окна)
- ✅ Table (адаптивная таблица)
- ✅ Card (контейнер с тенью)
- ✅ Label (метки для форм)
- ✅ Tabs (переключатели)

**Кастомные компоненты:**
- ✅ **Badge** (13 вариантов):
  - Subtle: registration-open, starting-soon, almost-full, completed, neutral, attention
  - Solid: solid-orange, solid-blue, solid-purple, solid-yellow, solid-cyan, solid-gray
  - Special: paid (#8B5CF6), free (#10B981), club (#16A34A)
  - Размеры: sm, md, lg
- ✅ **ProgressBar**:
  - Динамическая окраска (зеленый → оранжевый → красный)
  - Опциональная метка
  - Размеры: sm, md, lg
  - Утилита: `calculateEventFillPercentage(current, max)`
- ✅ **Spinner**:
  - Анимированный индикатор загрузки
  - Размеры: sm, md, lg
- ✅ **PageLoader**:
  - Спиннер + текст
  - Для локальных областей
- ✅ **FullPageLoader**:
  - Полноэкранный лоадер с брендингом
  - Для переходов между страницами
- ✅ **ConfirmDialog**:
  - Диалог подтверждения действий
  - Настраиваемые заголовок, текст, кнопки
- ✅ **MarkdownEditor**:
  - Textarea + Markdown превью
  - Переключатель режимов (редактирование/превью)

#### 4.3 Loading система
**Иерархия loading.tsx:**
```
app/
  loading.tsx                    → FullPageLoader (корневой)
  events/
    loading.tsx                  → Skeleton сетки карточек
    [id]/
      layout.tsx                 → Изоляция сегмента
      loading.tsx                → Skeleton деталей события
    create/
      loading.tsx                → Skeleton формы создания
    [id]/edit/
      page.tsx                   → CSR skeleton (внутри компонента)
```

**Принципы:**
- Каждый уровень имеет специфичный skeleton
- Текстовые индикаторы различаются:
  - "Загружаем список событий..."
  - "Загружаем детали события..."
  - "Подготовка формы..."
  - "Загрузка данных события..."

---

## 🏗️ Техническая архитектура

### Технологический стек

#### Frontend
- **Framework:** Next.js 14 (App Router)
- **Язык:** TypeScript 5.3
- **Styling:** Tailwind CSS 3.4
- **UI Components:** shadcn/ui (Radix UI)
- **Icons:** Lucide React
- **Markdown:** react-markdown, remark-gfm

#### Backend
- **Runtime:** Node.js 20+
- **API:** Next.js API Routes (Route Handlers)
- **Validation:** Zod
- **Database Client:** @supabase/supabase-js
- **Authentication:** JWT (jsonwebtoken)

#### Database
- **Provider:** Supabase (PostgreSQL 15)
- **ORM:** Raw SQL queries через Supabase client
- **Migrations:** SQL файлы в `/supabase/migrations`

#### DevOps
- **Hosting:** Vercel (предположительно)
- **Version Control:** Git + GitHub
- **Package Manager:** npm/yarn/pnpm

---

### Структура проекта

```
need4trip/
├── src/
│   ├── app/                          # App Router pages
│   │   ├── layout.tsx                # Root layout (metadata, fonts)
│   │   ├── loading.tsx               # Root loader
│   │   ├── page.tsx                  # Главная страница (список событий)
│   │   ├── events/
│   │   │   ├── loading.tsx           # Loader списка
│   │   │   ├── create/
│   │   │   │   ├── loading.tsx       # Loader создания
│   │   │   │   └── page.tsx          # Страница создания события
│   │   │   └── [id]/
│   │   │       ├── layout.tsx        # Layout для изоляции
│   │   │       ├── loading.tsx       # Loader деталей
│   │   │       ├── page.tsx          # Детали события
│   │   │       └── edit/
│   │   │           └── page.tsx      # Редактирование события (CSR)
│   │   └── api/                      # API Routes
│   │       ├── events/
│   │       │   ├── route.ts          # GET /api/events, POST /api/events
│   │       │   └── [id]/
│   │       │       ├── route.ts      # GET /api/events/:id, PUT, DELETE
│   │       │       └── participants/
│   │       │           ├── route.ts  # GET, POST participants
│   │       │           └── [participantId]/
│   │       │               └── route.ts  # PUT, DELETE participant
│   │       └── auth/
│   │           ├── telegram/
│   │           │   └── route.ts      # POST /api/auth/telegram (login)
│   │           ├── logout/
│   │           │   └── route.ts      # POST /api/auth/logout
│   │           └── me/
│   │               └── route.ts      # GET /api/auth/me (current user)
│   │
│   ├── components/                   # React компоненты
│   │   ├── ui/                       # Базовые UI (shadcn/ui)
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── full-page-loader.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── page-loader.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   ├── select.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── textarea.tsx
│   │   ├── layout/                   # Layout компоненты
│   │   │   ├── main-header.tsx       # Шапка сайта
│   │   │   └── footer.tsx            # Футер
│   │   └── events/                   # Событийные компоненты
│   │       ├── event-form.tsx        # Универсальная форма события
│   │       ├── event-card.tsx        # Карточка события
│   │       ├── events-grid.tsx       # Сетка событий
│   │       ├── participant-modal.tsx # Модалка регистрации
│   │       ├── participant-form.tsx  # Форма регистрации
│   │       └── markdown-editor.tsx   # Markdown редактор
│   │
│   ├── lib/                          # Бизнес-логика и утилиты
│   │   ├── db/                       # Database repositories
│   │   │   ├── client.ts             # Supabase client
│   │   │   ├── eventRepo.ts          # CRUD для events
│   │   │   ├── participantRepo.ts    # CRUD для participants
│   │   │   └── userRepo.ts           # CRUD для users
│   │   ├── services/                 # Бизнес-логика
│   │   │   ├── events.ts             # Event service (валидация, permissions)
│   │   │   └── participants.ts       # Participant service
│   │   ├── auth/                     # Аутентификация
│   │   │   ├── jwt.ts                # JWT создание/верификация
│   │   │   ├── telegram.ts           # Telegram auth helpers
│   │   │   ├── guestSession.ts       # Гостевые сессии
│   │   │   └── currentUser.ts        # Middleware для получения user
│   │   ├── utils/                    # Утилиты
│   │   │   ├── api.ts                # API helpers (respondSuccess, respondError)
│   │   │   ├── dates.ts              # Форматирование дат
│   │   │   ├── errors.ts             # Обработка ошибок (handleApiError)
│   │   │   ├── eventCategories.ts    # Категории событий (labels, icons)
│   │   │   └── customFields.ts       # Работа с кастомными полями
│   │   └── types/                    # TypeScript types
│   │       ├── database.ts           # Типы БД
│   │       ├── event.ts              # Event types
│   │       ├── participant.ts        # Participant types
│   │       └── user.ts               # User types
│   │
│   └── middleware.ts                 # Next.js middleware (auth checks)
│
├── supabase/
│   └── migrations/                   # SQL миграции
│       ├── 20241201_initial_schema.sql
│       ├── 20241209_add_guest_session_id.sql
│       ├── 20241209_fix_telegram_user_duplicates.sql
│       └── 20241209_cleanup_empty_telegram_users.sql
│
├── public/                           # Статические файлы
│   └── ...
│
├── docs/                             # Документация
│   ├── CODE_OPTIMIZATION_REPORT.md
│   ├── PROGRESS_BAR_SYSTEM.md
│   └── SYSTEM_OVERVIEW.md (этот файл)
│
├── .env.local                        # Environment variables
├── tailwind.config.ts                # Tailwind конфигурация
├── tsconfig.json                     # TypeScript конфигурация
├── next.config.js                    # Next.js конфигурация
└── package.json                      # Dependencies
```

---

## 🗄️ База данных

### Схема базы данных

#### Таблица: `users`
Хранит информацию о пользователях (Telegram и гостевые).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,              -- Telegram user ID (null для гостей)
  telegram_handle TEXT,                   -- @username
  name TEXT,                              -- Имя из Telegram
  email TEXT,                             -- Email (опционально)
  avatar_url TEXT,                        -- URL фото профиля
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

**Особенности:**
- `telegram_id` уникален для Telegram пользователей
- Гостевые пользователи имеют `telegram_id = null`
- `id` (UUID) - основной идентификатор, сохраняется между логинами

---

#### Таблица: `events`
Хранит информацию о событиях.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  category TEXT,                          -- 'road-trip' | 'hiking' | 'motorbike' | ...
  max_participants INT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  is_club_event BOOLEAN DEFAULT false,
  custom_fields_schema JSONB DEFAULT '[]',  -- Схема кастомных полей
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_date_time ON events(date_time);
CREATE INDEX idx_events_category ON events(category);
```

**Структура `custom_fields_schema`:**
```typescript
type CustomFieldSchema = {
  id: string;          // UUID
  label: string;       // "Опыт вождения"
  type: 'text' | 'select';
  required: boolean;
  options?: string[];  // Для type='select'
}[];
```

---

#### Таблица: `participants`
Хранит регистрации участников на события.

```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_session_id UUID,                  -- Для гостей
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,                     -- 'driver' | 'passenger' | 'organizer'
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  email TEXT NOT NULL,
  vehicle_type TEXT,                      -- 'car' | 'motorcycle' | 'bicycle'
  custom_fields JSONB DEFAULT '{}',       -- Значения кастомных полей
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, guest_session_id)
);

-- Индексы
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_participants_guest_session_id ON participants(guest_session_id);
```

**Структура `custom_fields`:**
```typescript
type CustomFieldValues = {
  [fieldId: string]: string;  // { "field-uuid": "значение" }
};
```

**Ограничения:**
- Один user может зарегистрироваться на событие только один раз
- Один guest_session_id может зарегистрироваться на событие только один раз

---

#### Таблица: `event_user_access` (опциональная)
Для управления доступом к приватным событиям.

```sql
CREATE TABLE event_user_access (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (event_id, user_id)
);
```

---

### Миграции

**Список миграций:**
1. `20241201_initial_schema.sql` - Начальная схема БД
2. `20241209_add_guest_session_id.sql` - Добавление поддержки гостей
3. `20241209_fix_telegram_user_duplicates.sql` - Исправление дублей пользователей
4. `20241209_cleanup_empty_telegram_users.sql` - Очистка пустых пользователей

**Процесс миграций:**
- Файлы хранятся в `/supabase/migrations`
- Применяются вручную через Supabase Dashboard или CLI
- Каждая миграция имеет префикс с датой (YYYYMMDD)

---

## 🔌 API Endpoints

### Authentication

#### `POST /api/auth/telegram`
Авторизация через Telegram.

**Body:**
```typescript
{
  id: number;           // Telegram user ID
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;         // Подпись Telegram
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      name: string;
      telegramHandle: string;
      avatarUrl: string;
    }
  }
}
```

**Errors:**
- 400: Некорректные данные
- 401: Неверная подпись Telegram

**Side effects:**
- Устанавливает JWT в HTTP-only cookie (`auth_token`)
- Создает или обновляет пользователя в БД
- Revalidates Next.js cache

---

#### `POST /api/auth/logout`
Выход из системы.

**Response (200):**
```typescript
{
  success: true,
  message: "Logged out successfully"
}
```

**Side effects:**
- Удаляет cookie `auth_token`
- Revalidates Next.js cache

---

#### `GET /api/auth/me`
Получение текущего пользователя.

**Response (200):**
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      name: string;
      email?: string;
      telegramHandle?: string;
      avatarUrl?: string;
    } | null
  }
}
```

**Errors:**
- 401: Не авторизован

---

### Events

#### `GET /api/events`
Получение списка всех событий.

**Query params:**
- `category?: string` - Фильтр по категории
- `search?: string` - Поиск по названию

**Response (200):**
```typescript
{
  success: true,
  data: {
    events: Event[];
  }
}
```

**Event type:**
```typescript
type Event = {
  id: string;
  title: string;
  description: string;
  dateTime: string;     // ISO 8601
  location: string;
  category: EventCategory | null;
  maxParticipants: number;
  currentParticipants: number;
  price: number;
  isClubEvent: boolean;
  customFieldsSchema: CustomFieldSchema[];
  createdBy: string;    // user ID
  isOwner: boolean;     // Является ли текущий user создателем
};
```

---

#### `POST /api/events`
Создание нового события.

**Body:**
```typescript
{
  title: string;
  description: string;
  dateTime: string;     // ISO 8601
  location: string;
  category: EventCategory | null;
  maxParticipants: number;
  price: number;
  isClubEvent: boolean;
  customFieldsSchema: CustomFieldSchema[];
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    event: Event;
  }
}
```

**Errors:**
- 401: Не авторизован (требуется Telegram login)
- 400: Валидация не пройдена

---

#### `GET /api/events/[id]`
Получение деталей события.

**Response (200):**
```typescript
{
  success: true,
  data: {
    event: Event & {
      participants: Participant[];
      hasParticipants: boolean;
      isRegistered: boolean;      // Зарегистрирован ли текущий user
      currentUserParticipantId?: string;
    }
  }
}
```

**Errors:**
- 404: Событие не найдено

---

#### `PUT /api/events/[id]`
Обновление события.

**Body:** (те же поля что и при создании)

**Response (200):**
```typescript
{
  success: true,
  data: {
    event: Event;
  }
}
```

**Errors:**
- 401: Не авторизован
- 403: Не создатель события
- 400: Валидация не пройдена
- 409: Нельзя удалять/изменять кастомные поля (есть участники)

**Валидация кастомных полей:**
- Если есть участники:
  - ❌ Нельзя удалять существующие поля
  - ❌ Нельзя менять тип поля
  - ✅ Можно редактировать label, options, required
  - ✅ Можно добавлять новые поля

---

#### `DELETE /api/events/[id]`
Удаление события.

**Response (200):**
```typescript
{
  success: true,
  message: "Event deleted successfully"
}
```

**Errors:**
- 401: Не авторизован
- 403: Не создатель события
- 404: Событие не найдено

---

### Participants

#### `GET /api/events/[id]/participants`
Получение списка участников события.

**Response (200):**
```typescript
{
  success: true,
  data: {
    participants: Participant[];
  }
}
```

**Participant type:**
```typescript
type Participant = {
  id: string;
  eventId: string;
  userId: string;
  guestSessionId: string | null;
  displayName: string;
  role: 'driver' | 'passenger' | 'organizer';
  phone: string;
  city: string;
  email: string;
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | null;
  customFields: { [fieldId: string]: string };
  registeredAt: string; // ISO 8601
};
```

---

#### `POST /api/events/[id]/participants`
Регистрация на событие.

**Body:**
```typescript
{
  displayName: string;
  role: string;
  phone: string;
  city: string;
  email: string;
  vehicleType?: string;
  customFields: { [fieldId: string]: string };
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    participant: Participant;
  }
}
```

**Errors:**
- 400: Валидация не пройдена
- 403: Регистрация закрыта (достигнут лимит)
- 409: Уже зарегистрирован

---

#### `PUT /api/events/[id]/participants/[participantId]`
Обновление регистрации.

**Body:** (те же поля что и при создании)

**Response (200):**
```typescript
{
  success: true,
  data: {
    participant: Participant;
  }
}
```

**Errors:**
- 401: Не авторизован
- 403: Не создатель события и не владелец регистрации
- 404: Регистрация не найдена

---

#### `DELETE /api/events/[id]/participants/[participantId]`
Отмена регистрации (удаление).

**Response (200):**
```typescript
{
  success: true,
  message: "Registration cancelled successfully"
}
```

**Errors:**
- 401: Не авторизован
- 403: Не создатель события и не владелец регистрации
- 404: Регистрация не найдена

---

## 🎨 Компоненты UI

### Layout компоненты

#### `MainHeader`
Шапка сайта с навигацией и авторизацией.

**Расположение:** `src/components/layout/main-header.tsx`

**Элементы:**
- Логотип / название сайта
- Навигация (События, О нас)
- Telegram Login Widget (если не авторизован)
- User menu (если авторизован):
  - Аватар + имя
  - Кнопка "Выход"

---

#### `Footer`
Футер сайта.

**Расположение:** `src/components/layout/footer.tsx`

**Элементы:**
- Копирайт
- Ссылки (опционально)

---

### Event компоненты

#### `EventForm`
Универсальная форма для создания и редактирования событий.

**Расположение:** `src/components/events/event-form.tsx`

**Props:**
```typescript
type EventFormProps = {
  mode: 'create' | 'edit';
  initialData?: Event;
  lockedFieldIds?: string[];  // ID полей, которые нельзя удалить
  onSuccess?: () => void;
  onCancel?: () => void;
  headerTitle?: string;
  headerDescription?: string;
};
```

**Особенности:**
- Единый компонент для create/edit (избегаем дублирования)
- Markdown editor для описания
- Динамические кастомные поля
- Защита от потери данных (ConfirmDialog)
- Умная валидация кастомных полей

---

#### `EventCard`
Карточка события для списков.

**Расположение:** `src/components/events/event-card.tsx`

**Props:**
```typescript
type EventCardProps = {
  event: Event;
};
```

**Элементы:**
- Название
- Дата, локация
- Категория (badge + иконка)
- Progress bar заполненности
- Статус badge (starting-soon, almost-full, etc.)

---

#### `EventsGrid`
Сетка карточек событий.

**Расположение:** `src/components/events/events-grid.tsx`

**Props:**
```typescript
type EventsGridProps = {
  events: Event[];
  emptyMessage?: string;
};
```

**Особенности:**
- Responsive grid (1/2/3 колонки)
- Использует EventCard
- Показывает "пусто" если нет событий

---

#### `ParticipantModal`
Модальное окно для регистрации на событие.

**Расположение:** `src/components/events/participant-modal.tsx`

**Props:**
```typescript
type ParticipantModalProps = {
  mode: 'create' | 'edit';
  event: Event;
  initialValues?: Participant;
  triggerLabel?: string;
  onSuccess?: () => void;
};
```

**Особенности:**
- Обертка над ParticipantForm
- Управление состоянием открытия/закрытия
- Автоматическое обновление UI после успеха

---

#### `ParticipantForm`
Форма регистрации участника.

**Расположение:** `src/components/events/participant-form.tsx`

**Props:**
```typescript
type ParticipantFormProps = {
  mode: 'create' | 'edit';
  event: Event;
  initialValues?: Participant;
  user: User | null;
  guestSessionId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
};
```

**Особенности:**
- Автозаполнение имени (для Telegram users)
- Динамические кастомные поля
- Клиентская + серверная валидация
- useRef + useEffect для корректной работы с async user data

---

#### `MarkdownEditor`
Редактор с превью Markdown.

**Расположение:** `src/components/events/markdown-editor.tsx`

**Props:**
```typescript
type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
};
```

**Элементы:**
- Tabs (Редактирование / Превью)
- Textarea (в режиме редактирования)
- Markdown render (в режиме превью)

---

### UI компоненты

#### `Badge`
Универсальный компонент для badges.

**Расположение:** `src/components/ui/badge.tsx`

**Props:**
```typescript
type BadgeProps = {
  variant?: 'registration-open' | 'starting-soon' | 'almost-full' | 
            'completed' | 'neutral' | 'attention' | 'solid-orange' | 
            'solid-blue' | 'solid-purple' | 'solid-yellow' | 'solid-cyan' | 
            'solid-gray' | 'paid' | 'free' | 'club';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
};
```

**Варианты:**
- **Subtle** (прозрачный фон + цветной текст):
  - `registration-open` - зеленый (#10B981)
  - `starting-soon` - оранжевый (#F59E0B)
  - `almost-full` - красный (#EF4444)
  - `completed` - серый (#6B7280)
  - `neutral` - серый
  - `attention` - оранжевый
- **Solid** (цветной фон + белый текст):
  - `solid-orange`, `solid-blue`, `solid-purple`, `solid-yellow`, `solid-cyan`, `solid-gray`
- **Special**:
  - `paid` - фиолетовый (#8B5CF6)
  - `free` - зеленый (#10B981)
  - `club` - темно-зеленый (#16A34A)

---

#### `ProgressBar`
Прогресс-бар с динамическим цветом.

**Расположение:** `src/components/ui/progress-bar.tsx`

**Props:**
```typescript
type ProgressBarProps = {
  value: number;        // 0-100
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};
```

**Логика цвета:**
- 0-70%: Зеленый (#10B981)
- 71-89%: Оранжевый (#F59E0B)
- 90-100%: Красный (#EF4444)

**Утилита:**
```typescript
calculateEventFillPercentage(currentCount: number, maxCount: number): number
```

---

#### `Spinner`
Анимированный индикатор загрузки.

**Расположение:** `src/components/ui/spinner.tsx`

**Props:**
```typescript
type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
};
```

---

#### `PageLoader`
Спиннер + текст для локальных областей.

**Расположение:** `src/components/ui/page-loader.tsx`

**Props:**
```typescript
type PageLoaderProps = {
  text?: string;
};
```

---

#### `FullPageLoader`
Полноэкранный лоадер с брендингом.

**Расположение:** `src/components/ui/full-page-loader.tsx`

**Элементы:**
- Логотип / брендинг
- Spinner
- Текст загрузки

---

#### `ConfirmDialog`
Диалог подтверждения.

**Расположение:** `src/components/ui/confirm-dialog.tsx`

**Props:**
```typescript
type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
};
```

**Использование:**
- Подтверждение удаления
- Подтверждение закрытия формы (с несохраненными изменениями)
- Подтверждение отмены регистрации

---

## 🔐 Система аутентификации

### Telegram OAuth

#### Процесс авторизации

1. **Пользователь нажимает на Telegram Login Widget**
   - Widget отображается в `MainHeader`
   - Конфигурация: `bot_id`, `auth_url`, `request_access`

2. **Telegram перенаправляет на callback URL**
   - URL: `/api/auth/telegram`
   - Передает: `id`, `first_name`, `last_name`, `username`, `photo_url`, `auth_date`, `hash`

3. **Сервер верифицирует подпись Telegram**
   - Проверка HMAC-SHA256 с `TELEGRAM_BOT_TOKEN`
   - Код: `src/lib/auth/telegram.ts` → `verifyTelegramAuth()`

4. **Создание/обновление пользователя**
   - Поиск по `telegram_id`
   - Если найден: обновление данных (name, handle, avatar)
   - Если не найден: создание нового пользователя
   - Код: `src/app/api/auth/telegram/route.ts`

5. **Создание JWT токена**
   - Payload: `{ userId: string, telegramId: number }`
   - Срок действия: 30 дней
   - Код: `src/lib/auth/jwt.ts` → `generateToken()`

6. **Установка cookie**
   - Имя: `auth_token`
   - Флаги: `httpOnly`, `secure` (prod), `sameSite: 'lax'`
   - Срок: 30 дней

7. **Revalidation cache**
   - `revalidatePath('/', 'layout')` для обновления UI

---

### Гостевой доступ

#### Процесс

1. **Создание гостевой сессии**
   - Генерация UUID при первом посещении
   - Сохранение в cookie `guest_session_id`
   - Срок: 60 дней
   - Код: `src/lib/auth/guestSession.ts`

2. **Привязка к регистрациям**
   - При регистрации: `guest_session_id` сохраняется в `participants`
   - Позволяет редактировать/удалять свои регистрации

3. **Ограничения**
   - Нельзя создавать события (требуется Telegram login)
   - Можно только регистрироваться и управлять своими регистрациями

---

### Проверка авторизации

#### Middleware
**Файл:** `src/middleware.ts`

**Защищенные роуты:**
- `/events/create` - требуется Telegram login
- `/events/[id]/edit` - требуется быть создателем

**Логика:**
```typescript
// 1. Проверка JWT токена
const token = cookies().get('auth_token');
if (!token) return redirectToLogin();

// 2. Верификация токена
const payload = verifyToken(token);
if (!payload) return redirectToLogin();

// 3. Для /edit: проверка ownership
const event = await getEvent(eventId);
if (event.createdBy !== payload.userId) return forbiddenResponse();
```

---

#### Server Component
**Функция:** `currentUser()`  
**Файл:** `src/lib/auth/currentUser.ts`

**Использование:**
```typescript
// В серверном компоненте или API route
const user = await currentUser();
if (!user) {
  // Не авторизован
}
```

**Логика:**
1. Читает JWT из cookie
2. Верифицирует токен
3. Загружает пользователя из БД
4. Возвращает User объект или null

---

### Logout

**Endpoint:** `POST /api/auth/logout`

**Процесс:**
1. Удаление cookie `auth_token`
2. Revalidation cache: `revalidatePath('/', 'layout')`
3. Возврат success response

---

## 📊 Бизнес-логика

### Event Service

**Файл:** `src/lib/services/events.ts`

#### Функции:

##### `createEvent(data, userId)`
- Валидация данных (Zod)
- Создание события в БД
- Возврат события

##### `updateEvent(eventId, data, userId)`
- Проверка ownership (только создатель может редактировать)
- Валидация кастомных полей:
  - Если есть участники: запрет на удаление/изменение типа существующих полей
  - Использует `validateCustomFieldsUpdate()`
- Обновление события в БД

##### `deleteEvent(eventId, userId)`
- Проверка ownership
- Удаление события (CASCADE удаляет участников)

##### `isEventOwner(eventId, userId)`
- Проверка, является ли userId создателем события

##### `validateCustomFieldsUpdate(existingSchema, newSchema, hasParticipants)`
- Если нет участников: любые изменения разрешены
- Если есть участники:
  - Проверка, что все ID из existingSchema присутствуют в newSchema
  - Проверка, что type не изменился для существующих полей
  - Throws ValidationError при нарушении

---

### Participant Service

**Файл:** `src/lib/services/participants.ts`

#### Функции:

##### `registerParticipant(eventId, data, userId, guestSessionId)`
- Проверка лимита участников
- Проверка дубликатов (user уже зарегистрирован)
- Валидация кастомных полей (соответствие схеме события)
- Создание участника в БД

##### `updateParticipant(participantId, data, userId, guestSessionId)`
- Проверка прав (создатель события или владелец регистрации)
- Валидация данных
- Обновление участника

##### `deleteParticipant(participantId, userId, guestSessionId)`
- Проверка прав
- Удаление участника из БД

##### `canManageParticipant(participantId, userId, guestSessionId)`
- Проверка, может ли текущий user управлять регистрацией
- Условия:
  - Создатель события, ИЛИ
  - Владелец регистрации (по userId или guestSessionId)

---

## 🎨 UX паттерны

### 1. Loading States

**Принципы:**
- Показываем skeleton максимально похожий на финальный UI
- Разные loaders для разных контекстов
- Текстовые индикаторы специфичны для каждой страницы

**Иерархия:**
```
Root loading          → FullPageLoader (брендированный)
/events loading       → Skeleton сетки карточек
/events/[id] loading  → Skeleton деталей
/events/create loading → Skeleton формы
/events/[id]/edit     → CSR skeleton (внутри компонента)
```

---

### 2. Error Handling

**Клиентская валидация:**
- Инлайн-ошибки под полями формы (красный текст)
- Disabled submit button при наличии ошибок
- Моментальная обратная связь при вводе

**Серверные ошибки:**
- API возвращает `{ success: false, error: "message" }`
- Клиент показывает ошибку в alert или toast (если есть)
- Логирование в console для дебага

**Утилита:** `src/lib/utils/errors.ts`
- `handleApiError(res: Response)` - парсинг ошибок API
- `getErrorMessage(error: unknown)` - безопасное извлечение сообщения

---

### 3. Защита от потери данных

**ConfirmDialog при закрытии форм:**
- Срабатывает если `hasUnsavedChanges === true`
- Показывается при:
  - Клик на "Отмена"
  - Клик на "Назад"
  - Попытка перехода на другую страницу (опционально)

**Состояние `hasUnsavedChanges`:**
- Отслеживается через `useEffect` сравнением текущих и начальных значений
- Сбрасывается после успешного сохранения

---

### 4. Оптимистичные обновления

**Не реализовано (потенциал для улучшения):**
- После успешной регистрации/удаления: жесткий refetch
- Можно добавить оптимистичное обновление UI до ответа сервера

**Текущий подход:**
1. User действие (например, регистрация)
2. API call
3. При success: закрытие модалки + `router.refresh()` или `window.location.reload()`
4. UI автоматически обновляется

---

### 5. Responsive Design

**Breakpoints (Tailwind):**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Адаптивность:**
- Сетка событий: 1 колонка (mobile) → 2 (tablet) → 3 (desktop)
- Таблица участников: горизонтальный скролл на mobile
- Формы: full-width на mobile, фиксированная ширина на desktop
- Header: hamburger menu на mobile (если будет реализовано)

---

### 6. Accessibility

**Частично реализовано:**
- Semantic HTML (button, nav, header, footer)
- Labels для всех input полей
- Focus states (outline на элементах)

**Не реализовано (потенциал):**
- ARIA атрибуты (роли, labels, describedby)
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader оптимизация

---

## ⚠️ Текущие ограничения

### Функциональные ограничения

1. **Нет системы уведомлений**
   - Участники не получают email/Telegram уведомления о событиях
   - Создатели не уведомляются о новых регистрациях

2. **Нет комментариев/чата**
   - Нельзя обсуждать событие в приложении
   - Нет Q&A для участников

3. **Нет календаря**
   - События показываются списком, нет view календаря

4. **Нет фильтрации по дате/локации**
   - Только фильтр по категории и поиск по названию

5. **Нет системы ролей (RBAC)**
   - Только "создатель" и "участник"
   - Нет модераторов/администраторов

6. **Нет приватных событий**
   - Все события публичны (видны всем)
   - Таблица `event_user_access` существует, но не используется

7. **Нет интеграции с картами**
   - Локация - просто текст, нет карты с точкой

8. **Нет загрузки файлов/изображений**
   - Нельзя прикрепить фото к событию
   - Нет галереи

9. **Нет истории событий**
   - Нет архива прошедших событий
   - Нет статистики для пользователя

10. **Нет экспорта данных**
    - Нельзя экспортировать список участников в CSV/Excel

---

### Технические ограничения

1. **Нет real-time обновлений**
   - UI обновляется только при refetch
   - Можно добавить WebSockets или Supabase Realtime

2. **Нет оптимистичных обновлений**
   - UI ждет ответа сервера перед обновлением

3. **Нет кеширования на клиенте**
   - Каждый переход на страницу = новый fetch
   - Можно добавить React Query или SWR

4. **Нет пагинации**
   - Все события загружаются сразу
   - Проблема при большом количестве событий

5. **Нет rate limiting**
   - API не защищен от спама/DDoS

6. **Нет логирования**
   - Нет системы логов для ошибок/событий
   - Сложно дебажить production issues

7. **Нет unit/integration тестов**
   - Нет автоматизированного тестирования
   - Риск регрессий при рефакторинге

8. **Нет CI/CD**
   - Нет автоматических деплоев
   - Нет pre-commit hooks (linting, formatting)

9. **Нет error boundaries**
   - Ошибки в компонентах могут крашить весь UI

10. **Нет SEO оптимизации**
    - Metadata частично заполнен
    - Нет Open Graph для соцсетей
    - Нет sitemap.xml

---

### UX ограничения

1. **Нет dark mode**
   - Только светлая тема

2. **Нет i18n (интернационализация)**
   - Только русский язык
   - Хардкодом в компонентах

3. **Нет onboarding/tour**
   - Новые пользователи не знают как пользоваться

4. **Нет toast notifications**
   - Используются alert() (нативные)
   - Плохой UX

5. **Нет skeleton loaders везде**
   - Только на некоторых страницах

6. **Нет анимаций/transitions**
   - Резкие переходы между состояниями

7. **Нет mobile app**
   - Только веб-версия (PWA можно добавить)

---

## 📈 Метрики и статистика

### Текущая статистика (на главной странице)

**Реализовано:**
- Всего событий
- Всего участников
- Активных локаций

**Код:** `src/app/page.tsx`

**Не реализовано (потенциал):**
- График событий по времени
- Популярные категории
- Средняя заполненность
- Retention rate пользователей

---

## 🔮 Рекомендации для развития

### Высокий приоритет

1. **Система уведомлений**
   - Email: при регистрации, за N дней до события, при изменениях
   - Telegram bot: push-уведомления

2. **Toast notifications**
   - Замена alert() на красивые toast
   - Библиотека: `sonner` или `react-hot-toast`

3. **Error boundaries**
   - Graceful degradation при ошибках
   - Fallback UI

4. **Кеширование (React Query)**
   - Уменьшение нагрузки на сервер
   - Оптимистичные обновления
   - Автоматический refetch

5. **SEO**
   - Dynamic metadata для событий
   - Open Graph tags
   - JSON-LD structured data

---

### Средний приоритет

6. **Пагинация/infinite scroll**
   - Для списка событий
   - Для списка участников (если >100)

7. **Фильтры**
   - По дате (предстоящие, сегодня, на этой неделе)
   - По локации (город, регион)
   - По цене (бесплатные, платные)

8. **Приватные события**
   - Использовать `event_user_access`
   - Система приглашений

9. **Комментарии**
   - Обсуждение событий
   - Q&A для участников

10. **История и архив**
    - Страница "Мои события" (созданные + участвую)
    - Архив прошедших событий

---

### Низкий приоритет

11. **Dark mode**
    - Переключатель темы
    - Сохранение предпочтения в localStorage

12. **i18n**
    - Английский язык
    - next-intl или react-i18next

13. **PWA**
    - Offline mode
    - Install prompt

14. **Интеграция с картами**
    - Google Maps / Yandex Maps
    - Точка на карте для события

15. **Загрузка изображений**
    - Обложка для события
    - Галерея фото
    - Supabase Storage

---

## 🛠️ Утилиты и хелперы

### Централизованные утилиты

**Файл:** `src/lib/utils/`

#### `dates.ts`
- `formatDateTime(iso: string)` → "12 декабря 2025, 15:00"
- `formatDateTimeShort(iso: string)` → "12.12.2025, 15:00"
- `formatDateShort(iso: string)` → "12.12.2025"
- `getDaysUntil(dateTime: string)` → число дней до события

#### `errors.ts`
- `handleApiError(res: Response)` → выбрасывает Error с читаемым сообщением
- `getErrorMessage(error: unknown)` → извлекает сообщение из любого error

#### `eventCategories.ts`
- `getCategoryLabel(category)` → "Автопутешествие", "Поход", etc.
- `getCategoryIcon(category)` → Lucide icon component
- `getCategoryBadgeVariant(category)` → badge variant для категории

#### `customFields.ts`
- `formatCustomFieldValue(value, field)` → форматирование значения для отображения
- `validateCustomFieldValue(value, field)` → валидация значения
- `areCustomFieldsComplete(values, schema)` → проверка заполненности обязательных полей

#### `api.ts`
- `respondSuccess(data, status?)` → стандартный success response
- `respondError(message, status?)` → стандартный error response

---

## 📚 Ключевые концепции

### 1. Унификация компонентов

**Проблема:** Дублирование кода между create/edit страницами.

**Решение:** Единый компонент с `mode` prop.

**Примеры:**
- `EventForm` (mode: 'create' | 'edit')
- `ParticipantForm` (mode: 'create' | 'edit')

**Преимущества:**
- Меньше кода
- Консистентный UX
- Легче поддерживать

---

### 2. Smart custom fields validation

**Правила:**
- Без участников: полная свобода
- С участниками:
  - ✅ Добавление новых полей
  - ✅ Редактирование label/options/required
  - ❌ Удаление существующих полей
  - ❌ Изменение типа поля

**Реализация:**
- Frontend: визуальная блокировка (disabled, lock icon, tooltip)
- Backend: `validateCustomFieldsUpdate()` в services

---

### 3. Guest vs Authenticated users

**Гость:**
- Может регистрироваться на события
- Может редактировать свои регистрации (через guest_session_id)
- Не может создавать события

**Авторизованный (Telegram):**
- Все что гость +
- Может создавать события
- Может редактировать свои события
- Привязка к telegram_id (постоянный аккаунт)

**Идентификация:**
- Гость: `guest_session_id` (cookie)
- Telegram: `user_id` (из JWT)

---

### 4. Hierarchical loading

**Next.js App Router:**
- `loading.tsx` на каждом уровне вложенности
- Автоматический Suspense boundary

**Наша структура:**
```
app/loading.tsx              → Корневой loader
events/loading.tsx           → Loader списка событий
events/[id]/layout.tsx       → Изоляция сегмента
events/[id]/loading.tsx      → Loader деталей события
```

**Проблемы и решения:**
- ❌ Путаница когда есть и родительский и дочерний loader
- ✅ layout.tsx создает изоляцию для дочернего сегмента
- ✅ Удаление лишних loading.tsx где страница рендерится быстро

---

### 5. Type safety everywhere

**TypeScript:**
- Строгая типизация всех данных
- Shared types между frontend/backend
- Zod схемы для валидации + type inference

**Примеры:**
```typescript
// Database types
import type { Event, Participant, User } from '@/lib/types/database';

// Zod validation
const createEventSchema = z.object({
  title: z.string().min(1),
  // ...
});
type CreateEventInput = z.infer<typeof createEventSchema>;
```

---

## 🎯 Заключение

**Need4Trip** - это современное веб-приложение для организации мероприятий с:
- ✅ Гибкой системой кастомных полей
- ✅ Telegram авторизацией + гостевым доступом
- ✅ Унифицированной компонентной системой
- ✅ Smart валидацией и защитой данных
- ✅ Responsive и доступным UI

**Готово к использованию** для небольших сообществ и клубов.

**Готово к масштабированию** благодаря чистой архитектуре и TypeScript.

**Готово к развитию** с четким roadmap улучшений.

---

**Дата:** 12 декабря 2025  
**Версия:** 1.0  
**Автор:** AI Assistant (Claude Sonnet 4.5)

