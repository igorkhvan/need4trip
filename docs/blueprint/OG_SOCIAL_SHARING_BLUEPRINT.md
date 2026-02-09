# Open Graph / Social Sharing — Blueprint (MVP)

---
Status: ACCEPTED
Created: 2026-02-09
Author: Cursor AI
---

## 1. Цель

При шаринге ссылки на событие или клуб в мессенджерах (Telegram, WhatsApp) и соцсетях отображается красивое превью: заголовок, описание, изображение, URL.

**Текущее состояние:** нет OG-тегов, нет `metadataBase`, нет `generateMetadata` на динамических страницах — при шаринге отображается только "Need4Trip" без контекста.

**Целевое состояние (MVP):** полноценные OG + Twitter Card теги для всех публичных страниц с учётом visibility-правил.

---

## 2. Scope (MVP)

| Элемент | Включён | Описание |
|---------|---------|----------|
| Корневые OG/Twitter теги | ✅ | `metadataBase`, default openGraph/twitter в layout.tsx |
| Статическое OG-изображение | ✅ | `public/og-default.png` (1200×630) |
| `generateMetadata` для `/events/[id]` | ✅ | Динамические title/description/image |
| `generateMetadata` для `/clubs/[id]` | ✅ | Динамические title/description/image |
| Статические metadata для `/`, `/events`, `/clubs` | ✅ | Описательные title/description |
| Утилита `stripHtml` + `truncate` | ✅ | Для конвертации HTML→plaintext |
| Динамическая генерация OG-изображений (`opengraph-image.tsx`) | ❌ P2 | Отложено — потребует `@vercel/og` и Edge Runtime |

---

## 3. Архитектурные решения

### 3.1 `generateMetadata` vs `page` — дублирование запросов

`generateMetadata()` и `default export` page component выполняются **параллельно** в Next.js App Router. Supabase admin client не поддерживает Next.js Request Memoization (не использует `fetch`).

**Решение MVP:** Допускаем дублирование (2 вызова к БД). Reference data кешируется через `StaticCache` (города, валюты, категории — TTL 5 мин). Основной запрос к `events` — лёгкий single-row select.

**Оптимизация (P2):** Обернуть `getEventBasicInfo` в React `cache()` для дедупликации в рамках одного request.

### 3.2 Безопасность: visibility при отсутствии auth

Краулеры (Telegram, Google, WhatsApp) запрашивают страницу **без аутентификации**. `enforceEventVisibility` бросает `NotFoundError`/`AuthError` для `restricted` событий без авторизованного пользователя.

**Решение:**

| Event visibility | Metadata поведение |
|---|---|
| `public` | Полные OG-теги (title, description, image, url) |
| `unlisted` | Полные OG-теги (пользователь поделился прямой ссылкой — значит, хочет чтобы превью работало) |
| `restricted` | Минимальные теги: "Событие на Need4Trip" без деталей (не раскрываем содержимое) |

| Club visibility | Metadata поведение |
|---|---|
| `public` | Полные OG-теги (name, description, logo, cities, stats) |
| `private` | Название клуба + "Закрытый клуб на Need4Trip" (без description, cities, stats — не-участник видит только минимум + CTA вступить) |
| archived (`archivedAt ≠ null`) | Полные теги (архивный клуб всё ещё публичен, просто неактивен) |

**Вызов:** `getEventBasicInfo(id)` без `enforceVisibility: true` и без `currentUser` → вернёт event независимо от visibility → мы решаем на уровне metadata что показывать.

**Для клубов:** `getClubBasicInfo(id)` бросает `NotFoundError` → нужен try/catch в `generateMetadata`.

### 3.3 Soft-deleted контент

- `getEventBasicInfo(id)` возвращает `null` для soft-deleted событий → fallback на default metadata
- `getClubBasicInfo(id)` бросает `NotFoundError` → catch → default metadata

### 3.4 HTML → Plain Text

`event.description` содержит HTML из rich text editor. Для `og:description` нужен plain text.

**Решение:** Создать серверную утилиту `stripHtml(html: string): string` в `src/lib/utils/text.ts`:
- Удаляет все HTML-теги через regex
- Нормализует пробелы и переносы строк
- Тримит результат

Плюс `truncateText(text: string, maxLength: number): string`:
- Обрезает до maxLength символов
- Обрезает по границе слова
- Добавляет "..." если обрезано

### 3.5 `metadataBase`

Next.js требует `metadataBase` для построения абсолютных URL (для OG images и canonical URLs). Без него относительные пути в `openGraph.images` не работают для внешних краулеров.

**Значение:** `new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://need4trip.kz')`

---

## 4. Детальный план реализации

### Шаг 1: Утилита `stripHtml` + `truncateText`

**Файл:** `src/lib/utils/text.ts` (новый)

```typescript
/**
 * Strips HTML tags from a string, returning plain text.
 * Used for generating og:description from rich text content.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')    // Replace tags with space
    .replace(/&nbsp;/gi, ' ')     // Replace &nbsp;
    .replace(/&amp;/gi, '&')      // Replace &amp;
    .replace(/&lt;/gi, '<')       // Replace &lt;
    .replace(/&gt;/gi, '>')       // Replace &gt;
    .replace(/&quot;/gi, '"')     // Replace &quot;
    .replace(/&#39;/gi, "'")      // Replace &#39;
    .replace(/\s+/g, ' ')         // Normalize whitespace
    .trim();
}

/**
 * Truncates text to maxLength, breaking at word boundary.
 * Appends "..." if truncated.
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const breakPoint = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;
  return truncated.slice(0, breakPoint).trimEnd() + '...';
}
```

**Тест:** Вручную проверить на примерах описаний событий из продакшена.

### Шаг 2: Статическое OG-изображение

**Файл:** `public/og-default.png` (1200×630px)

Содержание: логотип Need4Trip на оранжевом градиенте (`#FF6F2C → #E86223`) с текстом "Need4Trip — Организация автомобильных событий".

> **NOTE:** Этот файл нужно сгенерировать или подготовить. Если нет готового дизайна — можно использовать простой вариант: белый текст "Need4Trip" на оранжевом фоне.

### Шаг 3: Корневой layout — `metadataBase` + default OG/Twitter

**Файл:** `src/app/layout.tsx` — изменить export `metadata`

```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://need4trip.kz'),
  title: {
    default: 'Need4Trip',
    template: '%s | Need4Trip',
  },
  description: 'Организация оффроуд-событий и регистрация участников',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Need4Trip',
    title: 'Need4Trip',
    description: 'Организация оффроуд-событий и регистрация участников',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Need4Trip — Организация автомобильных событий',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Need4Trip',
    description: 'Организация оффроуд-событий и регистрация участников',
    images: ['/og-default.png'],
  },
};
```

**Ключевые моменты:**
- `metadataBase` — абсолютный URL, все относительные пути в images будут resolved от него
- `title.template: '%s | Need4Trip'` — дочерние страницы могут передать только свой title, суффикс добавится автоматически
- OG и Twitter наследуются всеми страницами как fallback

### Шаг 4: `generateMetadata` для `/events/[id]`

**Файл:** `src/app/(app)/events/[id]/page.tsx` — добавить экспорт `generateMetadata`

```typescript
import type { Metadata } from 'next';
import { stripHtml, truncateText } from '@/lib/utils/text';
import { getEventBasicInfo } from '@/lib/services/events';
import { formatDateTime } from '@/lib/utils/dates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}): Promise<Metadata> {
  const { id } = await params;

  // Load event WITHOUT visibility enforcement (crawlers have no auth)
  const event = await getEventBasicInfo(id).catch(() => null);

  // Event not found or deleted → default metadata
  if (!event) {
    return {
      title: 'Событие не найдено',
    };
  }

  // Restricted events: don't leak content in OG tags
  if (event.visibility === 'restricted') {
    return {
      title: 'Событие на Need4Trip',
      description: 'Это событие доступно только по приглашению.',
      openGraph: {
        title: 'Событие на Need4Trip',
        description: 'Это событие доступно только по приглашению.',
      },
    };
  }

  // Public and unlisted events: full OG metadata
  const plainDescription = truncateText(stripHtml(event.description), 160);
  const cityName = event.city?.name;
  const dateFormatted = formatDateTime(event.dateTime);

  // Build rich description with context
  const metaParts: string[] = [];
  if (dateFormatted) metaParts.push(dateFormatted);
  if (cityName) metaParts.push(cityName);
  const participantsInfo = event.maxParticipants
    ? `${event.participantsCount ?? 0}/${event.maxParticipants} участников`
    : `${event.participantsCount ?? 0} участников`;
  metaParts.push(participantsInfo);

  const metaPrefix = metaParts.join(' · ');
  const fullDescription = plainDescription
    ? `${metaPrefix}\n${plainDescription}`
    : metaPrefix;

  // Image: club logo if available, otherwise default
  const ogImage = event.club?.logoUrl || '/og-default.png';

  return {
    title: event.title,
    description: truncateText(fullDescription, 200),
    openGraph: {
      title: event.title,
      description: truncateText(fullDescription, 200),
      type: 'article',
      images: [ogImage],
      url: `/events/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: truncateText(fullDescription, 200),
      images: [ogImage],
    },
  };
}
```

**Поведение по visibility:**
- `public` → полные теги с title, description, image
- `unlisted` → полные теги (пользователь явно поделился ссылкой)
- `restricted` → "Событие на Need4Trip" без деталей

### Шаг 5: `generateMetadata` для `/clubs/[id]`

**Файл:** `src/app/(app)/clubs/[id]/page.tsx` — добавить экспорт `generateMetadata`

```typescript
import type { Metadata } from 'next';
import { truncateText } from '@/lib/utils/text';
import { getClubBasicInfo } from '@/lib/services/clubs';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let club: Awaited<ReturnType<typeof getClubBasicInfo>> | null = null;
  try {
    club = await getClubBasicInfo(id);
  } catch {
    // NotFoundError → default metadata
    return { title: 'Клуб не найден' };
  }

  // Private clubs: show name but no details
  // (non-members see only minimal info + CTA to join on the page)
  if (club.visibility === 'private') {
    const privateDescription = 'Закрытый клуб на Need4Trip. Вступите, чтобы увидеть события и участников.';
    return {
      title: club.name,
      description: privateDescription,
      openGraph: {
        title: club.name,
        description: privateDescription,
        images: [club.logoUrl || '/og-default.png'],
        url: `/clubs/${id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: club.name,
        description: privateDescription,
        images: [club.logoUrl || '/og-default.png'],
      },
    };
  }

  // Public clubs: full metadata
  const description = club.description
    ? truncateText(club.description, 160)
    : 'Автомобильный клуб на Need4Trip';

  const citiesText = club.cities?.length
    ? club.cities.map(c => c.name).join(', ')
    : null;

  const metaParts: string[] = [];
  if (citiesText) metaParts.push(citiesText);
  metaParts.push(`${club.memberCount} участников`);
  metaParts.push(`${club.upcomingEventCount} событий`);
  const metaPrefix = metaParts.join(' · ');

  const fullDescription = `${metaPrefix}\n${description}`;
  const ogImage = club.logoUrl || '/og-default.png';

  return {
    title: club.name,
    description: truncateText(fullDescription, 200),
    openGraph: {
      title: club.name,
      description: truncateText(fullDescription, 200),
      images: [ogImage],
      url: `/clubs/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: club.name,
      description: truncateText(fullDescription, 200),
      images: [ogImage],
    },
  };
}
```

### Шаг 6: Статические metadata для Homepage, Events, Clubs

**`src/app/(marketing)/page.tsx`** — добавить:
```typescript
export const metadata: Metadata = {
  title: 'Need4Trip — Организация автомобильных событий',
  description: 'Создавайте оффроуд-поездки, собирайте экипажи и управляйте участниками. Простая регистрация по ссылке.',
};
```

**`src/app/(app)/events/page.tsx`** — добавить (если Client Component → конвертировать metadata секцию или использовать `generateMetadata`):
> ⚠️ `events/page.tsx` — Client Component (`'use client'`). Client Components НЕ поддерживают export `metadata`/`generateMetadata`. Решение: вынести metadata в `layout.tsx` для `/events` или создать отдельный metadata route.

**`src/app/(app)/clubs/page.tsx`** — аналогичная ситуация.

**Решение для Client Component pages:** Создать `src/app/(app)/events/layout.tsx` и `src/app/(app)/clubs/layout.tsx` с metadata:

```typescript
// src/app/(app)/events/layout.tsx
export const metadata: Metadata = {
  title: 'События',
  description: 'Ближайшие автомобильные события и оффроуд-поездки',
};
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

---

## 5. Файлы для изменения/создания

| # | Файл | Действие | Описание |
|---|------|----------|----------|
| 1 | `src/lib/utils/text.ts` | **Создать** | `stripHtml()` + `truncateText()` |
| 2 | `public/og-default.png` | **Создать** | Статическое OG-изображение 1200×630 |
| 3 | `src/app/layout.tsx` | **Изменить** | `metadataBase`, default openGraph/twitter, title template |
| 4 | `src/app/(app)/events/[id]/page.tsx` | **Изменить** | Добавить `generateMetadata` export |
| 5 | `src/app/(app)/clubs/[id]/page.tsx` | **Изменить** | Добавить `generateMetadata` export |
| 6 | `src/app/(marketing)/page.tsx` | **Изменить** | Добавить static `metadata` export |
| 7 | `src/app/(app)/events/layout.tsx` | **Создать** | Metadata для Events list (Client Component page) |
| 8 | `src/app/(app)/clubs/layout.tsx` | **Создать** (если нет) | Metadata для Clubs list (Client Component page) |

---

## 6. Документация (SSOT обновления)

В том же коммите что и код:

| Документ | Что обновить |
|----------|-------------|
| `SSOT_ARCHITECTURE.md` §3.2 | Добавить в Ownership Map: `SEO / OG Metadata → lib/utils/text.ts (utilities) + page-level generateMetadata` |
| `SSOT_ARCHITECTURE.md` §3.1 | Отметить что `public/` содержит static OG assets |

---

## 7. Проверка

### 7.1 Build
```bash
npx tsc --noEmit  # TypeScript strict ✅
npm run build      # Production build ✅
```

### 7.2 Функциональная проверка
1. Открыть `https://need4trip.kz/events/{public-event-id}` → View Source → проверить `<meta property="og:*">` теги
2. Проверить через [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) или [Twitter Card Validator](https://cards-dev.twitter.com/validator)
3. Отправить ссылку в Telegram → проверить превью
4. Проверить restricted event → OG должен показывать "Событие на Need4Trip" без деталей
5. Проверить private club → название клуба + "Закрытый клуб на Need4Trip" + логотип (без description/stats)
6. Проверить несуществующий event → "Событие не найдено"

### 7.3 Edge Cases
- Event с пустым `description` → description = только meta-prefix (дата, город, участники)
- Event без `club` (личное) → ogImage = `/og-default.png`
- Club без `logoUrl` → ogImage = `/og-default.png`
- Club без `description` → "Автомобильный клуб на Need4Trip"
- Soft-deleted event → `getEventBasicInfo` returns null → "Событие не найдено"

---

## 8. Риски и ограничения

| Риск | Митигация |
|------|-----------|
| Дублирование запросов к БД (generateMetadata + page) | Reference data кешируется. P2: React `cache()` |
| Нет event images (только club logo) | Используем дефолтное изображение. P2: `opengraph-image.tsx` для динамической генерации |
| Club logo может быть невалидным URL | OG fallback: если URL 404, краулер покажет текст без картинки — приемлемо |
| `getClubBasicInfo` бросает исключение (не null) | try/catch в generateMetadata |
| `description` может содержать сложный HTML | `stripHtml` regex достаточен для MVP; если будут проблемы — можно использовать `html-to-text` пакет |

---

## 9. Будущие улучшения (P2)

1. **Динамические OG-изображения** (`opengraph-image.tsx`) — красивая карточка с названием события, датой, городом
2. **React `cache()`** — дедупликация `getEventBasicInfo` в рамках одного запроса
3. **Event images** — добавить поле `imageUrl` в таблицу `events` для обложки события
4. **JSON-LD** (structured data) — для лучшего SEO (`Event` schema.org type)
